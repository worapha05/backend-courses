package com.bootcamp.expert.tenant.web;

import com.bootcamp.expert.tenant.domain.DocumentEntity;
import com.bootcamp.expert.tenant.service.DocumentService;
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
public class DocumentController {

    private final DocumentService documentService;

    public DocumentController(DocumentService documentService) {
        this.documentService = documentService;
    }

    public record CreateDocumentRequest(String title) {}

    @PostMapping("/documents")
    @ResponseStatus(HttpStatus.CREATED)
    public DocumentEntity create(@RequestBody CreateDocumentRequest request) {
        return documentService.create(request.title());
    }

    @GetMapping("/documents")
    public List<DocumentEntity> list() {
        return documentService.list();
    }

    @GetMapping("/documents/{id}")
    public DocumentEntity get(@PathVariable Long id) {
        return documentService.get(id);
    }

    @GetMapping("/health")
    public Map<String, String> health() {
        return Map.of("status", "UP");
    }
}
