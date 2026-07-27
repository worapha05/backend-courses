package com.bootcamp.expert.tenant.repository;

import com.bootcamp.expert.tenant.domain.DocumentEntity;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface DocumentRepository extends JpaRepository<DocumentEntity, Long> {
    List<DocumentEntity> findByTenantId(String tenantId);
    Optional<DocumentEntity> findByIdAndTenantId(Long id, String tenantId);
}
