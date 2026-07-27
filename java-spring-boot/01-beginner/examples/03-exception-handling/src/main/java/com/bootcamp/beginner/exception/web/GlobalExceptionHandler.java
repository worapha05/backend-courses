package com.bootcamp.beginner.exception.web;

import com.bootcamp.beginner.exception.domain.BusinessException;
import com.bootcamp.beginner.exception.domain.ConflictException;
import com.bootcamp.beginner.exception.domain.NotFoundException;
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
    public ResponseEntity<ErrorResponse> handleNotFound(NotFoundException ex, HttpServletRequest req) {
        return build(ex, HttpStatus.NOT_FOUND, req.getRequestURI());
    }

    @ExceptionHandler(ConflictException.class)
    public ResponseEntity<ErrorResponse> handleConflict(ConflictException ex, HttpServletRequest req) {
        return build(ex, HttpStatus.CONFLICT, req.getRequestURI());
    }

    @ExceptionHandler(BusinessException.class)
    public ResponseEntity<ErrorResponse> handleBusiness(BusinessException ex, HttpServletRequest req) {
        return build(ex, HttpStatus.UNPROCESSABLE_ENTITY, req.getRequestURI());
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ErrorResponse> handleValidation(
            MethodArgumentNotValidException ex, HttpServletRequest req) {
        String message = ex.getBindingResult().getFieldErrors().stream()
                .findFirst()
                .map(err -> err.getField() + ": " + err.getDefaultMessage())
                .orElse("validation failed");
        ErrorResponse body = new ErrorResponse(
                "VALIDATION_ERROR", message, 400, Instant.now(), req.getRequestURI());
        return ResponseEntity.badRequest().body(body);
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ErrorResponse> handleUnknown(Exception ex, HttpServletRequest req) {
        ErrorResponse body = new ErrorResponse(
                "INTERNAL_ERROR", "unexpected error", 500, Instant.now(), req.getRequestURI());
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(body);
    }

    private static ResponseEntity<ErrorResponse> build(
            BusinessException ex, HttpStatus status, String path) {
        ErrorResponse body = new ErrorResponse(
                ex.code(), ex.getMessage(), status.value(), Instant.now(), path);
        return ResponseEntity.status(status).body(body);
    }
}
