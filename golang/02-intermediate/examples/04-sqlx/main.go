package main

import (
	"context"
	"log"
	"os"
	"time"

	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"
	_ "github.com/lib/pq"
)

type User struct {
	ID           string    `db:"id" json:"id"`
	Email        string    `db:"email" json:"email"`
	PasswordHash string    `db:"password_hash" json:"-"`
	CreatedAt    time.Time `db:"created_at" json:"created_at"`
}

func openDB(dsn string) (*sqlx.DB, error) {
	db, err := sqlx.Connect("postgres", dsn)
	if err != nil {
		return nil, err
	}
	db.SetMaxOpenConns(25)
	db.SetMaxIdleConns(10)
	db.SetConnMaxLifetime(time.Hour)
	db.SetConnMaxIdleTime(10 * time.Minute)
	return db, nil
}

func ensureSchema(ctx context.Context, db *sqlx.DB) error {
	const q = `
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
)`
	_, err := db.ExecContext(ctx, q)
	return err
}

func createUser(ctx context.Context, db *sqlx.DB, email, hash string) (User, error) {
	u := User{
		ID:           uuid.NewString(),
		Email:        email,
		PasswordHash: hash,
		CreatedAt:    time.Now().UTC(),
	}
	const insert = `
INSERT INTO users (id, email, password_hash, created_at)
VALUES ($1, $2, $3, $4)
ON CONFLICT (email) DO NOTHING`
	res, err := db.ExecContext(ctx, insert, u.ID, u.Email, u.PasswordHash, u.CreatedAt)
	if err != nil {
		return User{}, err
	}
	if n, _ := res.RowsAffected(); n == 0 {
		// email มีอยู่แล้ว — ดึงแถวเดิมกลับ
		return getByEmail(ctx, db, email)
	}
	return u, nil
}

func getByEmail(ctx context.Context, db *sqlx.DB, email string) (User, error) {
	var u User
	err := db.GetContext(ctx, &u, `SELECT id, email, password_hash, created_at FROM users WHERE email=$1`, email)
	return u, err
}

func main() {
	dsn := env("DATABASE_URL", "postgres://postgres:secret@localhost:5432/bootcamp?sslmode=disable")
	db, err := openDB(dsn)
	if err != nil {
		log.Fatalf("open db: %v", err)
	}
	defer db.Close()

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	if err := ensureSchema(ctx, db); err != nil {
		log.Fatalf("schema: %v", err)
	}

	u, err := createUser(ctx, db, "sqlx@bootcamp.dev", "bcrypt-hash-placeholder")
	if err != nil {
		log.Fatalf("create: %v", err)
	}

	found, err := getByEmail(ctx, db, u.Email)
	if err != nil {
		log.Fatalf("get: %v", err)
	}

	log.Printf("SQLx OK → user id=%s email=%s", found.ID, found.Email)
	log.Println("SQL ที่เขียนเอง = predictable และอธิบายใน explain analyze ได้ง่าย")
}

func env(k, fallback string) string {
	if v := os.Getenv(k); v != "" {
		return v
	}
	return fallback
}
