package com.smc.svms.service;

import io.jsonwebtoken.*;
import io.jsonwebtoken.security.Keys;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.security.Key;
import java.time.Instant;
import java.util.*;

@Component
@Slf4j
public class EnhancedJwtUtils {
    
    @Value("${app.jwt.secret}")
    private String jwtSecret;
    
    @Value("${app.jwt.expiration}")
    private int jwtExpirationMs;
    
    @Value("${app.jwt.refresh-expiration}")
    private int refreshExpirationMs;
    
    private Key key;
    
    @jakarta.annotation.PostConstruct
    public void init() {
        this.key = Keys.hmacShaKeyFor(jwtSecret.getBytes(java.nio.charset.StandardCharsets.UTF_8));
    }
    
    /**
     * Generate JWT token with enhanced claims
     */
    public String generateJwtToken(String username, Long userId, String email, String role, List<String> permissions) {
        
        // Create custom claims
        Map<String, Object> claims = new HashMap<>();
        claims.put("userId", userId);
        claims.put("username", username);
        claims.put("email", email);
        claims.put("role", role);
        claims.put("permissions", permissions);
        claims.put("sessionId", UUID.randomUUID().toString());
        claims.put("deviceFingerprint", generateDeviceFingerprint());
        claims.put("issuedAt", Instant.now().toString());
        claims.put("tokenVersion", "1.0");
        
        return Jwts.builder()
            .claims(claims)
            .subject(username)
            .issuedAt(new Date())
            .expiration(new Date(System.currentTimeMillis() + jwtExpirationMs))
            .signWith(key)
            .compact();
    }
    
    /**
     * Validate token with enhanced checks
     */
    public boolean validateJwtToken(String token) {
        
        try {
            Jwts.parser()
                .verifyWith((javax.crypto.SecretKey) key)
                .build()
                .parseSignedClaims(token);
            
            Claims claims = getClaimsFromToken(token);
            
            // Check token version
            String tokenVersion = claims.get("tokenVersion", String.class);
            if (!"1.0".equals(tokenVersion)) {
                return false;
            }
            
            // Check if token is blacklisted
            if (isTokenBlacklisted(token)) {
                return false;
            }
            
            // Check session validity
            if (!isSessionValid(claims)) {
                return false;
            }
            
            // Check device fingerprint
            if (!isValidDeviceFingerprint(claims)) {
                return false;
            }
            
            return true;
            
        } catch (JwtException | IllegalArgumentException e) {
            // Invalid JWT token
            return false;
        }
    }
    
    /**
     * Extract user ID from token
     */
    public Long getUserIdFromToken(String token) {
        Claims claims = getClaimsFromToken(token);
        return claims.get("userId", Long.class);
    }
    
    /**
     * Extract user role from token
     */
    public String getRoleFromToken(String token) {
        Claims claims = getClaimsFromToken(token);
        return claims.get("role", String.class);
    }
    
    /**
     * Extract permissions from token
     */
    @SuppressWarnings("unchecked")
    public List<String> getPermissionsFromToken(String token) {
        Claims claims = getClaimsFromToken(token);
        return (List<String>) claims.get("permissions");
    }
    
    /**
     * Extract session ID from token
     */
    public String getSessionIdFromToken(String token) {
        Claims claims = getClaimsFromToken(token);
        return claims.get("sessionId", String.class);
    }
    
    /**
     * Generate refresh token
     */
    public String generateRefreshToken(String username) {
        return Jwts.builder()
            .setSubject(username)
            .setIssuedAt(new Date())
            .setExpiration(new Date(System.currentTimeMillis() + refreshExpirationMs))
            .signWith(key, SignatureAlgorithm.HS512)
            .compact();
    }
    
    /**
     * Validate refresh token
     */
    public boolean validateRefreshToken(String token) {
        try {
            Jwts.parser()
                .verifyWith((javax.crypto.SecretKey) key)
                .build()
                .parseSignedClaims(token);
            return true;
        } catch (JwtException | IllegalArgumentException e) {
            // Invalid refresh token
            return false;
        }
    }
    
    /**
     * Extract username from token
     */
    public String getUsernameFromToken(String token) {
        Claims claims = getClaimsFromToken(token);
        return claims.getSubject();
    }
    
    private Claims getClaimsFromToken(String token) {
        return Jwts.parser()
            .verifyWith((javax.crypto.SecretKey) key)
            .build()
            .parseSignedClaims(token)
            .getPayload();
    }
    
    private boolean isTokenBlacklisted(String token) {
        // Check against token blacklist in Redis
        // For now, return false (not implemented)
        return false;
    }
    
    private boolean isSessionValid(Claims claims) {
        String sessionId = claims.get("sessionId", String.class);
        // Check session validity in Redis
        // For now, return true (not implemented)
        return true;
    }
    
    private boolean isValidDeviceFingerprint(Claims claims) {
        String storedFingerprint = claims.get("deviceFingerprint", String.class);
        String currentFingerprint = generateDeviceFingerprint();
        return storedFingerprint.equals(currentFingerprint);
    }
    
    private String generateDeviceFingerprint() {
        // Generate device fingerprint from user agent and other headers
        // For now, return a simple hash
        return UUID.randomUUID().toString();
    }
    
    /**
     * Get token expiration time
     */
    public Date getExpirationDateFromToken(String token) {
        Claims claims = getClaimsFromToken(token);
        return claims.getExpiration();
    }
    
    /**
     * Check if token is expired
     */
    public boolean isTokenExpired(String token) {
        try {
            Date expiration = getExpirationDateFromToken(token);
            return expiration.before(new Date());
        } catch (Exception e) {
            return true; // Assume expired if there's an error
        }
    }
    
    /**
     * Get remaining time in milliseconds
     */
    public long getRemainingTime(String token) {
        try {
            Date expiration = getExpirationDateFromToken(token);
            return expiration.getTime() - System.currentTimeMillis();
        } catch (Exception e) {
            return 0;
        }
    }
}
