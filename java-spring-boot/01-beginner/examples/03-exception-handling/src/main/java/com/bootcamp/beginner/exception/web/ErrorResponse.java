package com.bootcamp.beginner.exception.web;

import java.time.Instant;

public record ErrorResponse(
        String code,
        String message,
        int status,
        Instant timestamp,
        String path
) {}
