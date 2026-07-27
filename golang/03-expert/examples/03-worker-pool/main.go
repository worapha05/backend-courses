package main

import (
	"context"
	"fmt"
	"sync"
	"time"
)

// Job จำลองงานหนัก เช่น scrape หน้าเว็บ หรือ generate แถว Excel
type Job struct {
	ID  int
	URL string
}

type Result struct {
	JobID int
	Data  string
	Err   error
}

type Pool struct {
	workers int
	jobs    chan Job
	results chan Result
}

func NewPool(workers, queueSize int) *Pool {
	return &Pool{
		workers: workers,
		jobs:    make(chan Job, queueSize),
		results: make(chan Result, queueSize),
	}
}

func (p *Pool) Start(ctx context.Context) {
	var wg sync.WaitGroup
	for i := 0; i < p.workers; i++ {
		wg.Add(1)
		go func(workerID int) {
			defer wg.Done()
			for {
				select {
				case <-ctx.Done():
					return
				case job, ok := <-p.jobs:
					if !ok {
						return
					}
					p.results <- p.process(ctx, workerID, job)
				}
			}
		}(i + 1)
	}

	go func() {
		wg.Wait()
		close(p.results)
	}()
}

func (p *Pool) process(ctx context.Context, workerID int, job Job) Result {
	// จำลอง I/O latency
	select {
	case <-ctx.Done():
		return Result{JobID: job.ID, Err: ctx.Err()}
	case <-time.After(40 * time.Millisecond):
		return Result{
			JobID: job.ID,
			Data:  fmt.Sprintf("worker=%d scraped %s", workerID, job.URL),
		}
	}
}

func (p *Pool) Submit(job Job) {
	p.jobs <- job
}

func (p *Pool) CloseJobs() {
	close(p.jobs)
}

func (p *Pool) Results() <-chan Result {
	return p.results
}

func main() {
	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
	defer cancel()

	pool := NewPool(4, 64)
	pool.Start(ctx)

	go func() {
		for i := 1; i <= 20; i++ {
			pool.Submit(Job{ID: i, URL: fmt.Sprintf("https://example.com/page/%d", i)})
		}
		pool.CloseJobs()
	}()

	ok, fail := 0, 0
	for res := range pool.Results() {
		if res.Err != nil {
			fail++
			fmt.Println("fail:", res.JobID, res.Err)
			continue
		}
		ok++
		fmt.Println(res.Data)
	}
	fmt.Printf("done ok=%d fail=%d\n", ok, fail)
}
