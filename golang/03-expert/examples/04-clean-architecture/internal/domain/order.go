package domain

import (
	"errors"
	"time"
)

var (
	ErrNotFound      = errors.New("order not found")
	ErrInvalidStatus = errors.New("invalid order status transition")
)

type OrderStatus string

const (
	StatusPending   OrderStatus = "pending"
	StatusPaid      OrderStatus = "paid"
	StatusCancelled OrderStatus = "cancelled"
)

// Order เป็น entity ฝั่ง domain — ไม่รู้จัก HTTP หรือ database driver
type Order struct {
	ID        string
	Customer  string
	Amount    float64
	Status    OrderStatus
	CreatedAt time.Time
}

func NewOrder(id, customer string, amount float64) (*Order, error) {
	if customer == "" {
		return nil, errors.New("customer required")
	}
	if amount <= 0 {
		return nil, errors.New("amount must be positive")
	}
	return &Order{
		ID:        id,
		Customer:  customer,
		Amount:    amount,
		Status:    StatusPending,
		CreatedAt: time.Now().UTC(),
	}, nil
}

func (o *Order) MarkPaid() error {
	if o.Status != StatusPending {
		return ErrInvalidStatus
	}
	o.Status = StatusPaid
	return nil
}

// OrderRepository คือ port ที่ use case กำหนด — infra เป็นคน implement
type OrderRepository interface {
	Save(order *Order) error
	FindByID(id string) (*Order, error)
}
