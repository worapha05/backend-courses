package com.bootcamp.beginner.lab.domain;

import java.math.BigDecimal;

public record QuoteLineResult(
        String sku,
        int quantity,
        BigDecimal unitPrice,
        BigDecimal lineTotal
) {}
