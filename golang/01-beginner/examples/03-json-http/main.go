package main

import (
	"encoding/json"
	"errors"
	"log"
	"net/http"
	"strconv"
	"sync"
)

type Product struct {
	ID    string  `json:"id"`
	Name  string  `json:"name"`
	Price float64 `json:"price"`
}

type createProductRequest struct {
	Name  string  `json:"name"`
	Price float64 `json:"price"`
}

type apiError struct {
	Error string `json:"error"`
}

type ProductStore interface {
	List() []Product
	Get(id string) (Product, error)
	Create(name string, price float64) Product
}

type memoryStore struct {
	mu    sync.RWMutex
	seq   int
	items map[string]Product
}

func newMemoryStore() *memoryStore {
	return &memoryStore{items: make(map[string]Product)}
}

func (s *memoryStore) List() []Product {
	s.mu.RLock()
	defer s.mu.RUnlock()
	out := make([]Product, 0, len(s.items))
	for _, p := range s.items {
		out = append(out, p)
	}
	return out
}

func (s *memoryStore) Get(id string) (Product, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	p, ok := s.items[id]
	if !ok {
		return Product{}, errors.New("product not found")
	}
	return p, nil
}

func (s *memoryStore) Create(name string, price float64) Product {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.seq++
	id := fmtID(s.seq)
	p := Product{ID: id, Name: name, Price: price}
	s.items[id] = p
	return p
}

func fmtID(n int) string {
	return "p-" + strconv.Itoa(n)
}

func writeJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(v)
}

func main() {
	store := newMemoryStore()
	_ = store.Create("Starter Notebook", 199)

	mux := http.NewServeMux()

	mux.HandleFunc("GET /health", func(w http.ResponseWriter, r *http.Request) {
		writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
	})

	mux.HandleFunc("GET /products", func(w http.ResponseWriter, r *http.Request) {
		writeJSON(w, http.StatusOK, store.List())
	})

	mux.HandleFunc("GET /products/{id}", func(w http.ResponseWriter, r *http.Request) {
		id := r.PathValue("id")
		p, err := store.Get(id)
		if err != nil {
			writeJSON(w, http.StatusNotFound, apiError{Error: err.Error()})
			return
		}
		writeJSON(w, http.StatusOK, p)
	})

	mux.HandleFunc("POST /products", func(w http.ResponseWriter, r *http.Request) {
		var req createProductRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			writeJSON(w, http.StatusBadRequest, apiError{Error: "invalid json"})
			return
		}
		if req.Name == "" || req.Price <= 0 {
			writeJSON(w, http.StatusBadRequest, apiError{Error: "name and positive price required"})
			return
		}
		p := store.Create(req.Name, req.Price)
		writeJSON(w, http.StatusCreated, p)
	})

	addr := ":8080"
	log.Printf("JSON HTTP API listening on %s", addr)
	log.Fatal(http.ListenAndServe(addr, mux))
}
