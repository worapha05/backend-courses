package com.bootcamp.beginner.lab.domain;

import java.util.List;

public record QuoteRequest(CustomerType customerType, List<QuoteLineRequest> lines) {}
