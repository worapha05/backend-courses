package com.bootcamp.intermediate.lab.dto;

import java.math.BigDecimal;

public record OrderItemResponse(
        Long productId,
        String sku,
        int quantity,
        BigDecimal unitPrice,
        BigDecimal lineTotal
) {
}
