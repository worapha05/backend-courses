package com.bootcamp.intermediate.jpa.service;

import com.bootcamp.intermediate.jpa.dto.CreateDepartmentRequest;
import com.bootcamp.intermediate.jpa.dto.CreateEmployeeRequest;
import com.bootcamp.intermediate.jpa.dto.DepartmentResponse;
import com.bootcamp.intermediate.jpa.dto.EmployeeResponse;
import com.bootcamp.intermediate.jpa.entity.DepartmentEntity;
import com.bootcamp.intermediate.jpa.entity.EmployeeEntity;
import com.bootcamp.intermediate.jpa.entity.SkillEntity;
import com.bootcamp.intermediate.jpa.repository.DepartmentRepository;
import com.bootcamp.intermediate.jpa.repository.SkillRepository;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
public class DepartmentService {

    private final DepartmentRepository departmentRepository;
    private final SkillRepository skillRepository;

    public DepartmentService(DepartmentRepository departmentRepository, SkillRepository skillRepository) {
        this.departmentRepository = departmentRepository;
        this.skillRepository = skillRepository;
    }

    @Transactional
    public DepartmentResponse createDepartment(CreateDepartmentRequest request) {
        DepartmentEntity saved = departmentRepository.save(new DepartmentEntity(request.name()));
        return toResponse(saved);
    }

    @Transactional
    public DepartmentResponse addEmployee(Long departmentId, CreateEmployeeRequest request) {
        DepartmentEntity department = departmentRepository.findById(departmentId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "department not found"));

        EmployeeEntity employee = new EmployeeEntity(request.fullName());
        if (request.skillCodes() != null) {
            for (String code : request.skillCodes()) {
                SkillEntity skill = skillRepository.findByCode(code)
                        .orElseGet(() -> skillRepository.save(new SkillEntity(code)));
                employee.addSkill(skill);
            }
        }
        department.addEmployee(employee);
        return toResponse(departmentRepository.findDetailedById(departmentId).orElse(department));
    }

    @Transactional(readOnly = true)
    public DepartmentResponse get(Long id) {
        return departmentRepository.findDetailedById(id)
                .map(this::toResponse)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "department not found"));
    }

    private DepartmentResponse toResponse(DepartmentEntity department) {
        List<EmployeeResponse> employees = department.getEmployees().stream()
                .map(e -> new EmployeeResponse(
                        e.getId(),
                        e.getFullName(),
                        e.getSkills().stream().map(SkillEntity::getCode).toList()))
                .toList();
        return new DepartmentResponse(department.getId(), department.getName(), employees);
    }
}
