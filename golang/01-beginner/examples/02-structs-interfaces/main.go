package main

import "fmt"

// Notifier คือ interface ฝั่ง consumer — ใครมี Notify() ก็ใช้ได้
type Notifier interface {
	Notify(message string) error
}

// EmailSender implement Notifier โดยไม่ต้องประกาศ "implements"
type EmailSender struct {
	From string
}

func (e EmailSender) Notify(message string) error {
	fmt.Printf("[email from %s] %s\n", e.From, message)
	return nil
}

type SMSSender struct {
	Phone string
}

func (s SMSSender) Notify(message string) error {
	fmt.Printf("[sms to %s] %s\n", s.Phone, message)
	return nil
}

// OrderService พึ่ง interface ไม่พึ่ง concrete type → เปลี่ยนช่องทางแจ้งเตือนได้ง่าย
type OrderService struct {
	notifier Notifier
}

func NewOrderService(n Notifier) *OrderService {
	return &OrderService{notifier: n}
}

type Order struct {
	ID     string
	Amount float64
}

func (s *OrderService) Place(o Order) error {
	fmt.Printf("order %s placed (%.2f)\n", o.ID, o.Amount)
	return s.notifier.Notify("Order " + o.ID + " confirmed")
}

// Timestamps แสดง composition ผ่าน embedding
type Timestamps struct {
	Created string
	Updated string
}

type Product struct {
	SKU  string
	Name string
	Timestamps
}

func (p Product) Label() string {
	return p.SKU + " — " + p.Name
}

func (p *Product) Touch(when string) {
	p.Updated = when
}

func main() {
	p := Product{
		SKU:  "SKU-1",
		Name: "Mechanical Keyboard",
		Timestamps: Timestamps{
			Created: "2026-01-01",
			Updated: "2026-01-01",
		},
	}
	fmt.Println(p.Label())
	p.Touch("2026-07-17")
	fmt.Println("updated:", p.Updated) // field จาก embedding

	emailSvc := NewOrderService(EmailSender{From: "noreply@shop.dev"})
	_ = emailSvc.Place(Order{ID: "ORD-100", Amount: 1290})

	smsSvc := NewOrderService(SMSSender{Phone: "+66812345678"})
	_ = smsSvc.Place(Order{ID: "ORD-101", Amount: 590})
}
