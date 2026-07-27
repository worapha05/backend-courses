package com.bootcamp.intermediate.lab.service;

import com.bootcamp.intermediate.lab.dto.CreateOrderRequest;
import com.bootcamp.intermediate.lab.dto.OrderItemRequest;
import com.bootcamp.intermediate.lab.dto.OrderItemResponse;
import com.bootcamp.intermediate.lab.dto.OrderResponse;
import com.bootcamp.intermediate.lab.dto.UpdateOrderStatusRequest;
import com.bootcamp.intermediate.lab.entity.CustomerEntity;
import com.bootcamp.intermediate.lab.entity.OrderEntity;
import com.bootcamp.intermediate.lab.entity.OrderItemEntity;
import com.bootcamp.intermediate.lab.entity.OrderStatus;
import com.bootcamp.intermediate.lab.entity.ProductEntity;
import com.bootcamp.intermediate.lab.repository.CustomerRepository;
import com.bootcamp.intermediate.lab.repository.OrderRepository;
import com.bootcamp.intermediate.lab.repository.ProductRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
public class OrderService {

    private final OrderRepository orderRepository;
    private final CustomerRepository customerRepository;
    private final ProductRepository productRepository;

    public OrderService(
            OrderRepository orderRepository,
            CustomerRepository customerRepository,
            ProductRepository productRepository) {
        this.orderRepository = orderRepository;
        this.customerRepository = customerRepository;
        this.productRepository = productRepository;
    }

    @Transactional
    public OrderResponse create(CreateOrderRequest request) {
        CustomerEntity customer = customerRepository.findById(request.customerId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "customer not found"));

        OrderEntity order = new OrderEntity(customer);
        for (OrderItemRequest line : request.items()) {
            ProductEntity product = productRepository.findById(line.productId())
                    .orElseThrow(() -> new ResponseStatusException(
                            HttpStatus.NOT_FOUND, "product not found: " + line.productId()));
            order.addItem(new OrderItemEntity(product, line.quantity(), product.getPrice()));
        }
        order.recalculateTotal();
        OrderEntity saved = orderRepository.save(order);
        return toResponse(orderRepository.findDetailedById(saved.getId()).orElse(saved));
    }

    @Transactional(readOnly = true)
    public OrderResponse get(Long id) {
        return orderRepository.findDetailedById(id)
                .map(this::toResponse)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "order not found"));
    }

    @Transactional
    public OrderResponse updateStatus(Long id, UpdateOrderStatusRequest request) {
        OrderEntity order = orderRepository.findDetailedById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "order not found"));
        assertTransition(order.getStatus(), request.status());
        order.setStatus(request.status());
        return toResponse(order);
    }

    private static void assertTransition(OrderStatus from, OrderStatus to) {
        boolean ok = switch (from) {
            case PENDING -> to == OrderStatus.PAID || to == OrderStatus.CANCELLED;
            case PAID -> to == OrderStatus.SHIPPED || to == OrderStatus.CANCELLED;
            case SHIPPED, CANCELLED -> false;
        };
        if (!ok) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT, "illegal status transition: " + from + " -> " + to);
        }
    }

    private OrderResponse toResponse(OrderEntity order) {
        return new OrderResponse(
                order.getId(),
                order.getCustomer().getId(),
                order.getCustomer().getName(),
                order.getStatus(),
                order.getTotalAmount(),
                order.getItems().stream()
                        .map(i -> new OrderItemResponse(
                                i.getProduct().getId(),
                                i.getProduct().getSku(),
                                i.getQuantity(),
                                i.getUnitPrice(),
                                i.lineTotal()))
                        .toList()
        );
    }
}
