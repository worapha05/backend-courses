package com.bootcamp.beginner.lab.domain;

public final class ConflictException extends BusinessException {
    public ConflictException(String message) {
        super("CONFLICT", message);
    }
}
