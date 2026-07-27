package com.bootcamp.expert.ops.web;

import com.bootcamp.expert.ops.audit.AuditAspect;
import com.bootcamp.expert.ops.audit.Audited;
import com.bootcamp.expert.ops.export.OrderExcelExporter;
import com.bootcamp.expert.ops.export.OrderExcelExporter.ExportJob;
import com.bootcamp.expert.ops.export.OrderExcelExporter.OrderRow;
import java.math.BigDecimal;
import java.nio.file.Files;
import java.util.List;
import java.util.Map;
import org.springframework.core.io.FileSystemResource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class OpsController {

    private final OrderExcelExporter exporter;
    private final AuditAspect auditAspect;

    public OpsController(OrderExcelExporter exporter, AuditAspect auditAspect) {
        this.exporter = exporter;
        this.auditAspect = auditAspect;
    }

    @Audited(action = "EXPORT_ORDERS")
    @PostMapping("/exports/orders")
    public ExportJob startExport() {
        List<OrderRow> rows = List.of(
                new OrderRow("o-1", "Acme", new BigDecimal("1200.50")),
                new OrderRow("o-2", "Globex", new BigDecimal("880.00")),
                new OrderRow("o-3", "Initech", new BigDecimal("450.25"))
        );
        return exporter.start(rows);
    }

    @GetMapping("/exports/{jobId}")
    public ExportJob status(@PathVariable String jobId) {
        return exporter.get(jobId);
    }

    @GetMapping("/exports/{jobId}/file")
    public ResponseEntity<FileSystemResource> download(@PathVariable String jobId) throws Exception {
        ExportJob job = exporter.get(jobId);
        if (job == null || job.status() != OrderExcelExporter.JobStatus.DONE || job.file() == null) {
            return ResponseEntity.notFound().build();
        }
        FileSystemResource resource = new FileSystemResource(job.file());
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=orders.xlsx")
                .contentType(MediaType.parseMediaType(
                        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"))
                .contentLength(Files.size(job.file()))
                .body(resource);
    }

    @GetMapping("/audit")
    public List<Map<String, Object>> audit() {
        return auditAspect.entries();
    }
}
