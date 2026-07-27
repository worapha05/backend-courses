package com.bootcamp.expert.security.web;

import java.util.Map;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class SecureApiController {

    @GetMapping("/api/me")
    public Map<String, Object> me(@AuthenticationPrincipal Jwt jwt) {
        return Map.of(
                "sub", jwt.getSubject(),
                "tenantId", jwt.getClaimAsString("tenant_id"),
                "roles", jwt.getClaim("realm_access")
        );
    }

    @GetMapping("/api/orders")
    @PreAuthorize("hasRole('ORDER_READ')")
    public Map<String, String> orders() {
        return Map.of("message", "orders visible to ORDER_READ");
    }

    @GetMapping("/api/admin/metrics")
    @PreAuthorize("hasRole('ADMIN')")
    public Map<String, Object> adminMetrics() {
        return Map.of("activeTenants", 12, "ordersToday", 340);
    }
}
