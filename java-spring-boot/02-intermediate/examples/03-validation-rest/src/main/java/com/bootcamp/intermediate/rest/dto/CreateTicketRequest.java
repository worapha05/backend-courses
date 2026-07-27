package com.bootcamp.intermediate.rest.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import java.util.List;

public record CreateTicketRequest(
        @NotBlank String subject,
        @Email @NotBlank String requesterEmail,
        @NotEmpty @Valid List<TicketItemRequest> items
) {}
