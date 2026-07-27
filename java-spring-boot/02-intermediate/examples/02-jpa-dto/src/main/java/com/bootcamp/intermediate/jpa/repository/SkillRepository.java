package com.bootcamp.intermediate.jpa.repository;

import com.bootcamp.intermediate.jpa.entity.SkillEntity;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface SkillRepository extends JpaRepository<SkillEntity, Long> {

    Optional<SkillEntity> findByCode(String code);
}
