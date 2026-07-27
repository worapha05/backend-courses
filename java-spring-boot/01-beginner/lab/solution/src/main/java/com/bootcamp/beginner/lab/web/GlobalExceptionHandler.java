package com.bootcamp.beginner.lab.web;

import com.bootcamp.beginner.lab.domain.BusinessException;
import com.bootcamp.beginner.lab.domain.ConflictException;
import com.bootcamp.beginner.lab.domain.NotFoundException;
import com.bootcamp.beginner.lab.domain.ValidationBusinessException;
import jakarta.servlet.http.HttpServletRequest;
import java.time.Instant;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(NotFoundException.class)
    public ResponseEntity<ErrorResponse> notFound(NotFoundException ex, HttpServletRequest req) {
        return respond(ex, HttpStatus.NOT_FOUND, req.getRequestURI());
    }

    @ExceptionHandler(ConflictException.class)
    public ResponseEntity<ErrorResponse> conflict(ConflictException ex, HttpServletRequest req) {
        return respond(ex, HttpStatus.CONFLICT, req.getRequestURI());
    }

    @ExceptionHandler(ValidationBusinessException.class)
    public ResponseEntity<ErrorResponse> businessValidation(
            ValidationBusinessException ex, HttpServletRequest req) {
        return respond(ex, HttpStatus.BAD_REQUEST, req.getRequestURI());
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ErrorResponse> beanValidation(
            MethodArgumentNotValidException ex, HttpServletRequest req) {
        String message = ex.getBindingResult().getFieldErrors().stream()
                .findFirst()
                .map(e -> e.getField() + ": " + e.getDefaultMessage())
                .orElse("validation failed");
        return ResponseEntity.badRequest().body(new ErrorResponse(
                "VALIDATION_ERROR", message, 400, Instant.now(), req.getRequestURI()));
    }

    @ExceptionHandler(BusinessException.class)
    public ResponseEntity<ErrorResponse> business(BusinessException ex, HttpServletRequest req) {
        return respond(ex, HttpStatus.UNPROCESSABLE_ENTITY, req.getRequestURI());
    }

    private static ResponseEntity<ErrorResponse> respond(
            BusinessException ex, HttpStatus status, String path) {
        return ResponseEntity.status(status).body(new ErrorResponse(
                ex.code(), ex.getMessage(), status.value(), Instant.now(), path));
    }
}
