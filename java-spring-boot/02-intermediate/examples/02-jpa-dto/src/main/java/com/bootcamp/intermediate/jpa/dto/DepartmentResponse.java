package com.bootcamp.intermediate.jpa.dto;

import java.util.List;

public record DepartmentResponse(
        Long id,
        String name,
        List<EmployeeResponse> employees
) {
}
