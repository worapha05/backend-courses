package com.bootcamp.intermediate.jpa.web;

import com.bootcamp.intermediate.jpa.dto.CreateDepartmentRequest;
import com.bootcamp.intermediate.jpa.dto.CreateEmployeeRequest;
import com.bootcamp.intermediate.jpa.dto.DepartmentResponse;
import com.bootcamp.intermediate.jpa.service.DepartmentService;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/departments")
public class DepartmentController {

    private final DepartmentService departmentService;

    public DepartmentController(DepartmentService departmentService) {
        this.departmentService = departmentService;
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public DepartmentResponse create(@RequestBody CreateDepartmentRequest request) {
        return departmentService.createDepartment(request);
    }

    @PostMapping("/{id}/employees")
    @ResponseStatus(HttpStatus.CREATED)
    public DepartmentResponse addEmployee(
            @PathVariable Long id, @RequestBody CreateEmployeeRequest request) {
        return departmentService.addEmployee(id, request);
    }

    @GetMapping("/{id}")
    public DepartmentResponse get(@PathVariable Long id) {
        return departmentService.get(id);
    }
}
