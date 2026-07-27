package com.bootcamp.expert.hex.domain.port;

import com.bootcamp.expert.hex.domain.model.Order;
import java.util.Optional;

public interface OrderRepositoryPort {

    Order save(Order order);

    Optional<Order> findById(String id);
}
