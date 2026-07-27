package com.bootcamp.intermediate.lab.repository;

import com.bootcamp.intermediate.lab.entity.ProductEntity;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ProductRepository extends JpaRepository<ProductEntity, Long> {

    boolean existsBySku(String sku);
}
