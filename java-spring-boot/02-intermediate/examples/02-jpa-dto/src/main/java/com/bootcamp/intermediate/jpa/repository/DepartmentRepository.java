package com.bootcamp.intermediate.jpa.repository;

import com.bootcamp.intermediate.jpa.entity.DepartmentEntity;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface DepartmentRepository extends JpaRepository<DepartmentEntity, Long> {

    @Query("""
            select distinct d from DepartmentEntity d
            left join fetch d.employees e
            left join fetch e.skills
            where d.id = :id
            """)
    Optional<DepartmentEntity> findDetailedById(@Param("id") Long id);
}
