package com.bootcamp.intermediate.di.service;

import org.springframework.stereotype.Service;

@Service
public class NotificationService {

    private final GreetingPort greetingPort;

    public NotificationService(GreetingPort greetingPort) {
        this.greetingPort = greetingPort;
    }

    public String welcome(String name) {
        return greetingPort.greet(name) + " — your account is ready.";
    }
}
