package memory

import (
	"sync"

	"github.com/zero-to-hero/go-fullstack-bootcamp/03-expert/examples/04-clean-architecture/internal/domain"
)

type OrderRepo struct {
	mu   sync.RWMutex
	data map[string]*domain.Order
}

func NewOrderRepo() *OrderRepo {
	return &OrderRepo{data: make(map[string]*domain.Order)}
}

func (r *OrderRepo) Save(order *domain.Order) error {
	r.mu.Lock()
	defer r.mu.Unlock()
	cp := *order
	r.data[order.ID] = &cp
	return nil
}

func (r *OrderRepo) FindByID(id string) (*domain.Order, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()
	o, ok := r.data[id]
	if !ok {
		return nil, domain.ErrNotFound
	}
	cp := *o
	return &cp, nil
}
