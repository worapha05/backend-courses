package com.bootcamp.intermediate.lab.dto;

import com.bootcamp.intermediate.lab.entity.OrderStatus;
import java.math.BigDecimal;
import java.util.List;

public record OrderResponse(
        Long id,
        Long customerId,
        String customerName,
        OrderStatus status,
        BigDecimal totalAmount,
        List<OrderItemResponse> items
) {
}
