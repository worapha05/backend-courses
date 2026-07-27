package com.bootcamp.intermediate.lab.service;

import com.bootcamp.intermediate.lab.dto.CreateProductRequest;
import com.bootcamp.intermediate.lab.dto.ProductResponse;
import com.bootcamp.intermediate.lab.entity.ProductEntity;
import com.bootcamp.intermediate.lab.repository.ProductRepository;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
public class ProductService {

    private final ProductRepository productRepository;

    public ProductService(ProductRepository productRepository) {
        this.productRepository = productRepository;
    }

    @Transactional
    public ProductResponse create(CreateProductRequest request) {
        if (productRepository.existsBySku(request.sku())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "sku already exists");
        }
        ProductEntity saved = productRepository.save(
                new ProductEntity(request.sku(), request.name(), request.price()));
        return toResponse(saved);
    }

    @Transactional(readOnly = true)
    public List<ProductResponse> list() {
        return productRepository.findAll().stream().map(this::toResponse).toList();
    }

    private ProductResponse toResponse(ProductEntity product) {
        return new ProductResponse(product.getId(), product.getSku(), product.getName(), product.getPrice());
    }
}
