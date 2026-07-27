package com.bootcamp.expert.hex.domain.model;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.Objects;
import java.util.UUID;

public class Order {

    private final String id;
    private final String customerId;
    private final List<OrderLine> lines = new ArrayList<>();
    private OrderStatus status = OrderStatus.DRAFT;

    public Order(String customerId) {
        this.id = UUID.randomUUID().toString();
        this.customerId = Objects.requireNonNull(customerId);
    }

    public void addLine(String sku, int quantity, BigDecimal unitPrice) {
        if (status != OrderStatus.DRAFT) {
            throw new IllegalStateException("only draft orders accept new lines");
        }
        if (quantity <= 0) {
            throw new IllegalArgumentException("quantity must be > 0");
        }
        lines.add(new OrderLine(sku, quantity, unitPrice));
    }

    public void place() {
        if (lines.isEmpty()) {
            throw new IllegalStateException("cannot place empty order");
        }
        this.status = OrderStatus.PLACED;
    }

    public BigDecimal total() {
        return lines.stream()
                .map(OrderLine::lineTotal)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    public String id() {
        return id;
    }

    public String customerId() {
        return customerId;
    }

    public List<OrderLine> lines() {
        return List.copyOf(lines);
    }

    public OrderStatus status() {
        return status;
    }
}
