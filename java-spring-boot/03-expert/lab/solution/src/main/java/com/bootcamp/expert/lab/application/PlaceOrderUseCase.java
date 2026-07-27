package com.bootcamp.expert.lab.application;

import com.bootcamp.expert.lab.domain.model.Order;
import com.bootcamp.expert.lab.domain.port.AuditPort;
import com.bootcamp.expert.lab.domain.port.OrderRepositoryPort;
import java.math.BigDecimal;
import java.util.List;

public class PlaceOrderUseCase {

    private final OrderRepositoryPort orderRepository;
    private final AuditPort auditPort;

    public PlaceOrderUseCase(OrderRepositoryPort orderRepository, AuditPort auditPort) {
        this.orderRepository = orderRepository;
        this.auditPort = auditPort;
    }

    public record LineCmd(String sku, int quantity, BigDecimal unitPrice) {}

    public record Command(String tenantId, String actor, String customerName, List<LineCmd> lines) {}

    public Order execute(Command command) {
        Order order = new Order(command.tenantId(), command.customerName());
        command.lines().forEach(l -> order.addLine(l.sku(), l.quantity(), l.unitPrice()));
        Order saved = orderRepository.save(order);
        auditPort.record(command.actor(), "ORDER_CREATE", saved.id());
        return saved;
    }
}
