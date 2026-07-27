package com.bootcamp.intermediate.rest.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;

public record TicketItemRequest(
        @NotBlank String sku,
        @Min(1) int quantity
) {}
