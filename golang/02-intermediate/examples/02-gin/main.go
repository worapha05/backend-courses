package main

import (
	"net/http"
	"sync"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

type Note struct {
	ID        string    `json:"id"`
	Title     string    `json:"title"`
	Body      string    `json:"body"`
	CreatedAt time.Time `json:"created_at"`
}

type createNoteDTO struct {
	Title string `json:"title" binding:"required"`
	Body  string `json:"body"`
}

func requestID() gin.HandlerFunc {
	return func(c *gin.Context) {
		id := c.GetHeader("X-Request-ID")
		if id == "" {
			id = uuid.NewString()
		}
		c.Writer.Header().Set("X-Request-ID", id)
		c.Set("requestID", id)
		c.Next()
	}
}

func main() {
	r := gin.New()
	r.Use(gin.Logger(), gin.Recovery(), requestID())

	var mu sync.RWMutex
	notes := map[string]Note{}

	api := r.Group("/api")
	{
		api.GET("/health", func(c *gin.Context) {
			c.JSON(http.StatusOK, gin.H{"status": "ok", "framework": "gin"})
		})

		api.GET("/notes", func(c *gin.Context) {
			mu.RLock()
			list := make([]Note, 0, len(notes))
			for _, n := range notes {
				list = append(list, n)
			}
			mu.RUnlock()
			c.JSON(http.StatusOK, list)
		})

		api.POST("/notes", func(c *gin.Context) {
			var dto createNoteDTO
			if err := c.ShouldBindJSON(&dto); err != nil {
				c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
				return
			}
			n := Note{
				ID:        uuid.NewString(),
				Title:     dto.Title,
				Body:      dto.Body,
				CreatedAt: time.Now().UTC(),
			}
			mu.Lock()
			notes[n.ID] = n
			mu.Unlock()
			c.JSON(http.StatusCreated, n)
		})

		api.GET("/notes/:id", func(c *gin.Context) {
			mu.RLock()
			n, ok := notes[c.Param("id")]
			mu.RUnlock()
			if !ok {
				c.JSON(http.StatusNotFound, gin.H{"error": "not found"})
				return
			}
			c.JSON(http.StatusOK, n)
		})
	}

	_ = r.Run(":8082")
}
