package main

import (
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

var jwtSecret = []byte("lab-intermediate-secret-change-me")

type User struct {
	ID           string
	Email        string
	PasswordHash string
}

type Note struct {
	ID         string    `json:"id"`
	UserID     string    `json:"user_id"`
	Title      string    `json:"title"`
	Body       string    `json:"body"`
	Attachment string    `json:"attachment,omitempty"`
	CreatedAt  time.Time `json:"created_at"`
}

type Claims struct {
	UserID string `json:"uid"`
	Email  string `json:"email"`
	jwt.RegisteredClaims
}

type store struct {
	mu    sync.RWMutex
	users map[string]*User // email -> user
	notes map[string]Note  // id -> note
}

func newStore() *store {
	return &store{
		users: make(map[string]*User),
		notes: make(map[string]Note),
	}
}

func main() {
	if err := os.MkdirAll("uploads", 0o755); err != nil {
		log.Fatalf("mkdir uploads: %v", err)
	}
	s := newStore()
	r := gin.Default()

	r.Use(cors.New(cors.Config{
		AllowOrigins:     []string{"http://localhost:5173"},
		AllowMethods:     []string{"GET", "POST", "DELETE", "OPTIONS"},
		AllowHeaders:     []string{"Origin", "Content-Type", "Authorization"},
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
		s.mu.Lock()
		defer s.mu.Unlock()
		if _, ok := s.users[body.Email]; ok {
			c.JSON(http.StatusConflict, gin.H{"error": "email already registered"})
			return
		}
		hash, err := bcrypt.GenerateFromPassword([]byte(body.Password), bcrypt.DefaultCost)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "hash failed"})
			return
		}
		u := &User{ID: uuid.NewString(), Email: body.Email, PasswordHash: string(hash)}
		s.users[u.Email] = u
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
		s.mu.RLock()
		u, ok := s.users[body.Email]
		s.mu.RUnlock()
		if !ok || bcrypt.CompareHashAndPassword([]byte(u.PasswordHash), []byte(body.Password)) != nil {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid credentials"})
			return
		}
		token, err := issueJWT(u)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "token failed"})
			return
		}
		c.JSON(http.StatusOK, gin.H{
			"access_token": token,
			"token_type":   "Bearer",
			"expires_in":   900,
		})
	})

	api := r.Group("/")
	api.Use(jwtMiddleware())
	{
		api.GET("/notes", func(c *gin.Context) {
			uid := c.GetString("userID")
			s.mu.RLock()
			defer s.mu.RUnlock()
			out := make([]Note, 0)
			for _, n := range s.notes {
				if n.UserID == uid {
					out = append(out, n)
				}
			}
			c.JSON(http.StatusOK, out)
		})

		api.POST("/notes", func(c *gin.Context) {
			var body struct {
				Title string `json:"title" binding:"required"`
				Body  string `json:"body"`
			}
			if err := c.ShouldBindJSON(&body); err != nil {
				c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
				return
			}
			n := Note{
				ID:        uuid.NewString(),
				UserID:    c.GetString("userID"),
				Title:     body.Title,
				Body:      body.Body,
				CreatedAt: time.Now().UTC(),
			}
			s.mu.Lock()
			s.notes[n.ID] = n
			s.mu.Unlock()
			c.JSON(http.StatusCreated, n)
		})

		api.DELETE("/notes/:id", func(c *gin.Context) {
			uid := c.GetString("userID")
			id := c.Param("id")
			s.mu.Lock()
			defer s.mu.Unlock()
			n, ok := s.notes[id]
			if !ok || n.UserID != uid {
				c.JSON(http.StatusNotFound, gin.H{"error": "note not found"})
				return
			}
			delete(s.notes, id)
			c.Status(http.StatusNoContent)
		})

		api.POST("/notes/:id/attachment", func(c *gin.Context) {
			uid := c.GetString("userID")
			id := c.Param("id")

			s.mu.RLock()
			n, ok := s.notes[id]
			s.mu.RUnlock()
			if !ok || n.UserID != uid {
				c.JSON(http.StatusNotFound, gin.H{"error": "note not found"})
				return
			}

			c.Request.Body = http.MaxBytesReader(c.Writer, c.Request.Body, 5<<20)
			file, header, err := c.Request.FormFile("file")
			if err != nil {
				c.JSON(http.StatusBadRequest, gin.H{"error": "file required"})
				return
			}
			defer file.Close()

			ext := strings.ToLower(filepath.Ext(header.Filename))
			allowed := map[string]bool{".png": true, ".jpg": true, ".jpeg": true, ".pdf": true}
			if !allowed[ext] {
				c.JSON(http.StatusBadRequest, gin.H{"error": "file type not allowed"})
				return
			}

			name := uuid.NewString() + ext
			dst, err := os.Create(filepath.Join("uploads", name))
			if err != nil {
				c.JSON(http.StatusInternalServerError, gin.H{"error": "cannot save"})
				return
			}
			defer dst.Close()
			if _, err := io.Copy(dst, file); err != nil {
				c.JSON(http.StatusInternalServerError, gin.H{"error": "write failed"})
				return
			}

			s.mu.Lock()
			n.Attachment = name
			s.notes[id] = n
			s.mu.Unlock()

			c.JSON(http.StatusCreated, gin.H{"attachment": name, "note_id": id})
		})
	}

	fmt.Println("Secure Notes API on :8090")
	_ = r.Run(":8090")
}

func issueJWT(u *User) (string, error) {
	claims := Claims{
		UserID: u.ID,
		Email:  u.Email,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(15 * time.Minute)),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
		},
	}
	return jwt.NewWithClaims(jwt.SigningMethodHS256, claims).SignedString(jwtSecret)
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
				return nil, fmt.Errorf("unexpected alg")
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
