package usecase

import (
	"context"

	"github.com/zero-to-hero/go-fullstack-bootcamp/03-expert/lab/solution/internal/domain"
)

type IDGenerator interface {
	NewID() string
}

type CreateExport struct {
	Repo  domain.ExportRepository
	Queue domain.JobQueue
	IDs   IDGenerator
}

type CreateExportInput struct {
	Rows int
}

func (uc CreateExport) Execute(ctx context.Context, in CreateExportInput) (*domain.ExportJob, error) {
	_ = ctx
	job, err := domain.NewExportJob(uc.IDs.NewID(), in.Rows)
	if err != nil {
		return nil, err
	}
	if err := uc.Repo.Save(job); err != nil {
		return nil, err
	}
	if err := uc.Queue.Enqueue(job.ID); err != nil {
		return nil, err
	}
	return job, nil
}

type GetExport struct {
	Repo domain.ExportRepository
}

func (uc GetExport) Execute(ctx context.Context, id string) (*domain.ExportJob, error) {
	_ = ctx
	return uc.Repo.FindByID(id)
}

type CancelExport struct {
	Repo domain.ExportRepository
}

func (uc CancelExport) Execute(ctx context.Context, id string) (*domain.ExportJob, error) {
	_ = ctx
	job, err := uc.Repo.FindByID(id)
	if err != nil {
		return nil, err
	}
	if err := job.MarkCancelled(); err != nil {
		return nil, err
	}
	if err := uc.Repo.Update(job); err != nil {
		return nil, err
	}
	return job, nil
}
