package main

import (
	"log"
	"sync"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/logger"
	"github.com/gofiber/fiber/v2/middleware/recover"
	"github.com/google/uuid"
)

type Note struct {
	ID        string    `json:"id"`
	Title     string    `json:"title"`
	Body      string    `json:"body"`
	CreatedAt time.Time `json:"created_at"`
}

type createNoteDTO struct {
	Title string `json:"title"`
	Body  string `json:"body"`
}

func requestID() fiber.Handler {
	return func(c *fiber.Ctx) error {
		id := c.Get("X-Request-ID")
		if id == "" {
			id = uuid.NewString()
		}
		c.Set("X-Request-ID", id)
		c.Locals("requestID", id)
		return c.Next()
	}
}

func main() {
	app := fiber.New(fiber.Config{
		AppName:      "Fiber Notes Demo",
		ReadTimeout:  5 * time.Second,
		WriteTimeout: 5 * time.Second,
	})

	app.Use(recover.New())
	app.Use(logger.New())
	app.Use(requestID())

	var mu sync.RWMutex
	notes := map[string]Note{}

	api := app.Group("/api")
	api.Get("/health", func(c *fiber.Ctx) error {
		return c.JSON(fiber.Map{"status": "ok", "framework": "fiber"})
	})

	api.Get("/notes", func(c *fiber.Ctx) error {
		mu.RLock()
		list := make([]Note, 0, len(notes))
		for _, n := range notes {
			list = append(list, n)
		}
		mu.RUnlock()
		return c.JSON(list)
	})

	api.Post("/notes", func(c *fiber.Ctx) error {
		var dto createNoteDTO
		if err := c.BodyParser(&dto); err != nil {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid json"})
		}
		if dto.Title == "" {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "title required"})
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
		return c.Status(fiber.StatusCreated).JSON(n)
	})

	api.Get("/notes/:id", func(c *fiber.Ctx) error {
		mu.RLock()
		n, ok := notes[c.Params("id")]
		mu.RUnlock()
		if !ok {
			return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "not found"})
		}
		return c.JSON(n)
	})

	log.Println("Fiber listening on :8081")
	log.Fatal(app.Listen(":8081"))
}
