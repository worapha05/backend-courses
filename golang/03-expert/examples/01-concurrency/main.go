package main

import (
	"fmt"
	"sync"
	"time"
)

func demoChannels() {
	fmt.Println("-- channels --")
	ch := make(chan string)

	go func() {
		time.Sleep(50 * time.Millisecond)
		ch <- "payload from goroutine"
	}()

	msg := <-ch
	fmt.Println("received:", msg)
}

func demoBufferedAndSelect() {
	fmt.Println("-- buffered + select --")
	jobs := make(chan int, 3)
	jobs <- 1
	jobs <- 2
	jobs <- 3
	close(jobs)

	timeout := time.After(200 * time.Millisecond)
	for {
		select {
		case j, ok := <-jobs:
			if !ok {
				fmt.Println("jobs closed")
				return
			}
			fmt.Println("job:", j)
		case <-timeout:
			fmt.Println("timeout waiting jobs")
			return
		}
	}
}

func demoWaitGroupAndMutex() {
	fmt.Println("-- WaitGroup + Mutex --")
	var (
		mu    sync.Mutex
		wg    sync.WaitGroup
		count int
	)

	for i := 0; i < 50; i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			mu.Lock()
			count++
			mu.Unlock()
		}()
	}
	wg.Wait()
	fmt.Println("safe count:", count)
}

func main() {
	demoChannels()
	demoBufferedAndSelect()
	demoWaitGroupAndMutex()
}
