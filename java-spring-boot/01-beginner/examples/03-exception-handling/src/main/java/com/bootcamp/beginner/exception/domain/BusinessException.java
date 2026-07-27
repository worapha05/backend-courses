package com.bootcamp.beginner.exception.domain;

public sealed class BusinessException extends RuntimeException
        permits NotFoundException, ConflictException {

    private final String code;

    protected BusinessException(String code, String message) {
        super(message);
        this.code = code;
    }

    public String code() {
        return code;
    }
}
