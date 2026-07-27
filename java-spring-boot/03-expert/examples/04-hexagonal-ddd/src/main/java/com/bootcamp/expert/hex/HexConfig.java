package com.bootcamp.expert.hex;

import com.bootcamp.expert.hex.application.PlaceOrderUseCase;
import com.bootcamp.expert.hex.domain.port.OrderRepositoryPort;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class HexConfig {

    @Bean
    PlaceOrderUseCase placeOrderUseCase(OrderRepositoryPort orderRepositoryPort) {
        return new PlaceOrderUseCase(orderRepositoryPort);
    }
}
