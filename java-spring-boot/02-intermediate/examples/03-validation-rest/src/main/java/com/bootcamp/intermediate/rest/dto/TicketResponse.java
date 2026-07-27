package com.bootcamp.intermediate.rest.dto;

public record TicketResponse(String id, String subject, String requesterEmail, int itemCount) {}
