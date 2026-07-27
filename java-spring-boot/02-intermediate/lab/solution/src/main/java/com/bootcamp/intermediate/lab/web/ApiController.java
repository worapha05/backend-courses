package com.bootcamp.intermediate.lab.web;

import com.bootcamp.intermediate.lab.dto.CreateCustomerRequest;
import com.bootcamp.intermediate.lab.dto.CreateOrderRequest;
import com.bootcamp.intermediate.lab.dto.CreateProductRequest;
import com.bootcamp.intermediate.lab.dto.CustomerResponse;
import com.bootcamp.intermediate.lab.dto.OrderResponse;
import com.bootcamp.intermediate.lab.dto.ProductResponse;
import com.bootcamp.intermediate.lab.dto.UpdateOrderStatusRequest;
import com.bootcamp.intermediate.lab.service.CustomerService;
import com.bootcamp.intermediate.lab.service.OrderService;
import com.bootcamp.intermediate.lab.service.ProductService;
import jakarta.validation.Valid;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.server.ResponseStatusException;

@RestController
public class ApiController {

    private final CustomerService customerService;
    private final ProductService productService;
    private final OrderService orderService;

    public ApiController(
            CustomerService customerService,
            ProductService productService,
            OrderService orderService) {
        this.customerService = customerService;
        this.productService = productService;
        this.orderService = orderService;
    }

    @GetMapping("/health")
    public Map<String, String> health() {
        return Map.of("status", "UP");
    }

    @PostMapping("/customers")
    @ResponseStatus(HttpStatus.CREATED)
    public CustomerResponse createCustomer(@Valid @RequestBody CreateCustomerRequest request) {
        return customerService.create(request);
    }

    @GetMapping("/customers/{id}")
    public CustomerResponse getCustomer(@PathVariable Long id) {
        return customerService.get(id);
    }

    @PostMapping("/products")
    @ResponseStatus(HttpStatus.CREATED)
    public ProductResponse createProduct(@Valid @RequestBody CreateProductRequest request) {
        return productService.create(request);
    }

    @GetMapping("/products")
    public List<ProductResponse> listProducts() {
        return productService.list();
    }

    @PostMapping("/orders")
    @ResponseStatus(HttpStatus.CREATED)
    public OrderResponse createOrder(@Valid @RequestBody CreateOrderRequest request) {
        return orderService.create(request);
    }

    @GetMapping("/orders/{id}")
    public OrderResponse getOrder(@PathVariable Long id) {
        return orderService.get(id);
    }

    @PatchMapping("/orders/{id}/status")
    public OrderResponse updateStatus(
            @PathVariable Long id, @Valid @RequestBody UpdateOrderStatusRequest request) {
        return orderService.updateStatus(id, request);
    }
}

@RestControllerAdvice
class ApiExceptionHandler {

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<Map<String, Object>> handleValidation(MethodArgumentNotValidException ex) {
        String message = ex.getBindingResult().getFieldErrors().stream()
                .findFirst()
                .map(e -> e.getField() + ": " + e.getDefaultMessage())
                .orElse("validation failed");
        return ResponseEntity.badRequest().body(error("VALIDATION_ERROR", message, 400));
    }

    @ExceptionHandler(ResponseStatusException.class)
    public ResponseEntity<Map<String, Object>> handleResponseStatus(ResponseStatusException ex) {
        int code = ex.getStatusCode().value();
        return ResponseEntity.status(ex.getStatusCode())
                .body(error("HTTP_" + code, ex.getReason(), code));
    }

    private static Map<String, Object> error(String code, String message, int status) {
        return Map.of(
                "code", code,
                "message", message == null ? "" : message,
                "status", status,
                "timestamp", Instant.now().toString()
        );
    }
}
