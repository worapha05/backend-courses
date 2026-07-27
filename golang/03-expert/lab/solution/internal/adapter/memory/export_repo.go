package memory

import (
	"sync"

	"github.com/zero-to-hero/go-fullstack-bootcamp/03-expert/lab/solution/internal/domain"
)

type ExportRepo struct {
	mu   sync.RWMutex
	data map[string]*domain.ExportJob
}

func NewExportRepo() *ExportRepo {
	return &ExportRepo{data: make(map[string]*domain.ExportJob)}
}

func (r *ExportRepo) Save(job *domain.ExportJob) error {
	r.mu.Lock()
	defer r.mu.Unlock()
	cp := *job
	r.data[job.ID] = &cp
	return nil
}

func (r *ExportRepo) FindByID(id string) (*domain.ExportJob, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()
	j, ok := r.data[id]
	if !ok {
		return nil, domain.ErrNotFound
	}
	cp := *j
	return &cp, nil
}

func (r *ExportRepo) Update(job *domain.ExportJob) error {
	r.mu.Lock()
	defer r.mu.Unlock()
	if _, ok := r.data[job.ID]; !ok {
		return domain.ErrNotFound
	}
	cp := *job
	r.data[job.ID] = &cp
	return nil
}
