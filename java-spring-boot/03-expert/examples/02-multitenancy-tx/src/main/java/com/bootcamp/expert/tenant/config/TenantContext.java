package com.bootcamp.expert.tenant.config;

public final class TenantContext {
    private static final ThreadLocal<String> CURRENT = new ThreadLocal<>();

    private TenantContext() {}

    public static void set(String tenantId) {
        CURRENT.set(tenantId);
    }

    public static String require() {
        String tenantId = CURRENT.get();
        if (tenantId == null || tenantId.isBlank()) {
            throw new IllegalStateException("tenant_id is missing");
        }
        return tenantId;
    }

    public static void clear() {
        CURRENT.remove();
    }
}
