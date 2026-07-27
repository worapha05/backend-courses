package com.bootcamp.intermediate.di.web;

import com.bootcamp.intermediate.di.service.NotificationService;
import java.util.Map;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class GreetingController {

    private final NotificationService notificationService;

    public GreetingController(NotificationService notificationService) {
        this.notificationService = notificationService;
    }

    @GetMapping("/greet")
    public Map<String, String> greet(@RequestParam(defaultValue = "Engineer") String name) {
        return Map.of("message", notificationService.welcome(name));
    }
}
