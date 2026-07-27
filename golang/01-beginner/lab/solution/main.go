package main

import (
	"encoding/json"
	"errors"
	"log"
	"net/http"
	"strconv"
	"sync"
)

var ErrNotFound = errors.New("task not found")

type Task struct {
	ID    string `json:"id"`
	Title string `json:"title"`
	Done  bool   `json:"done"`
}

type createTaskRequest struct {
	Title string `json:"title"`
}

type patchTaskRequest struct {
	Title *string `json:"title"`
	Done  *bool   `json:"done"`
}

type apiError struct {
	Error string `json:"error"`
}

type TaskRepository interface {
	List() []Task
	Get(id string) (Task, error)
	Create(title string) Task
	Update(id string, title *string, done *bool) (Task, error)
	Delete(id string) error
}

type memoryRepo struct {
	mu    sync.RWMutex
	seq   int
	tasks map[string]Task
}

func newMemoryRepo() *memoryRepo {
	return &memoryRepo{tasks: make(map[string]Task)}
}

func (r *memoryRepo) List() []Task {
	r.mu.RLock()
	defer r.mu.RUnlock()
	out := make([]Task, 0, len(r.tasks))
	for _, t := range r.tasks {
		out = append(out, t)
	}
	return out
}

func (r *memoryRepo) Get(id string) (Task, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()
	t, ok := r.tasks[id]
	if !ok {
		return Task{}, ErrNotFound
	}
	return t, nil
}

func (r *memoryRepo) Create(title string) Task {
	r.mu.Lock()
	defer r.mu.Unlock()
	r.seq++
	id := "t-" + strconv.Itoa(r.seq)
	t := Task{ID: id, Title: title, Done: false}
	r.tasks[id] = t
	return t
}

func (r *memoryRepo) Update(id string, title *string, done *bool) (Task, error) {
	r.mu.Lock()
	defer r.mu.Unlock()
	t, ok := r.tasks[id]
	if !ok {
		return Task{}, ErrNotFound
	}
	if title != nil {
		t.Title = *title
	}
	if done != nil {
		t.Done = *done
	}
	r.tasks[id] = t
	return t, nil
}

func (r *memoryRepo) Delete(id string) error {
	r.mu.Lock()
	defer r.mu.Unlock()
	if _, ok := r.tasks[id]; !ok {
		return ErrNotFound
	}
	delete(r.tasks, id)
	return nil
}

type handler struct {
	repo TaskRepository
}

func writeJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(v)
}

func (h *handler) health(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
}

func (h *handler) listTasks(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, http.StatusOK, h.repo.List())
}

func (h *handler) getTask(w http.ResponseWriter, r *http.Request) {
	t, err := h.repo.Get(r.PathValue("id"))
	if err != nil {
		writeJSON(w, http.StatusNotFound, apiError{Error: err.Error()})
		return
	}
	writeJSON(w, http.StatusOK, t)
}

func (h *handler) createTask(w http.ResponseWriter, r *http.Request) {
	var req createTaskRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSON(w, http.StatusBadRequest, apiError{Error: "invalid json"})
		return
	}
	if req.Title == "" {
		writeJSON(w, http.StatusBadRequest, apiError{Error: "title is required"})
		return
	}
	writeJSON(w, http.StatusCreated, h.repo.Create(req.Title))
}

func (h *handler) patchTask(w http.ResponseWriter, r *http.Request) {
	var req patchTaskRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSON(w, http.StatusBadRequest, apiError{Error: "invalid json"})
		return
	}
	t, err := h.repo.Update(r.PathValue("id"), req.Title, req.Done)
	if err != nil {
		writeJSON(w, http.StatusNotFound, apiError{Error: err.Error()})
		return
	}
	writeJSON(w, http.StatusOK, t)
}

func (h *handler) deleteTask(w http.ResponseWriter, r *http.Request) {
	if err := h.repo.Delete(r.PathValue("id")); err != nil {
		writeJSON(w, http.StatusNotFound, apiError{Error: err.Error()})
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func main() {
	h := &handler{repo: newMemoryRepo()}
	mux := http.NewServeMux()
	mux.HandleFunc("GET /health", h.health)
	mux.HandleFunc("GET /tasks", h.listTasks)
	mux.HandleFunc("GET /tasks/{id}", h.getTask)
	mux.HandleFunc("POST /tasks", h.createTask)
	mux.HandleFunc("PATCH /tasks/{id}", h.patchTask)
	mux.HandleFunc("DELETE /tasks/{id}", h.deleteTask)

	log.Println("Task Board API on :8080")
	log.Fatal(http.ListenAndServe(":8080", mux))
}
