package httpadapter

import (
	"encoding/json"
	"errors"
	"net/http"
	"time"

	"github.com/zero-to-hero/go-fullstack-bootcamp/03-expert/examples/04-clean-architecture/internal/domain"
	"github.com/zero-to-hero/go-fullstack-bootcamp/03-expert/examples/04-clean-architecture/internal/usecase"
)

type Handler struct {
	Create usecase.CreateOrder
	Pay    usecase.PayOrder
}

// orderResponse คั่น domain กับ JSON — ไม่ใส่ json tag ใน entity
type orderResponse struct {
	ID        string    `json:"id"`
	Customer  string    `json:"customer"`
	Amount    float64   `json:"amount"`
	Status    string    `json:"status"`
	CreatedAt time.Time `json:"created_at"`
}

func toOrderResponse(o *domain.Order) orderResponse {
	return orderResponse{
		ID:        o.ID,
		Customer:  o.Customer,
		Amount:    o.Amount,
		Status:    string(o.Status),
		CreatedAt: o.CreatedAt,
	}
}

func (h Handler) Routes() http.Handler {
	mux := http.NewServeMux()
	mux.HandleFunc("POST /orders", h.createOrder)
	mux.HandleFunc("POST /orders/{id}/pay", h.payOrder)
	mux.HandleFunc("GET /health", func(w http.ResponseWriter, r *http.Request) {
		writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
	})
	return mux
}

func (h Handler) createOrder(w http.ResponseWriter, r *http.Request) {
	var body struct {
		Customer string  `json:"customer"`
		Amount   float64 `json:"amount"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid json"})
		return
	}
	o, err := h.Create.Execute(r.Context(), usecase.CreateOrderInput{
		Customer: body.Customer,
		Amount:   body.Amount,
	})
	if err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": err.Error()})
		return
	}
	writeJSON(w, http.StatusCreated, toOrderResponse(o))
}

func (h Handler) payOrder(w http.ResponseWriter, r *http.Request) {
	o, err := h.Pay.Execute(r.Context(), r.PathValue("id"))
	if err != nil {
		status := http.StatusBadRequest
		if errors.Is(err, domain.ErrNotFound) {
			status = http.StatusNotFound
		}
		writeJSON(w, status, map[string]string{"error": err.Error()})
		return
	}
	writeJSON(w, http.StatusOK, toOrderResponse(o))
}

func writeJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(v)
}
