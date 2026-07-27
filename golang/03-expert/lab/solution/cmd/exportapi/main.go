package main

import (
	"context"
	"log"
	"net/http"
	"os/signal"
	"strconv"
	"syscall"
	"time"

	httpadapter "github.com/zero-to-hero/go-fullstack-bootcamp/03-expert/lab/solution/internal/adapter/http"
	"github.com/zero-to-hero/go-fullstack-bootcamp/03-expert/lab/solution/internal/adapter/memory"
	"github.com/zero-to-hero/go-fullstack-bootcamp/03-expert/lab/solution/internal/usecase"
	"github.com/zero-to-hero/go-fullstack-bootcamp/03-expert/lab/solution/internal/worker"
)

type seqID struct{ n int }

func (s *seqID) NewID() string {
	s.n++
	return "exp-" + strconv.Itoa(s.n)
}

func main() {
	repo := memory.NewExportRepo()
	pool := worker.NewPool(repo, 4, "exports")

	ctx, stop := signal.NotifyContext(context.Background(), syscall.SIGINT, syscall.SIGTERM)
	defer stop()
	pool.Start(ctx)

	h := httpadapter.Handler{
		Create: usecase.CreateExport{
			Repo:  repo,
			Queue: pool,
			IDs:   &seqID{},
		},
		Get:       usecase.GetExport{Repo: repo},
		Cancel:    usecase.CancelExport{Repo: repo},
		Canceller: pool,
	}

	srv := &http.Server{
		Addr:              ":8092",
		Handler:           h.Routes(),
		ReadHeaderTimeout: 5 * time.Second,
	}

	go func() {
		log.Println("Export API on :8092")
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatal(err)
		}
	}()

	<-ctx.Done()
	log.Println("shutting down...")
	shutdownCtx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	_ = srv.Shutdown(shutdownCtx)
}
