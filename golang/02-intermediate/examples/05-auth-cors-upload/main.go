package main

import (
	"crypto/rand"
	"encoding/hex"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"sync"
	"time"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
	"golang.org/x/crypto/bcrypt"
)

var jwtSecret = []byte(env("JWT_SECRET", "dev-only-change-me-in-production"))

type User struct {
	ID           string
	Email        string
	PasswordHash string
}

type Claims struct {
	UserID string `json:"uid"`
	Email  string `json:"email"`
	jwt.RegisteredClaims
}

type sessionStore struct {
	mu   sync.RWMutex
	data map[string]string // sid -> userID
}

func newSessionStore() *sessionStore {
	return &sessionStore{data: make(map[string]string)}
}

func (s *sessionStore) Put(sid, userID string) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.data[sid] = userID
}

func (s *sessionStore) Get(sid string) (string, bool) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	id, ok := s.data[sid]
	return id, ok
}

func main() {
	if err := os.MkdirAll("./uploads", 0o755); err != nil {
		log.Fatalf("mkdir uploads: %v", err)
	}

	var usersMu sync.RWMutex
	users := map[string]*User{}
	sessions := newSessionStore()

	r := gin.Default()

	// --- CORS: ระบุ origin จริง เมื่อใช้ credentials ---
	r.Use(cors.New(cors.Config{
		AllowOrigins:     []string{"http://localhost:5173", "http://127.0.0.1:5173"},
		AllowMethods:     []string{"GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"},
		AllowHeaders:     []string{"Origin", "Content-Type", "Authorization"},
		ExposeHeaders:    []string{"Content-Length"},
		AllowCredentials: true,
		MaxAge:           12 * time.Hour,
	}))

	r.GET("/health", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"status": "ok"})
	})

	r.POST("/auth/register", func(c *gin.Context) {
		var body struct {
			Email    string `json:"email" binding:"required,email"`
			Password string `json:"password" binding:"required,min=8"`
		}
		if err := c.ShouldBindJSON(&body); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}
		hash, err := bcrypt.GenerateFromPassword([]byte(body.Password), bcrypt.DefaultCost)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "hash failed"})
			return
		}
		u := &User{ID: uuid.NewString(), Email: body.Email, PasswordHash: string(hash)}
		usersMu.Lock()
		if _, exists := users[body.Email]; exists {
			usersMu.Unlock()
			c.JSON(http.StatusConflict, gin.H{"error": "email already registered"})
			return
		}
		users[u.Email] = u
		usersMu.Unlock()
		c.JSON(http.StatusCreated, gin.H{"id": u.ID, "email": u.Email})
	})

	r.POST("/auth/login", func(c *gin.Context) {
		var body struct {
			Email    string `json:"email" binding:"required,email"`
			Password string `json:"password" binding:"required"`
		}
		if err := c.ShouldBindJSON(&body); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}
		usersMu.RLock()
		u, ok := users[body.Email]
		usersMu.RUnlock()
		if !ok || bcrypt.CompareHashAndPassword([]byte(u.PasswordHash), []byte(body.Password)) != nil {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid credentials"})
			return
		}

		// 1) JWT access token (สั้น)
		token, err := issueJWT(u)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "token issue failed"})
			return
		}

		// 2) Cookie-based session (HttpOnly)
		sid := newSessionID()
		sessions.Put(sid, u.ID)
		http.SetCookie(c.Writer, &http.Cookie{
			Name:     "sid",
			Value:    sid,
			Path:     "/",
			HttpOnly: true,
			Secure:   false, // production: true + HTTPS
			SameSite: http.SameSiteLaxMode,
			MaxAge:   int((24 * time.Hour).Seconds()),
		})

		c.JSON(http.StatusOK, gin.H{
			"access_token": token,
			"token_type":   "Bearer",
			"expires_in":   900,
			"user":         gin.H{"id": u.ID, "email": u.Email},
		})
	})

	auth := r.Group("/")
	auth.Use(jwtMiddleware())
	{
		auth.GET("/me", func(c *gin.Context) {
			c.JSON(http.StatusOK, gin.H{
				"user_id": c.GetString("userID"),
				"email":   c.GetString("email"),
			})
		})

		// File uploader — จำกัดขนาด + sanitize ชื่อไฟล์
		auth.POST("/upload", func(c *gin.Context) {
			c.Request.Body = http.MaxBytesReader(c.Writer, c.Request.Body, 8<<20) // 8MB
			file, header, err := c.Request.FormFile("file")
			if err != nil {
				c.JSON(http.StatusBadRequest, gin.H{"error": "file required (field name: file)"})
				return
			}
			defer file.Close()

			ext := strings.ToLower(filepath.Ext(header.Filename))
			allowed := map[string]bool{".png": true, ".jpg": true, ".jpeg": true, ".pdf": true, ".txt": true}
			if !allowed[ext] {
				c.JSON(http.StatusBadRequest, gin.H{"error": "file type not allowed"})
				return
			}

			name := uuid.NewString() + ext
			dstPath := filepath.Join("uploads", name)
			dst, err := os.Create(dstPath)
			if err != nil {
				c.JSON(http.StatusInternalServerError, gin.H{"error": "cannot save file"})
				return
			}
			defer dst.Close()

			written, err := io.Copy(dst, file)
			if err != nil {
				c.JSON(http.StatusInternalServerError, gin.H{"error": "write failed"})
				return
			}

			c.JSON(http.StatusCreated, gin.H{
				"id":       name,
				"size":     written,
				"url":      "/files/" + name,
				"uploader": c.GetString("userID"),
			})
		})
	}

	r.GET("/files/:name", func(c *gin.Context) {
		name := filepath.Base(c.Param("name"))
		c.File(filepath.Join("uploads", name))
	})

	// Session cookie check (ทางเลือกเทียบกับ JWT)
	r.GET("/session/me", func(c *gin.Context) {
		sid, err := c.Cookie("sid")
		if err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "no session"})
			return
		}
		uid, ok := sessions.Get(sid)
		if !ok {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid session"})
			return
		}
		c.JSON(http.StatusOK, gin.H{"user_id": uid, "via": "cookie-session"})
	})

	fmt.Println("Auth+CORS+Upload on :8083")
	_ = r.Run(":8083")
}

func issueJWT(u *User) (string, error) {
	claims := Claims{
		UserID: u.ID,
		Email:  u.Email,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(15 * time.Minute)),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
			Issuer:    "go-fullstack-bootcamp",
		},
	}
	t := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return t.SignedString(jwtSecret)
}

func jwtMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		h := c.GetHeader("Authorization")
		if !strings.HasPrefix(h, "Bearer ") {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "missing bearer token"})
			return
		}
		raw := strings.TrimPrefix(h, "Bearer ")
		claims := &Claims{}
		token, err := jwt.ParseWithClaims(raw, claims, func(t *jwt.Token) (any, error) {
			if t.Method != jwt.SigningMethodHS256 {
				return nil, fmt.Errorf("unexpected signing method")
			}
			return jwtSecret, nil
		})
		if err != nil || !token.Valid {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "invalid token"})
			return
		}
		c.Set("userID", claims.UserID)
		c.Set("email", claims.Email)
		c.Next()
	}
}

func newSessionID() string {
	b := make([]byte, 16)
	_, _ = rand.Read(b)
	return hex.EncodeToString(b)
}

func env(k, fallback string) string {
	if v := os.Getenv(k); v != "" {
		return v
	}
	return fallback
}
