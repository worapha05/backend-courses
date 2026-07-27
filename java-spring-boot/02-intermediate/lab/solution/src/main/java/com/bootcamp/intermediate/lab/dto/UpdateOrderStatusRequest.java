package com.bootcamp.intermediate.lab.dto;

import com.bootcamp.intermediate.lab.entity.OrderStatus;
import jakarta.validation.constraints.NotNull;

public record UpdateOrderStatusRequest(
        @NotNull OrderStatus status
) {
}
