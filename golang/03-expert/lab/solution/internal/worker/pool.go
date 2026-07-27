package worker

import (
	"context"
	"fmt"
	"log"
	"os"
	"path/filepath"
	"sync"
	"time"

	"github.com/zero-to-hero/go-fullstack-bootcamp/03-expert/lab/solution/internal/domain"
)

// Pool implement domain.JobQueue และรันงาน export จริง
type Pool struct {
	repo      domain.ExportRepository
	jobs      chan string
	workers   int
	outDir    string
	cancelMap sync.Map // jobID -> context.CancelFunc
}

func NewPool(repo domain.ExportRepository, workers int, outDir string) *Pool {
	return &Pool{
		repo:    repo,
		jobs:    make(chan string, 64),
		workers: workers,
		outDir:  outDir,
	}
}

func (p *Pool) Start(ctx context.Context) {
	if err := os.MkdirAll(p.outDir, 0o755); err != nil {
		log.Printf("failed to create output dir %s: %v", p.outDir, err)
	}
	for i := 0; i < p.workers; i++ {
		go p.loop(ctx)
	}
}

func (p *Pool) Enqueue(jobID string) error {
	p.jobs <- jobID
	return nil
}

func (p *Pool) loop(ctx context.Context) {
	for {
		select {
		case <-ctx.Done():
			return
		case id := <-p.jobs:
			p.runJob(ctx, id)
		}
	}
}

func (p *Pool) runJob(parent context.Context, id string) {
	job, err := p.repo.FindByID(id)
	if err != nil {
		return
	}
	if job.Status == domain.StatusCancelled {
		return
	}

	jobCtx, cancel := context.WithCancel(parent)
	p.cancelMap.Store(id, cancel)
	defer func() {
		cancel()
		p.cancelMap.Delete(id)
	}()

	job.MarkRunning()
	_ = p.repo.Update(job)

	path := filepath.Join(p.outDir, id+".csv")
	f, err := os.Create(path)
	if err != nil {
		job.MarkFailed(err.Error())
		_ = p.repo.Update(job)
		return
	}
	defer f.Close()

	_, _ = fmt.Fprintln(f, "row,value")
	for i := 1; i <= job.RowsRequested; i++ {
		// ตรวจว่าถูก cancel จาก API หรือ parent shutdown
		select {
		case <-jobCtx.Done():
			current, _ := p.repo.FindByID(id)
			if current != nil && current.Status != domain.StatusCancelled {
				current.MarkCancelled()
				_ = p.repo.Update(current)
			}
			_ = os.Remove(path)
			return
		default:
		}

		// โหลดสถานะล่าสุด — ถ้า API mark cancelled แล้ว ให้หยุด
		current, err := p.repo.FindByID(id)
		if err == nil && current.Status == domain.StatusCancelled {
			_ = os.Remove(path)
			return
		}

		_, _ = fmt.Fprintf(f, "%d,sample-%d\n", i, i)
		job.RowsDone = i
		if i%50 == 0 {
			_ = p.repo.Update(job)
		}
		time.Sleep(2 * time.Millisecond) // จำลองงานหนัก
	}

	job.MarkCompleted(path)
	_ = p.repo.Update(job)
}

// CancelJob ช่วยให้ cancel เร็วขึ้นผ่าน context (optional enhancement)
func (p *Pool) CancelJob(id string) {
	if v, ok := p.cancelMap.Load(id); ok {
		v.(context.CancelFunc)()
	}
}
