package com.bootcamp.beginner.lab.service;

import com.bootcamp.beginner.lab.domain.ConflictException;
import com.bootcamp.beginner.lab.domain.DiscountPolicy;
import com.bootcamp.beginner.lab.domain.NotFoundException;
import com.bootcamp.beginner.lab.domain.Product;
import com.bootcamp.beginner.lab.domain.QuoteLineRequest;
import com.bootcamp.beginner.lab.domain.QuoteLineResult;
import com.bootcamp.beginner.lab.domain.QuoteRequest;
import com.bootcamp.beginner.lab.domain.QuoteResult;
import com.bootcamp.beginner.lab.domain.ValidationBusinessException;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.List;
import org.springframework.stereotype.Service;

@Service
public class CatalogService {

    private final ProductRepository productRepository;

    public CatalogService(ProductRepository productRepository) {
        this.productRepository = productRepository;
    }

    public Product create(Product product) {
        validateProduct(product);
        if (productRepository.existsBySku(product.sku())) {
            throw new ConflictException("SKU already exists: " + product.sku());
        }
        return productRepository.save(product);
    }

    public List<Product> list() {
        return productRepository.findAll();
    }

    public Product get(String sku) {
        return productRepository.findBySku(sku)
                .orElseThrow(() -> new NotFoundException("product not found: " + sku));
    }

    public QuoteResult quote(QuoteRequest request) {
        if (request.customerType() == null) {
            throw new ValidationBusinessException("customerType is required");
        }
        if (request.lines() == null || request.lines().isEmpty()) {
            throw new ValidationBusinessException("lines must not be empty");
        }

        List<QuoteLineResult> lines = request.lines().stream()
                .map(this::toLineResult)
                .toList();

        BigDecimal subtotal = lines.stream()
                .map(QuoteLineResult::lineTotal)
                .reduce(BigDecimal.ZERO, BigDecimal::add)
                .setScale(2, RoundingMode.HALF_UP);

        int totalQty = request.lines().stream().mapToInt(QuoteLineRequest::quantity).sum();
        BigDecimal discount = DiscountPolicy.forCustomer(request.customerType())
                .apply(subtotal, totalQty);
        BigDecimal total = subtotal.subtract(discount).setScale(2, RoundingMode.HALF_UP);

        String currency = lines.isEmpty() ? "THB" : get(request.lines().getFirst().sku()).currency();
        return new QuoteResult(currency, subtotal, discount, total, lines);
    }

    private QuoteLineResult toLineResult(QuoteLineRequest line) {
        if (line.quantity() <= 0) {
            throw new ValidationBusinessException("quantity must be > 0 for sku " + line.sku());
        }
        Product product = get(line.sku());
        BigDecimal unit = product.basePrice().setScale(2, RoundingMode.HALF_UP);
        BigDecimal lineTotal = unit.multiply(BigDecimal.valueOf(line.quantity()))
                .setScale(2, RoundingMode.HALF_UP);
        return new QuoteLineResult(product.sku(), line.quantity(), unit, lineTotal);
    }

    private static void validateProduct(Product product) {
        if (product.sku() == null || product.sku().isBlank()) {
            throw new ValidationBusinessException("sku must not be blank");
        }
        if (product.name() == null || product.name().isBlank()) {
            throw new ValidationBusinessException("name must not be blank");
        }
        if (product.basePrice() == null || product.basePrice().signum() < 0) {
            throw new ValidationBusinessException("basePrice must be >= 0");
        }
        if (product.currency() == null || product.currency().isBlank()) {
            throw new ValidationBusinessException("currency must not be blank");
        }
    }
}
