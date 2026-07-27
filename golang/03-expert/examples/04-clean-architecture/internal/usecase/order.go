package usecase

import (
	"context"

	"github.com/zero-to-hero/go-fullstack-bootcamp/03-expert/examples/04-clean-architecture/internal/domain"
)

type IDGenerator interface {
	NewID() string
}

type CreateOrderInput struct {
	Customer string
	Amount   float64
}

type CreateOrder struct {
	Repo OrderRepository
	IDs  IDGenerator
}

// ใช้ alias ใน package เพื่อไม่ให้ usecase พึ่งชื่อยาว — จริง ๆ คือ domain.OrderRepository
type OrderRepository = domain.OrderRepository

func (uc CreateOrder) Execute(ctx context.Context, in CreateOrderInput) (*domain.Order, error) {
	_ = ctx // ส่งต่อไป repo เมื่อมี DB จริง
	o, err := domain.NewOrder(uc.IDs.NewID(), in.Customer, in.Amount)
	if err != nil {
		return nil, err
	}
	if err := uc.Repo.Save(o); err != nil {
		return nil, err
	}
	return o, nil
}

type PayOrder struct {
	Repo OrderRepository
}

func (uc PayOrder) Execute(ctx context.Context, orderID string) (*domain.Order, error) {
	_ = ctx
	o, err := uc.Repo.FindByID(orderID)
	if err != nil {
		return nil, err
	}
	if err := o.MarkPaid(); err != nil {
		return nil, err
	}
	if err := uc.Repo.Save(o); err != nil {
		return nil, err
	}
	return o, nil
}
