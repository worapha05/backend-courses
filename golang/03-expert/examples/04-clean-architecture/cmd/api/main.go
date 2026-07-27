package main

import (
	"log"
	"net/http"
	"strconv"

	httpadapter "github.com/zero-to-hero/go-fullstack-bootcamp/03-expert/examples/04-clean-architecture/internal/adapter/http"
	"github.com/zero-to-hero/go-fullstack-bootcamp/03-expert/examples/04-clean-architecture/internal/adapter/memory"
	"github.com/zero-to-hero/go-fullstack-bootcamp/03-expert/examples/04-clean-architecture/internal/usecase"
)

type seqID struct{ n int }

func (s *seqID) NewID() string {
	s.n++
	return "ord-" + strconv.Itoa(s.n)
}

func main() {
	repo := memory.NewOrderRepo()
	ids := &seqID{}

	h := httpadapter.Handler{
		Create: usecase.CreateOrder{Repo: repo, IDs: ids},
		Pay:    usecase.PayOrder{Repo: repo},
	}

	log.Println("Clean Architecture demo on :8091")
	log.Fatal(http.ListenAndServe(":8091", h.Routes()))
}
