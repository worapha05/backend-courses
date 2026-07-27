package com.bootcamp.expert.security.web;

import com.nimbusds.jose.JOSEException;
import com.nimbusds.jose.JWSAlgorithm;
import com.nimbusds.jose.JWSHeader;
import com.nimbusds.jose.crypto.MACSigner;
import com.nimbusds.jwt.JWTClaimsSet;
import com.nimbusds.jwt.SignedJWT;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Date;
import java.util.List;
import java.util.Map;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class DemoTokenController {

    private final String secret;

    public DemoTokenController(@Value("${app.security.jwt-secret}") String secret) {
        this.secret = secret;
    }

    public record TokenRequest(String subject, String tenantId, List<String> roles) {}

    @PostMapping("/demo/token")
    public Map<String, String> token(@RequestBody TokenRequest request) throws JOSEException {
        Instant now = Instant.now();
        JWTClaimsSet claims = new JWTClaimsSet.Builder()
                .subject(request.subject())
                .issueTime(Date.from(now))
                .expirationTime(Date.from(now.plusSeconds(3600)))
                .claim("tenant_id", request.tenantId())
                .claim("realm_access", Map.of("roles", request.roles()))
                .build();

        SignedJWT jwt = new SignedJWT(new JWSHeader(JWSAlgorithm.HS256), claims);
        jwt.sign(new MACSigner(secret.getBytes(StandardCharsets.UTF_8)));
        return Map.of("access_token", jwt.serialize(), "token_type", "Bearer");
    }
}
