package com.bootcamp.expert.lab.domain.port;

public interface AuditPort {

    void record(String actor, String action, String resource);
}
