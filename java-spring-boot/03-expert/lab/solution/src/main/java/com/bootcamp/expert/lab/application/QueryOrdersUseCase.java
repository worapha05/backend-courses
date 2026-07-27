package com.bootcamp.expert.lab.application;

import com.bootcamp.expert.lab.domain.model.Order;
import com.bootcamp.expert.lab.domain.port.OrderRepositoryPort;
import java.util.List;
import java.util.Optional;

public class QueryOrdersUseCase {

    private final OrderRepositoryPort orderRepository;

    public QueryOrdersUseCase(OrderRepositoryPort orderRepository) {
        this.orderRepository = orderRepository;
    }

    public List<Order> list(String tenantId) {
        return orderRepository.findAllByTenant(tenantId);
    }

    public Optional<Order> get(String tenantId, String id) {
        return orderRepository.findByIdAndTenant(id, tenantId);
    }
}
