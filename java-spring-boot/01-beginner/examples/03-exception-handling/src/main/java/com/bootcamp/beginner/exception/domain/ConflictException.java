package com.bootcamp.beginner.exception.domain;

public final class ConflictException extends BusinessException {

    public ConflictException(String message) {
        super("CONFLICT", message);
    }
}
