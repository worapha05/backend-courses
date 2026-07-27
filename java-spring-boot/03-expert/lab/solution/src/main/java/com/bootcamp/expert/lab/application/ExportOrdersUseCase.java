package com.bootcamp.expert.lab.application;

import com.bootcamp.expert.lab.domain.model.Order;
import com.bootcamp.expert.lab.domain.port.AuditPort;
import com.bootcamp.expert.lab.domain.port.ExportPort;
import com.bootcamp.expert.lab.domain.port.OrderRepositoryPort;
import java.util.List;

public class ExportOrdersUseCase {

    private final OrderRepositoryPort orderRepository;
    private final ExportPort exportPort;
    private final AuditPort auditPort;

    public ExportOrdersUseCase(
            OrderRepositoryPort orderRepository, ExportPort exportPort, AuditPort auditPort) {
        this.orderRepository = orderRepository;
        this.exportPort = exportPort;
        this.auditPort = auditPort;
    }

    public String start(String tenantId, String actor) {
        List<Order> orders = orderRepository.findAllByTenant(tenantId);
        String jobId = exportPort.startOrderExport(tenantId, orders);
        auditPort.record(actor, "ORDER_EXPORT", jobId);
        return jobId;
    }
}
