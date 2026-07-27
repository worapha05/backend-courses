package domain

import (
	"errors"
	"time"
)

var (
	ErrNotFound     = errors.New("export job not found")
	ErrCannotCancel = errors.New("job cannot be cancelled")
	ErrInvalidRows  = errors.New("rows must be between 1 and 100000")
)

type JobStatus string

const (
	StatusPending   JobStatus = "pending"
	StatusRunning   JobStatus = "running"
	StatusCompleted JobStatus = "completed"
	StatusFailed    JobStatus = "failed"
	StatusCancelled JobStatus = "cancelled"
)

type ExportJob struct {
	ID            string
	Status        JobStatus
	RowsRequested int
	RowsDone      int
	OutputPath    string
	Error         string
	CreatedAt     time.Time
	FinishedAt    *time.Time
}

func NewExportJob(id string, rows int) (*ExportJob, error) {
	if rows < 1 || rows > 100000 {
		return nil, ErrInvalidRows
	}
	return &ExportJob{
		ID:            id,
		Status:        StatusPending,
		RowsRequested: rows,
		CreatedAt:     time.Now().UTC(),
	}, nil
}

func (j *ExportJob) MarkRunning() {
	j.Status = StatusRunning
}

func (j *ExportJob) MarkCompleted(path string) {
	now := time.Now().UTC()
	j.Status = StatusCompleted
	j.OutputPath = path
	j.RowsDone = j.RowsRequested
	j.FinishedAt = &now
}

func (j *ExportJob) MarkFailed(msg string) {
	now := time.Now().UTC()
	j.Status = StatusFailed
	j.Error = msg
	j.FinishedAt = &now
}

func (j *ExportJob) MarkCancelled() error {
	if j.Status == StatusCompleted || j.Status == StatusFailed || j.Status == StatusCancelled {
		return ErrCannotCancel
	}
	now := time.Now().UTC()
	j.Status = StatusCancelled
	j.FinishedAt = &now
	return nil
}

func (j *ExportJob) IsTerminal() bool {
	return j.Status == StatusCompleted || j.Status == StatusFailed || j.Status == StatusCancelled
}

type ExportRepository interface {
	Save(job *ExportJob) error
	FindByID(id string) (*ExportJob, error)
	Update(job *ExportJob) error
}

// JobQueue คือ port ให้ use case enqueue งาน โดยไม่รู้เรื่อง worker ภายใน
type JobQueue interface {
	Enqueue(jobID string) error
}
