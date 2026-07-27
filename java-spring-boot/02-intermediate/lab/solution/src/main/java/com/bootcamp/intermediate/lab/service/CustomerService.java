package com.bootcamp.intermediate.lab.service;

import com.bootcamp.intermediate.lab.dto.CreateCustomerRequest;
import com.bootcamp.intermediate.lab.dto.CustomerResponse;
import com.bootcamp.intermediate.lab.entity.CustomerEntity;
import com.bootcamp.intermediate.lab.repository.CustomerRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
public class CustomerService {

    private final CustomerRepository customerRepository;

    public CustomerService(CustomerRepository customerRepository) {
        this.customerRepository = customerRepository;
    }

    @Transactional
    public CustomerResponse create(CreateCustomerRequest request) {
        if (customerRepository.existsByEmail(request.email())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "email already exists");
        }
        CustomerEntity saved = customerRepository.save(new CustomerEntity(request.name(), request.email()));
        return new CustomerResponse(saved.getId(), saved.getName(), saved.getEmail());
    }

    @Transactional(readOnly = true)
    public CustomerResponse get(Long id) {
        CustomerEntity customer = customerRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "customer not found"));
        return new CustomerResponse(customer.getId(), customer.getName(), customer.getEmail());
    }
}
