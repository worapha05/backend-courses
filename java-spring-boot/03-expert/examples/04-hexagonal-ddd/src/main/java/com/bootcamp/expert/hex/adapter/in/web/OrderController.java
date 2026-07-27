package com.bootcamp.expert.hex.adapter.in.web;

import com.bootcamp.expert.hex.application.PlaceOrderUseCase;
import com.bootcamp.expert.hex.domain.model.Order;
import com.bootcamp.expert.hex.domain.model.OrderLine;
import com.bootcamp.expert.hex.domain.port.OrderRepositoryPort;
import java.math.BigDecimal;
import java.util.List;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

@RestController
public class OrderController {

    private final PlaceOrderUseCase placeOrderUseCase;
    private final OrderRepositoryPort orderRepository;

    public OrderController(PlaceOrderUseCase placeOrderUseCase, OrderRepositoryPort orderRepository) {
        this.placeOrderUseCase = placeOrderUseCase;
        this.orderRepository = orderRepository;
    }

    public record LineRequest(String sku, int quantity, BigDecimal unitPrice) {}

    public record PlaceRequest(String customerId, List<LineRequest> lines) {}

    public record LineResponse(String sku, int quantity, BigDecimal unitPrice, BigDecimal lineTotal) {}

    public record OrderResponse(
            String id, String customerId, String status, BigDecimal total, List<LineResponse> lines
    ) {}

    @PostMapping("/orders")
    @ResponseStatus(HttpStatus.CREATED)
    public OrderResponse place(@RequestBody PlaceRequest request) {
        Order order = placeOrderUseCase.execute(new PlaceOrderUseCase.PlaceOrderCommand(
                request.customerId(),
                request.lines().stream()
                        .map(l -> new PlaceOrderUseCase.LineCommand(l.sku(), l.quantity(), l.unitPrice()))
                        .toList()
        ));
        return toResponse(order);
    }

    @GetMapping("/orders/{id}")
    public OrderResponse get(@PathVariable String id) {
        return orderRepository.findById(id)
                .map(this::toResponse)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "order not found"));
    }

    @GetMapping("/health")
    public Map<String, String> health() {
        return Map.of("status", "UP");
    }

    private OrderResponse toResponse(Order order) {
        List<LineResponse> lines = order.lines().stream()
                .map(this::toLine)
                .toList();
        return new OrderResponse(
                order.id(), order.customerId(), order.status().name(), order.total(), lines);
    }

    private LineResponse toLine(OrderLine line) {
        return new LineResponse(line.sku(), line.quantity(), line.unitPrice(), line.lineTotal());
    }
}
