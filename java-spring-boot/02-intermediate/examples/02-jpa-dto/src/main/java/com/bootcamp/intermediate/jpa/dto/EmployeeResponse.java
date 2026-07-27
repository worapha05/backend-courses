package com.bootcamp.intermediate.jpa.dto;

import java.util.List;

public record EmployeeResponse(
        Long id,
        String fullName,
        List<String> skills
) {
}
