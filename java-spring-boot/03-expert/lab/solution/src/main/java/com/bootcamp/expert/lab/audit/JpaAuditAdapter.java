package com.bootcamp.expert.lab.audit;

import com.bootcamp.expert.lab.domain.port.AuditPort;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Component;
import org.springframework.stereotype.Repository;

@Entity
@Table(name = "audit_entries")
class AuditEntryEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String actor;

    @Column(nullable = false)
    private String action;

    @Column(nullable = false)
    private String resource;

    @Column(nullable = false)
    private Instant createdAt;

    protected AuditEntryEntity() {}

    AuditEntryEntity(String actor, String action, String resource) {
        this.actor = actor;
        this.action = action;
        this.resource = resource;
        this.createdAt = Instant.now();
    }

    Long getId() {
        return id;
    }

    String getActor() {
        return actor;
    }

    String getAction() {
        return action;
    }

    String getResource() {
        return resource;
    }

    Instant getCreatedAt() {
        return createdAt;
    }
}

@Repository
interface AuditEntryJpaRepository extends JpaRepository<AuditEntryEntity, Long> {}

@Component
public class JpaAuditAdapter implements AuditPort {

    private final AuditEntryJpaRepository repository;

    public JpaAuditAdapter(AuditEntryJpaRepository repository) {
        this.repository = repository;
    }

    @Override
    public void record(String actor, String action, String resource) {
        repository.save(new AuditEntryEntity(actor, action, resource));
    }

    public List<AuditView> list() {
        return repository.findAll().stream()
                .map(e -> new AuditView(e.getId(), e.getActor(), e.getAction(), e.getResource(), e.getCreatedAt().toString()))
                .toList();
    }

    public record AuditView(Long id, String actor, String action, String resource, String createdAt) {}
}
