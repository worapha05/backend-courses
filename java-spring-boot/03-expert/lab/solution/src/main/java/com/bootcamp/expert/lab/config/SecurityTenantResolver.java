package com.bootcamp.expert.lab.config;

import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Component;

@Component
public class SecurityTenantResolver {

    public String requireTenantId() {
        Jwt jwt = currentJwt();
        String tenantId = jwt.getClaimAsString("tenant_id");
        if (tenantId == null || tenantId.isBlank()) {
            throw new IllegalStateException("tenant_id claim missing");
        }
        return tenantId;
    }

    public String requireSubject() {
        return currentJwt().getSubject();
    }

    private Jwt currentJwt() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !(auth.getPrincipal() instanceof Jwt jwt)) {
            throw new IllegalStateException("JWT authentication required");
        }
        return jwt;
    }
}
