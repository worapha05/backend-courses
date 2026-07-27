package com.bootcamp.intermediate.rest.service;

import com.bootcamp.intermediate.rest.dto.CreateTicketRequest;
import com.bootcamp.intermediate.rest.dto.TicketResponse;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicInteger;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

@Service
public class TicketService {

    private final Map<String, TicketResponse> store = new ConcurrentHashMap<>();
    private final AtomicInteger seq = new AtomicInteger();

    public TicketResponse create(CreateTicketRequest request) {
        String id = "TCK-" + seq.incrementAndGet();
        TicketResponse response = new TicketResponse(
                id, request.subject(), request.requesterEmail(), request.items().size());
        store.put(id, response);
        return response;
    }

    public TicketResponse get(String id) {
        TicketResponse found = store.get(id);
        if (found == null) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "ticket not found");
        }
        return found;
    }
}
