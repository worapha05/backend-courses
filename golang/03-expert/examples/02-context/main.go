package main

import (
	"context"
	"errors"
	"fmt"
	"time"
)

// simulateDBQuery จำลอง query ที่เคารพ context cancellation/timeout
func simulateDBQuery(ctx context.Context, latency time.Duration) (string, error) {
	select {
	case <-time.After(latency):
		return "row{id:1}", nil
	case <-ctx.Done():
		return "", fmt.Errorf("query aborted: %w", ctx.Err())
	}
}

func handleRequest(parent context.Context) error {
	// ทุก API ควรมี deadline ชัดเจน
	ctx, cancel := context.WithTimeout(parent, 100*time.Millisecond)
	defer cancel()

	result, err := simulateDBQuery(ctx, 200*time.Millisecond) // จงใจช้ากว่า timeout
	if err != nil {
		if errors.Is(err, context.DeadlineExceeded) {
			fmt.Println("mapped to HTTP 504 Gateway Timeout")
		}
		return err
	}
	fmt.Println("result:", result)
	return nil
}

func demoCancel() {
	ctx, cancel := context.WithCancel(context.Background())

	go func() {
		time.Sleep(30 * time.Millisecond)
		fmt.Println("client disconnected → cancel()")
		cancel()
	}()

	_, err := simulateDBQuery(ctx, 200*time.Millisecond)
	fmt.Println("cancel demo:", err)
}

func main() {
	fmt.Println("-- timeout --")
	if err := handleRequest(context.Background()); err != nil {
		fmt.Println("handler error:", err)
	}

	fmt.Println("-- cancel --")
	demoCancel()
}
