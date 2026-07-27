package com.bootcamp.expert.lab.domain.model;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.Objects;
import java.util.UUID;

public class Order {

    private final String id;
    private final String tenantId;
    private final String customerName;
    private final List<OrderLine> lines = new ArrayList<>();

    public Order(String tenantId, String customerName) {
        this.id = UUID.randomUUID().toString();
        this.tenantId = Objects.requireNonNull(tenantId);
        this.customerName = Objects.requireNonNull(customerName);
    }

    public Order(String id, String tenantId, String customerName, List<OrderLine> lines) {
        this.id = id;
        this.tenantId = tenantId;
        this.customerName = customerName;
        this.lines.addAll(lines);
    }

    public void addLine(String sku, int quantity, BigDecimal unitPrice) {
        if (quantity <= 0) {
            throw new IllegalArgumentException("quantity must be > 0");
        }
        lines.add(new OrderLine(sku, quantity, unitPrice));
    }

    public BigDecimal total() {
        return lines.stream().map(OrderLine::lineTotal).reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    public String id() {
        return id;
    }

    public String tenantId() {
        return tenantId;
    }

    public String customerName() {
        return customerName;
    }

    public List<OrderLine> lines() {
        return List.copyOf(lines);
    }
}
