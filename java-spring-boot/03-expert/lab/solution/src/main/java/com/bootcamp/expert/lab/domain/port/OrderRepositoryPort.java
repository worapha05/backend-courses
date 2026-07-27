package com.bootcamp.expert.lab.domain.port;

import com.bootcamp.expert.lab.domain.model.Order;
import java.util.List;
import java.util.Optional;

public interface OrderRepositoryPort {

    Order save(Order order);

    Optional<Order> findByIdAndTenant(String id, String tenantId);

    List<Order> findAllByTenant(String tenantId);
}
