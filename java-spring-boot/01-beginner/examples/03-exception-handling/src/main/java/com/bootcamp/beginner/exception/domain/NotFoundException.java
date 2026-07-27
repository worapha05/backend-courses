package com.bootcamp.beginner.exception.domain;

public final class NotFoundException extends BusinessException {

    public NotFoundException(String message) {
        super("NOT_FOUND", message);
    }
}
