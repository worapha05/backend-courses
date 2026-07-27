package main

import (
	"errors"
	"fmt"
	"os"
)

// ErrEmptyName เป็น sentinel error — ใช้เทียบด้วย errors.Is
var ErrEmptyName = errors.New("name must not be empty")

func greet(name string) (string, error) {
	if name == "" {
		return "", ErrEmptyName
	}
	return "Hello, " + name, nil
}

func double(n *int) {
	*n = *n * 2
}

func demoDefer() {
	fmt.Println("  start demoDefer")
	defer fmt.Println("  deferred: runs when function returns")
	fmt.Println("  end demoDefer body")
}

func main() {
	// --- Variables & zero values ---
	var count int
	var ready bool
	var label string
	fmt.Printf("zero values → int=%d bool=%v string=%q\n", count, ready, label)

	// --- Short declaration ---
	lang := "Go"
	fmt.Println("language:", lang)

	// --- Pointers ---
	x := 21
	fmt.Println("before double:", x)
	double(&x)
	fmt.Println("after double:", x)

	// --- Explicit error handling (no try/catch) ---
	msg, err := greet("Full-stack Dev")
	if err != nil {
		fmt.Fprintln(os.Stderr, "unexpected:", err)
		os.Exit(1)
	}
	fmt.Println(msg)

	_, err = greet("")
	if errors.Is(err, ErrEmptyName) {
		fmt.Println("handled expected error:", err)
	}

	// Wrap error with context (%w preserves the chain)
	wrapped := fmt.Errorf("greet failed: %w", err)
	fmt.Println("wrapped:", wrapped)
	fmt.Println("unwrap still ErrEmptyName?", errors.Is(wrapped, ErrEmptyName))

	// --- defer ---
	demoDefer()

	fmt.Println("done — run: go run .")
}
