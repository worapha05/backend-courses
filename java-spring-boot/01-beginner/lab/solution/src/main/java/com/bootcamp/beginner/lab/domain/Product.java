package com.bootcamp.beginner.lab.domain;

import java.math.BigDecimal;

public record Product(
        String sku,
        String name,
        String category,
        BigDecimal basePrice,
        String currency
) {}
