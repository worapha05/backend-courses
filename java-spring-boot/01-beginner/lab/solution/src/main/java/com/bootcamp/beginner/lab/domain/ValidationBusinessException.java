package com.bootcamp.beginner.lab.domain;

public final class ValidationBusinessException extends BusinessException {
    public ValidationBusinessException(String message) {
        super("VALIDATION_ERROR", message);
    }
}
