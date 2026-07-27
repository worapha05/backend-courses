package com.bootcamp.beginner.lab.web;

import com.bootcamp.beginner.lab.domain.Product;
import com.bootcamp.beginner.lab.domain.QuoteRequest;
import com.bootcamp.beginner.lab.domain.QuoteResult;
import com.bootcamp.beginner.lab.service.CatalogService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;
import java.util.List;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class CatalogController {

    private final CatalogService catalogService;

    public CatalogController(CatalogService catalogService) {
        this.catalogService = catalogService;
    }

    public record CreateProductRequest(
            @NotBlank String sku,
            @NotBlank String name,
            @NotBlank String category,
            @NotNull @DecimalMin("0.0") BigDecimal basePrice,
            @NotBlank String currency
    ) {}

    @GetMapping("/health")
    public Map<String, String> health() {
        return Map.of("status", "UP");
    }

    @GetMapping("/products")
    public List<Product> list() {
        return catalogService.list();
    }

    @GetMapping("/products/{sku}")
    public Product get(@PathVariable String sku) {
        return catalogService.get(sku);
    }

    @PostMapping("/products")
    @ResponseStatus(HttpStatus.CREATED)
    public Product create(@Valid @RequestBody CreateProductRequest req) {
        return catalogService.create(new Product(
                req.sku(), req.name(), req.category(), req.basePrice(), req.currency()));
    }

    @PostMapping("/quotes")
    public QuoteResult quote(@RequestBody QuoteRequest request) {
        return catalogService.quote(request);
    }
}
