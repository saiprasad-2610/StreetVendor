package com.smc.svms.service;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.HashMap;
import java.util.Map;
import java.util.concurrent.TimeUnit;

// @Component // Disabled to prevent Redis connection errors
public class RateLimitingFilter extends OncePerRequestFilter {
    
    private static final org.slf4j.Logger log = org.slf4j.LoggerFactory.getLogger(RateLimitingFilter.class);
    
    private final RedisTemplate<String, String> redisTemplate;
    
    private final Map<String, RateLimitConfig> endpointConfigs = new HashMap<>();
    
    public RateLimitingFilter(RedisTemplate<String, String> redisTemplate) {
        this.redisTemplate = redisTemplate;
        // Configure rate limits for different endpoints
        endpointConfigs.put("/api/auth/login", new RateLimitConfig(5, 60)); // 5 attempts per minute
        endpointConfigs.put("/api/scan/validate", new RateLimitConfig(100, 60)); // 100 scans per minute
        endpointConfigs.put("/api/public/**", new RateLimitConfig(1000, 60)); // 1000 requests per minute
        endpointConfigs.put("/api/citizen-reports/submit", new RateLimitConfig(3, 300)); // 3 reports per 5 minutes
        endpointConfigs.put("/api/**", new RateLimitConfig(500, 60)); // 500 requests per minute
    }
    
    @Override
    protected void doFilterInternal(jakarta.servlet.http.HttpServletRequest request, jakarta.servlet.http.HttpServletResponse response, jakarta.servlet.FilterChain filterChain) 
            throws jakarta.servlet.ServletException, IOException {
        
        String endpoint = request.getRequestURI();
        String clientIp = getClientIpAddress(request);
        
        RateLimitConfig config = findRateLimitConfig(endpoint);
        
        if (config != null) {
            String key = "rate_limit:" + endpoint + ":" + clientIp;
            try {
                Long count = redisTemplate.opsForValue().increment(key);
                
                if (count != null && count == 1) {
                    redisTemplate.expire(key, config.getTimeWindowSeconds(), TimeUnit.SECONDS);
                }
                
                if (count != null && count > config.getMaxRequests()) {
                    response.setStatus(HttpStatus.TOO_MANY_REQUESTS.value());
                    response.getWriter().write("Too many requests. Please try again later.");
                    return;
                }
            } catch (Exception e) {
                log.warn("Redis unavailable for rate limiting on endpoint {}. Skipping rate limit check.", endpoint, e);
            }
        }
        
        filterChain.doFilter(request, response);
    }
    
    private boolean isRateLimited(String key, RateLimitConfig config) {
        
        try {
            // Get current count
            String countStr = redisTemplate.opsForValue().get(key);
            int currentCount = countStr != null ? Integer.parseInt(countStr) : 0;
            
            if (currentCount >= config.getMaxRequests()) {
                return true;
            }
            
            // Increment counter
            if (currentCount == 0) {
                // First request - set with expiration
                redisTemplate.opsForValue().set(key, "1", config.getTimeWindowSeconds(), TimeUnit.SECONDS);
            } else {
                // Increment existing counter
                redisTemplate.opsForValue().increment(key);
            }
            
            return false;
            
        } catch (Exception e) {
            log.error("Failed to check rate limit", e);
            return false;
        }
    }
    
    private void handleRateLimitExceeded(HttpServletResponse response, String clientIp, String endpoint) {
        
        response.setStatus(HttpStatus.TOO_MANY_REQUESTS.value());
        response.setContentType("application/json");
        
        try {
            response.getWriter().write("""
                {
                    "error": "Rate limit exceeded",
                    "message": "Too many requests. Please try again later.",
                    "endpoint": "%s",
                    "retryAfter": 60
                }
                """.formatted(endpoint));
        } catch (IOException e) {
            log.error("Failed to write rate limit response", e);
        }
        
        // Log rate limit exceeded
        log.warn("Rate limit exceeded for IP: {} on endpoint: {}", clientIp, endpoint);
    }
    
    private String getClientIpAddress(jakarta.servlet.http.HttpServletRequest request) {
        
        String xForwardedFor = request.getHeader("X-Forwarded-For");
        if (xForwardedFor != null && !xForwardedFor.isEmpty()) {
            return xForwardedFor.split(",")[0].trim();
        }
        
        String xRealIp = request.getHeader("X-Real-IP");
        if (xRealIp != null && !xRealIp.isEmpty()) {
            return xRealIp;
        }
        
        return request.getRemoteAddr();
    }
    
    private RateLimitConfig findRateLimitConfig(String endpoint) {
        
        // Exact match first
        if (endpointConfigs.containsKey(endpoint)) {
            return endpointConfigs.get(endpoint);
        }
        
        // Pattern matching
        for (Map.Entry<String, RateLimitConfig> entry : endpointConfigs.entrySet()) {
            if (entry.getKey().endsWith("/**")) {
                String pattern = entry.getKey().substring(0, entry.getKey().length() - 3);
                if (endpoint.startsWith(pattern)) {
                    return entry.getValue();
                }
            }
        }
        
        return endpointConfigs.get("/api/**"); // Default
    }
    
    static class RateLimitConfig {
        private int maxRequests;
        private int timeWindowSeconds;
        
        public RateLimitConfig(int maxRequests, int timeWindowSeconds) {
            this.maxRequests = maxRequests;
            this.timeWindowSeconds = timeWindowSeconds;
        }
        
        public int getMaxRequests() { return maxRequests; }
        public int getTimeWindowSeconds() { return timeWindowSeconds; }
    }
}
