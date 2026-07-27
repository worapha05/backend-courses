package com.bootcamp.beginner.lab.service;

import com.bootcamp.beginner.lab.domain.Product;
import java.util.List;
import java.util.Optional;

public interface ProductRepository {
    Product save(Product product);

    Optional<Product> findBySku(String sku);

    List<Product> findAll();

    boolean existsBySku(String sku);
}
