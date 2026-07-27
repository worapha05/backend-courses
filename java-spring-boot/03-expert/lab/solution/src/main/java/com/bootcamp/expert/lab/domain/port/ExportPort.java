package com.bootcamp.expert.lab.domain.port;

import com.bootcamp.expert.lab.domain.model.Order;
import java.util.List;

public interface ExportPort {

    String startOrderExport(String tenantId, List<Order> orders);

    ExportStatus status(String jobId);

    byte[] fileBytes(String jobId);

    record ExportStatus(String jobId, String status, String error) {}
}
