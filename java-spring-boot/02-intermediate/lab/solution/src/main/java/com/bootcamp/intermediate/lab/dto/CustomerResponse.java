package com.bootcamp.intermediate.lab.dto;

public record CustomerResponse(
        Long id,
        String name,
        String email
) {
}
