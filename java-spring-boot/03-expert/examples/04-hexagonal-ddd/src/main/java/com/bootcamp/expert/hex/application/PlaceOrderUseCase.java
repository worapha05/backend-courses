package com.bootcamp.expert.hex.application;

import com.bootcamp.expert.hex.domain.model.Order;
import com.bootcamp.expert.hex.domain.port.OrderRepositoryPort;
import java.math.BigDecimal;
import java.util.List;

public class PlaceOrderUseCase {

    private final OrderRepositoryPort orderRepository;

    public PlaceOrderUseCase(OrderRepositoryPort orderRepository) {
        this.orderRepository = orderRepository;
    }

    public record LineCommand(String sku, int quantity, BigDecimal unitPrice) {}

    public record PlaceOrderCommand(String customerId, List<LineCommand> lines) {}

    public Order execute(PlaceOrderCommand command) {
        Order order = new Order(command.customerId());
        command.lines().forEach(line ->
                order.addLine(line.sku(), line.quantity(), line.unitPrice()));
        order.place();
        return orderRepository.save(order);
    }
}
