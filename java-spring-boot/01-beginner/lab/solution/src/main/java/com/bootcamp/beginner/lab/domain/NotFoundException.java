package com.bootcamp.beginner.lab.domain;

public final class NotFoundException extends BusinessException {
    public NotFoundException(String message) {
        super("NOT_FOUND", message);
    }
}
