package com.bootcamp.expert.tenant.service;

import com.bootcamp.expert.tenant.config.TenantContext;
import com.bootcamp.expert.tenant.domain.DocumentEntity;
import com.bootcamp.expert.tenant.repository.DocumentRepository;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
public class DocumentService {

    private final DocumentRepository documentRepository;

    public DocumentService(DocumentRepository documentRepository) {
        this.documentRepository = documentRepository;
    }

    @Transactional
    public DocumentEntity create(String title) {
        String tenantId = TenantContext.require();
        return documentRepository.save(new DocumentEntity(tenantId, title));
    }

    @Transactional(readOnly = true)
    public List<DocumentEntity> list() {
        return documentRepository.findByTenantId(TenantContext.require());
    }

    @Transactional(readOnly = true)
    public DocumentEntity get(Long id) {
        return documentRepository.findByIdAndTenantId(id, TenantContext.require())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "document not found"));
    }
}
