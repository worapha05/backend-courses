package com.bootcamp.intermediate.jpa.dto;

import java.util.List;

public record CreateEmployeeRequest(
        String fullName,
        List<String> skillCodes
) {
}
