package com.bootcamp.expert.ops;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableAsync;

@EnableAsync
@SpringBootApplication
public class AsyncAuditExcelApplication {

    public static void main(String[] args) {
        SpringApplication.run(AsyncAuditExcelApplication.class, args);
    }
}
