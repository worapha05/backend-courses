package com.bootcamp.expert.ops.audit;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.concurrent.CopyOnWriteArrayList;
import org.aspectj.lang.ProceedingJoinPoint;
import org.aspectj.lang.annotation.Around;
import org.aspectj.lang.annotation.Aspect;
import org.springframework.stereotype.Component;

@Aspect
@Component
public class AuditAspect {

    private final List<Map<String, Object>> entries = new CopyOnWriteArrayList<>();

    @Around("@annotation(audited)")
    public Object around(ProceedingJoinPoint pjp, Audited audited) throws Throwable {
        Instant started = Instant.now();
        Object result = pjp.proceed();
        entries.add(Map.of(
                "action", audited.action(),
                "method", pjp.getSignature().toShortString(),
                "at", started.toString()
        ));
        return result;
    }

    public List<Map<String, Object>> entries() {
        return List.copyOf(entries);
    }
}
