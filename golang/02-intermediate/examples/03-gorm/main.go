package main

import (
	"log"
	"os"
	"time"

	"github.com/google/uuid"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

// User model สำหรับ GORM
type User struct {
	ID           string    `gorm:"type:uuid;primaryKey" json:"id"`
	Email        string    `gorm:"uniqueIndex;size:255;not null" json:"email"`
	PasswordHash string    `gorm:"not null" json:"-"`
	CreatedAt    time.Time `json:"created_at"`
	UpdatedAt    time.Time `json:"updated_at"`
}

func (User) TableName() string { return "users" }

func openDB(dsn string) (*gorm.DB, error) {
	db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{
		Logger: logger.Default.LogMode(logger.Info),
	})
	if err != nil {
		return nil, err
	}

	sqlDB, err := db.DB()
	if err != nil {
		return nil, err
	}

	// Connection pool — สำคัญมากใน production
	sqlDB.SetMaxOpenConns(25)
	sqlDB.SetMaxIdleConns(10)
	sqlDB.SetConnMaxLifetime(time.Hour)
	sqlDB.SetConnMaxIdleTime(10 * time.Minute)

	return db, nil
}

func main() {
	dsn := env("DATABASE_URL", "host=localhost user=postgres password=secret dbname=bootcamp port=5432 sslmode=disable")

	db, err := openDB(dsn)
	if err != nil {
		log.Fatalf("open db: %v", err)
	}

	// AutoMigrate = สะดวกตอนเรียนรู้ — production ควรใช้ migration files
	if err := db.AutoMigrate(&User{}); err != nil {
		log.Fatalf("migrate: %v", err)
	}

	// FirstOrCreate: Where ต้องมีแค่เงื่อนไขค้นหา
	// ค่าตอนสร้างใหม่ใส่ใน Attrs — อย่าใส่ ID ลง struct ก่อน Where
	// ไม่งั้น GORM จะ AND id=... ทำให้ไม่เจอแถวเดิม แล้ว INSERT ซ้ำชน unique email
	var u User
	err = db.Where("email = ?", "demo@bootcamp.dev").
		Attrs(User{
			ID:           uuid.NewString(),
			Email:        "demo@bootcamp.dev",
			PasswordHash: "bcrypt-hash-placeholder",
		}).
		FirstOrCreate(&u).Error
	if err != nil {
		log.Fatalf("create: %v", err)
	}

	var found User
	if err := db.Where("email = ?", u.Email).First(&found).Error; err != nil {
		log.Fatalf("query: %v", err)
	}

	log.Printf("GORM OK → user id=%s email=%s", found.ID, found.Email)
	log.Println("tip: ใช้ migration tools ใน production แทน AutoMigrate อย่างเดียว")
}

func env(k, fallback string) string {
	if v := os.Getenv(k); v != "" {
		return v
	}
	return fallback
}
