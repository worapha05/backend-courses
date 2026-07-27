package com.bootcamp.beginner.exception.web;

import com.bootcamp.beginner.exception.domain.ConflictException;
import com.bootcamp.beginner.exception.domain.NotFoundException;
import jakarta.validation.constraints.NotBlank;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/accounts")
public class AccountController {

    private final Map<String, String> store = new ConcurrentHashMap<>();

    public record CreateAccountRequest(@NotBlank String id, @NotBlank String name) {}

    public record AccountResponse(String id, String name) {}

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public AccountResponse create(@RequestBody @jakarta.validation.Valid CreateAccountRequest req) {
        if (store.putIfAbsent(req.id(), req.name()) != null) {
            throw new ConflictException("account already exists: " + req.id());
        }
        return new AccountResponse(req.id(), req.name());
    }

    @GetMapping("/{id}")
    public AccountResponse get(@PathVariable String id) {
        String name = store.get(id);
        if (name == null) {
            throw new NotFoundException("account not found: " + id);
        }
        return new AccountResponse(id, name);
    }
}
