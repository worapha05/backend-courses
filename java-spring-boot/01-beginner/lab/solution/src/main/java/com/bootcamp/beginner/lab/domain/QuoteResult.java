package com.bootcamp.beginner.lab.domain;

import java.math.BigDecimal;
import java.util.List;

public record QuoteResult(
        String currency,
        BigDecimal subtotal,
        BigDecimal discount,
        BigDecimal total,
        List<QuoteLineResult> lines
) {}
