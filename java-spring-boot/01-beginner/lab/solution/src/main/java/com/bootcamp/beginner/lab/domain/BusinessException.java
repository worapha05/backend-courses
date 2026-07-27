package com.bootcamp.beginner.lab.domain;

public sealed class BusinessException extends RuntimeException
        permits NotFoundException, ConflictException, ValidationBusinessException {

    private final String code;

    protected BusinessException(String code, String message) {
        super(message);
        this.code = code;
    }

    public String code() {
        return code;
    }
}
