package com.smc.svms.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.concurrent.TimeUnit;

@Service
@RequiredArgsConstructor
public class LoginAttemptService {
    
    private static final org.slf4j.Logger log = org.slf4j.LoggerFactory.getLogger(LoginAttemptService.class);
    
    private final RedisTemplate<String, String> redisTemplate;
    
    private static final int MAX_ATTEMPTS = 5;
    private static final int BLOCK_DURATION_MINUTES = 15;
    private static final int ATTEMPT_WINDOW_MINUTES = 5;
    
    /**
     * Record failed login attempt
     */
    public void recordFailedAttempt(String username) {
        
        String key = "login_attempts:" + username;
        String blockKey = "login_blocked:" + username;
        
        try {
            // Increment attempt count
            Long attempts = redisTemplate.opsForValue().increment(key);
            
            // Set expiration for attempt counter
            redisTemplate.expire(key, ATTEMPT_WINDOW_MINUTES, TimeUnit.MINUTES);
            
            // Block if max attempts reached
            if (attempts >= MAX_ATTEMPTS) {
                redisTemplate.opsForValue().set(blockKey, "true");
                redisTemplate.expire(blockKey, BLOCK_DURATION_MINUTES, TimeUnit.MINUTES);
                
                log.warn("User {} blocked due to {} failed attempts", username, attempts);
            }
            
        } catch (Exception e) {
            log.error("Failed to record login attempt for user: {}", username, e);
        }
    }
    
    /**
     * Check if user is blocked
     */
    public boolean isBlocked(String username) {
        
        String blockKey = "login_blocked:" + username;
        
        try {
            String isBlocked = redisTemplate.opsForValue().get(blockKey);
            return "true".equals(isBlocked);
        } catch (Exception e) {
            log.error("Failed to check block status for user: {}", username, e);
            return false;
        }
    }
    
    /**
     * Reset failed attempts on successful login
     */
    public void resetFailedAttempts(String username) {
        
        String key = "login_attempts:" + username;
        String blockKey = "login_blocked:" + username;
        
        try {
            redisTemplate.delete(key);
            redisTemplate.delete(blockKey);
        } catch (Exception e) {
            log.error("Failed to reset login attempts for user: {}", username, e);
        }
    }
    
    /**
     * Get remaining attempts
     */
    public int getRemainingAttempts(String username) {
        
        String key = "login_attempts:" + username;
        
        try {
            String attemptsStr = redisTemplate.opsForValue().get(key);
            int attempts = attemptsStr != null ? Integer.parseInt(attemptsStr) : 0;
            return Math.max(0, MAX_ATTEMPTS - attempts);
        } catch (Exception e) {
            log.error("Failed to get remaining attempts for user: {}", username, e);
            return MAX_ATTEMPTS;
        }
    }
    
    /**
     * Get block duration remaining in minutes
     */
    public long getBlockDurationRemaining(String username) {
        
        String blockKey = "login_blocked:" + username;
        
        try {
            Long ttl = redisTemplate.getExpire(blockKey, TimeUnit.MINUTES);
            return ttl != null && ttl > 0 ? ttl : 0;
        } catch (Exception e) {
            log.error("Failed to get block duration for user: {}", username, e);
            return 0;
        }
    }
    
    /**
     * Check if user has recent failed attempts
     */
    public boolean hasRecentFailedAttempts(String username) {
        
        String key = "login_attempts:" + username;
        
        try {
            String attemptsStr = redisTemplate.opsForValue().get(key);
            return attemptsStr != null && Integer.parseInt(attemptsStr) > 0;
        } catch (Exception e) {
            log.error("Failed to check recent attempts for user: {}", username, e);
            return false;
        }
    }
}
