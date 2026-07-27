package com.bootcamp.intermediate.di.service;

import jakarta.annotation.PostConstruct;
import jakarta.annotation.PreDestroy;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

@Service
public class FormalGreetingService implements GreetingPort {

    private static final Logger log = LoggerFactory.getLogger(FormalGreetingService.class);

    @PostConstruct
    void init() {
        log.info("FormalGreetingService ready (post-construct)");
    }

    @PreDestroy
    void shutdown() {
        log.info("FormalGreetingService shutting down");
    }

    @Override
    public String greet(String name) {
        return "Good day, " + name;
    }
}
