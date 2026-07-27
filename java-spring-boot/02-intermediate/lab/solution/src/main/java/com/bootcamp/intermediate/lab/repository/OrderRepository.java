package com.bootcamp.intermediate.lab.repository;

import com.bootcamp.intermediate.lab.entity.OrderEntity;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface OrderRepository extends JpaRepository<OrderEntity, Long> {

    @Query("""
            select distinct o from OrderEntity o
            join fetch o.customer
            left join fetch o.items i
            left join fetch i.product
            where o.id = :id
            """)
    Optional<OrderEntity> findDetailedById(@Param("id") Long id);
}
