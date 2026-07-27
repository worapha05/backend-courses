package com.bootcamp.expert.lab.config;

import com.bootcamp.expert.lab.application.ExportOrdersUseCase;
import com.bootcamp.expert.lab.application.PlaceOrderUseCase;
import com.bootcamp.expert.lab.application.QueryOrdersUseCase;
import com.bootcamp.expert.lab.domain.port.AuditPort;
import com.bootcamp.expert.lab.domain.port.ExportPort;
import com.bootcamp.expert.lab.domain.port.OrderRepositoryPort;
import java.util.concurrent.Executor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.concurrent.ThreadPoolTaskExecutor;

@Configuration
public class AppConfig {

    @Bean
    PlaceOrderUseCase placeOrderUseCase(OrderRepositoryPort orders, AuditPort audit) {
        return new PlaceOrderUseCase(orders, audit);
    }

    @Bean
    QueryOrdersUseCase queryOrdersUseCase(OrderRepositoryPort orders) {
        return new QueryOrdersUseCase(orders);
    }

    @Bean
    ExportOrdersUseCase exportOrdersUseCase(OrderRepositoryPort orders, ExportPort export, AuditPort audit) {
        return new ExportOrdersUseCase(orders, export, audit);
    }

    @Bean(name = "taskExecutor")
    Executor taskExecutor() {
        ThreadPoolTaskExecutor executor = new ThreadPoolTaskExecutor();
        executor.setCorePoolSize(2);
        executor.setMaxPoolSize(8);
        executor.setQueueCapacity(200);
        executor.setThreadNamePrefix("lab-async-");
        executor.initialize();
        return executor;
    }
}
