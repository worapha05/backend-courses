package httpadapter

import (
	"encoding/json"
	"errors"
	"net/http"
	"time"

	"github.com/zero-to-hero/go-fullstack-bootcamp/03-expert/lab/solution/internal/domain"
	"github.com/zero-to-hero/go-fullstack-bootcamp/03-expert/lab/solution/internal/usecase"
)

type Canceller interface {
	CancelJob(id string)
}

type Handler struct {
	Create    usecase.CreateExport
	Get       usecase.GetExport
	Cancel    usecase.CancelExport
	Canceller Canceller
}

type exportResponse struct {
	ID            string     `json:"id"`
	Status        string     `json:"status"`
	RowsRequested int        `json:"rows_requested"`
	RowsDone      int        `json:"rows_done"`
	OutputPath    string     `json:"output_path,omitempty"`
	Error         string     `json:"error,omitempty"`
	CreatedAt     time.Time  `json:"created_at"`
	FinishedAt    *time.Time `json:"finished_at,omitempty"`
}

func toExportResponse(j *domain.ExportJob) exportResponse {
	return exportResponse{
		ID:            j.ID,
		Status:        string(j.Status),
		RowsRequested: j.RowsRequested,
		RowsDone:      j.RowsDone,
		OutputPath:    j.OutputPath,
		Error:         j.Error,
		CreatedAt:     j.CreatedAt,
		FinishedAt:    j.FinishedAt,
	}
}

func (h Handler) Routes() http.Handler {
	mux := http.NewServeMux()
	mux.HandleFunc("GET /health", func(w http.ResponseWriter, r *http.Request) {
		writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
	})
	mux.HandleFunc("POST /exports", h.create)
	mux.HandleFunc("GET /exports/{id}", h.get)
	mux.HandleFunc("POST /exports/{id}/cancel", h.cancel)
	return mux
}

func (h Handler) create(w http.ResponseWriter, r *http.Request) {
	var body struct {
		Rows int `json:"rows"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid json"})
		return
	}
	job, err := h.Create.Execute(r.Context(), usecase.CreateExportInput{Rows: body.Rows})
	if err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": err.Error()})
		return
	}
	writeJSON(w, http.StatusAccepted, toExportResponse(job))
}

func (h Handler) get(w http.ResponseWriter, r *http.Request) {
	job, err := h.Get.Execute(r.Context(), r.PathValue("id"))
	if err != nil {
		status := http.StatusBadRequest
		if errors.Is(err, domain.ErrNotFound) {
			status = http.StatusNotFound
		}
		writeJSON(w, status, map[string]string{"error": err.Error()})
		return
	}
	writeJSON(w, http.StatusOK, toExportResponse(job))
}

func (h Handler) cancel(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	job, err := h.Cancel.Execute(r.Context(), id)
	if err != nil {
		status := http.StatusBadRequest
		if errors.Is(err, domain.ErrNotFound) {
			status = http.StatusNotFound
		}
		writeJSON(w, status, map[string]string{"error": err.Error()})
		return
	}
	if h.Canceller != nil {
		h.Canceller.CancelJob(id)
	}
	writeJSON(w, http.StatusOK, toExportResponse(job))
}

func writeJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(v)
}
