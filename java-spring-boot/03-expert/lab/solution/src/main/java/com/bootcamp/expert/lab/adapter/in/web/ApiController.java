package com.bootcamp.expert.lab.adapter.in.web;

import com.bootcamp.expert.lab.application.ExportOrdersUseCase;
import com.bootcamp.expert.lab.application.PlaceOrderUseCase;
import com.bootcamp.expert.lab.application.QueryOrdersUseCase;
import com.bootcamp.expert.lab.audit.JpaAuditAdapter;
import com.bootcamp.expert.lab.config.SecurityTenantResolver;
import com.bootcamp.expert.lab.domain.model.Order;
import com.bootcamp.expert.lab.domain.model.OrderLine;
import com.bootcamp.expert.lab.domain.port.ExportPort;
import jakarta.validation.Valid;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;
import java.util.List;
import java.util.Map;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

@RestController
public class ApiController {

    private final PlaceOrderUseCase placeOrderUseCase;
    private final QueryOrdersUseCase queryOrdersUseCase;
    private final ExportOrdersUseCase exportOrdersUseCase;
    private final ExportPort exportPort;
    private final JpaAuditAdapter auditAdapter;
    private final SecurityTenantResolver tenantResolver;

    public ApiController(
            PlaceOrderUseCase placeOrderUseCase,
            QueryOrdersUseCase queryOrdersUseCase,
            ExportOrdersUseCase exportOrdersUseCase,
            ExportPort exportPort,
            JpaAuditAdapter auditAdapter,
            SecurityTenantResolver tenantResolver) {
        this.placeOrderUseCase = placeOrderUseCase;
        this.queryOrdersUseCase = queryOrdersUseCase;
        this.exportOrdersUseCase = exportOrdersUseCase;
        this.exportPort = exportPort;
        this.auditAdapter = auditAdapter;
        this.tenantResolver = tenantResolver;
    }

    public record LineRequest(
            @NotBlank String sku,
            @Min(1) int quantity,
            @NotNull @DecimalMin("0.0") BigDecimal unitPrice
    ) {}

    public record CreateOrderRequest(
            @NotBlank String customerName,
            @NotEmpty @Valid List<LineRequest> lines
    ) {}

    public record LineResponse(String sku, int quantity, BigDecimal unitPrice, BigDecimal lineTotal) {}

    public record OrderResponse(
            String id, String tenantId, String customerName, BigDecimal total, List<LineResponse> lines
    ) {}

    @GetMapping("/api/health")
    public Map<String, String> health() {
        return Map.of("status", "UP");
    }

    @PostMapping("/api/orders")
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasRole('ORDER_WRITE')")
    public OrderResponse create(@Valid @RequestBody CreateOrderRequest request) {
        String tenantId = tenantResolver.requireTenantId();
        String actor = tenantResolver.requireSubject();
        Order order = placeOrderUseCase.execute(new PlaceOrderUseCase.Command(
                tenantId,
                actor,
                request.customerName(),
                request.lines().stream()
                        .map(l -> new PlaceOrderUseCase.LineCmd(l.sku(), l.quantity(), l.unitPrice()))
                        .toList()
        ));
        return toResponse(order);
    }

    @GetMapping("/api/orders")
    @PreAuthorize("hasRole('ORDER_READ')")
    public List<OrderResponse> list() {
        return queryOrdersUseCase.list(tenantResolver.requireTenantId()).stream()
                .map(this::toResponse)
                .toList();
    }

    @GetMapping("/api/orders/{id}")
    @PreAuthorize("hasRole('ORDER_READ')")
    public OrderResponse get(@PathVariable String id) {
        return queryOrdersUseCase.get(tenantResolver.requireTenantId(), id)
                .map(this::toResponse)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "order not found"));
    }

    @PostMapping("/api/exports/orders")
    @PreAuthorize("hasRole('ORDER_EXPORT')")
    public Map<String, String> export() {
        String jobId = exportOrdersUseCase.start(
                tenantResolver.requireTenantId(), tenantResolver.requireSubject());
        return Map.of("jobId", jobId, "status", "PENDING");
    }

    @GetMapping("/api/exports/{jobId}")
    @PreAuthorize("hasRole('ORDER_EXPORT')")
    public ExportPort.ExportStatus exportStatus(@PathVariable String jobId) {
        return exportPort.status(jobId);
    }

    @GetMapping("/api/exports/{jobId}/file")
    @PreAuthorize("hasRole('ORDER_EXPORT')")
    public ResponseEntity<byte[]> download(@PathVariable String jobId) {
        byte[] bytes = exportPort.fileBytes(jobId);
        if (bytes == null) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "export not ready");
        }
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=orders.xlsx")
                .contentType(MediaType.parseMediaType(
                        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"))
                .body(bytes);
    }

    @GetMapping("/api/admin/audit")
    @PreAuthorize("hasRole('ADMIN')")
    public List<JpaAuditAdapter.AuditView> audit() {
        return auditAdapter.list();
    }

    private OrderResponse toResponse(Order order) {
        List<LineResponse> lines = order.lines().stream().map(this::toLine).toList();
        return new OrderResponse(order.id(), order.tenantId(), order.customerName(), order.total(), lines);
    }

    private LineResponse toLine(OrderLine line) {
        return new LineResponse(line.sku(), line.quantity(), line.unitPrice(), line.lineTotal());
    }
}
