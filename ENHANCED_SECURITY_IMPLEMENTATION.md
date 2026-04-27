# 🔐 Enhanced Security Implementation

## 📋 Practical Security Enhancements for SMC

### 1. Enhanced Authentication & Authorization

```java
@Configuration
@EnableWebSecurity
@EnableMethodSecurity(prePostEnabled = true)
public class EnhancedSecurityConfig {
    
    @Autowired
    private CustomUserDetailsService userDetailsService;
    
    @Autowired
    private JwtAuthenticationFilter jwtAuthFilter;
    
    @Autowired
    private RateLimitingFilter rateLimitingFilter;
    
    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        
        http
            .csrf(csrf -> csrf.disable())
            .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .authorizeHttpRequests(auth -> auth
                // Public endpoints with rate limiting
                .requestMatchers("/api/public/**").permitAll()
                .requestMatchers("/api/auth/login").permitAll()
                .requestMatchers("/api/auth/register").permitAll()
                .requestMatchers("/api/scan/validate").permitAll()
                .requestMatchers("/api/citizen-reports/submit").permitAll()
                
                // Role-based access
                .requestMatchers("/api/admin/**").hasRole("ADMIN")
                .requestMatchers("/api/officer/**").hasAnyRole("OFFICER", "ADMIN")
                .requestMatchers("/api/vendor/**").hasAnyRole("VENDOR", "ADMIN")
                .requestMatchers("/api/citizen/**").hasAnyRole("CITIZEN", "PUBLIC", "ADMIN")
                
                // API endpoints
                .requestMatchers("/api/**").authenticated()
                .anyRequest().denyAll()
            )
            .userDetailsService(userDetailsService)
            .addFilterBefore(rateLimitingFilter, UsernamePasswordAuthenticationFilter.class)
            .addFilterBefore(jwtAuthFilter, UsernamePasswordAuthenticationFilter.class)
            .exceptionHandling(ex -> ex
                .authenticationEntryPoint(new JwtAuthenticationEntryPoint())
                .accessDeniedHandler(new CustomAccessDeniedHandler())
            )
            .headers(headers -> headers
                .frameOptions().deny()
                .contentTypeOptions().and()
                .httpStrictTransportSecurity(hstsConfig -> hstsConfig
                    .maxAgeInSeconds(31536000)
                    .includeSubdomains(true)
                    .preload(true)
                )
                .contentSecurityPolicy(cspConfig -> cspConfig
                    .policyDirectives("default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' wss: https:; media-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none';")
                )
                .referrerPolicy(ReferrerPolicyHeaderWriter.ReferrerPolicy.STRICT_ORIGIN_WHEN_CROSS_ORIGIN)
                .permissionsPolicy(permissions -> permissions
                    .policy("camera=(), microphone=(), geolocation=(), payment=()")
                )
            );
        
        return http.build();
    }
    
    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder(12);
    }
}

@Service
public class CustomUserDetailsService implements UserDetailsService {
    
    @Autowired
    private UserRepository userRepository;
    
    @Autowired
    private LoginAttemptService loginAttemptService;
    
    @Override
    public UserDetails loadUserByUsername(String username) throws UsernameNotFoundException {
        
        // Check for brute force attempts
        if (loginAttemptService.isBlocked(username)) {
            loginAttemptService.recordFailedAttempt(username);
            throw new UsernameNotFoundException("Account temporarily locked due to multiple failed attempts");
        }
        
        User user = userRepository.findByUsername(username)
            .orElseThrow(() -> {
                loginAttemptService.recordFailedAttempt(username);
                return new UsernameNotFoundException("User not found");
            });
        
        // Check account status
        if (!user.isEnabled()) {
            throw new DisabledException("Account is disabled");
        }
        
        if (user.isAccountLocked()) {
            throw new LockedException("Account is locked");
        }
        
        // Check session timeout
        if (user.isSessionExpired()) {
            throw new CredentialsExpiredException("Session expired");
        }
        
        // Reset failed attempts on successful login
        loginAttemptService.resetFailedAttempts(username);
        
        return UserPrincipal.create(user);
    }
}
```

### 2. Advanced JWT Security

```java
@Component
public class EnhancedJwtUtils {
    
    @Value("${app.jwt.secret}")
    private String jwtSecret;
    
    @Value("${app.jwt.expiration-ms}")
    private int jwtExpirationMs;
    
    @Value("${app.jwt.refresh-expiration-ms}")
    private int refreshExpirationMs;
    
    private final Key key = Keys.hmacShaKeyFor(jwtSecret.getBytes());
    
    /**
     * Generate JWT token with enhanced claims
     */
    public String generateJwtToken(Authentication authentication) {
        
        UserPrincipal userPrincipal = (UserPrincipal) authentication.getPrincipal();
        User user = userPrincipal.getUser();
        
        // Create custom claims
        Map<String, Object> claims = new HashMap<>();
        claims.put("userId", user.getId());
        claims.put("username", user.getUsername());
        claims.put("email", user.getEmail());
        claims.put("role", user.getRole().name());
        claims.put("permissions", getPermissions(user.getRole()));
        claims.put("sessionId", UUID.randomUUID().toString());
        claims.put("deviceFingerprint", generateDeviceFingerprint());
        claims.put("issuedAt", Instant.now().toString());
        claims.put("tokenVersion", "1.0");
        
        return Jwts.builder()
            .setClaims(claims)
            .setSubject(user.getUsername())
            .setIssuedAt(new Date())
            .setExpiration(new Date(System.currentTimeMillis() + jwtExpirationMs))
            .signWith(key, SignatureAlgorithm.HS512)
            .compact();
    }
    
    /**
     * Validate token with enhanced checks
     */
    public boolean validateJwtToken(String token) {
        
        try {
            Jwts.parserBuilder()
                .setSigningKey(key)
                .build()
                .parseClaimsJws(token);
            
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
            log.error("Invalid JWT token: {}", e.getMessage());
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
    
    private Claims getClaimsFromToken(String token) {
        return Jwts.parserBuilder()
            .setSigningKey(key)
            .build()
            .parseClaimsJws(token)
            .getBody();
    }
    
    private boolean isTokenBlacklisted(String token) {
        // Check against token blacklist in Redis
        return tokenBlacklistService.isBlacklisted(token);
    }
    
    private boolean isSessionValid(Claims claims) {
        String sessionId = claims.get("sessionId", String.class);
        return sessionService.isSessionValid(sessionId);
    }
    
    private boolean isValidDeviceFingerprint(Claims claims) {
        String storedFingerprint = claims.get("deviceFingerprint", String.class);
        String currentFingerprint = generateDeviceFingerprint();
        return storedFingerprint.equals(currentFingerprint);
    }
    
    private String generateDeviceFingerprint() {
        // Generate device fingerprint from user agent and other headers
        return DigestUtils.sha256Hex(
            SecurityContextHolder.getContext().getRequest().getHeader("User-Agent") +
            SecurityContextHolder.getContext().getRequest().getRemoteAddr()
        );
    }
}
```

### 3. Data Encryption & Protection

```java
@Service
public class DataEncryptionService {
    
    @Value("${encryption.key}")
    private String encryptionKey;
    
    @Value("${encryption.aadhaar.salt}")
    private String aadhaarSalt;
    
    private final AESUtil aesUtil;
    
    public DataEncryptionService() {
        this.aesUtil = new AESUtil();
    }
    
    /**
     * Encrypt sensitive data (AES-256)
     */
    public String encrypt(String plainText) {
        try {
            return aesUtil.encrypt(plainText, encryptionKey);
        } catch (Exception e) {
            throw new EncryptionException("Failed to encrypt data", e);
        }
    }
    
    /**
     * Decrypt sensitive data
     */
    public String decrypt(String encryptedText) {
        try {
            return aesUtil.decrypt(encryptedText, encryptionKey);
        } catch (Exception e) {
            throw new EncryptionException("Failed to decrypt data", e);
        }
    }
    
    /**
     * Hash Aadhaar with salt (one-way)
     */
    public String hashAadhaar(String aadhaar) {
        try {
            String saltedAadhaar = aadhaar + aadhaarSalt;
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(saltedAadhaar.getBytes(StandardCharsets.UTF_8));
            
            return bytesToHex(hash);
        } catch (Exception e) {
            throw new EncryptionException("Failed to hash Aadhaar", e);
        }
    }
    
    /**
     * Mask Aadhaar for display
     */
    public String maskAadhaar(String aadhaar) {
        if (aadhaar == null || aadhaar.length() < 4) {
            return "XXXX-XXXX-XXXX";
        }
        return "XXXX-XXXX-" + aadhaar.substring(aadhaar.length() - 4);
    }
    
    /**
     * Encrypt file data
     */
    public byte[] encryptFile(byte[] fileData) {
        try {
            return aesUtil.encryptBytes(fileData, encryptionKey);
        } catch (Exception e) {
            throw new EncryptionException("Failed to encrypt file", e);
        }
    }
    
    /**
     * Decrypt file data
     */
    public byte[] decryptFile(byte[] encryptedData) {
        try {
            return aesUtil.decryptBytes(encryptedData, encryptionKey);
        } catch (Exception e) {
            throw new EncryptionException("Failed to decrypt file", e);
        }
    }
}

@Component
public class AESUtil {
    
    private static final String ALGORITHM = "AES";
    private static final String TRANSFORMATION = "AES/CBC/PKCS5Padding";
    private static final int KEY_LENGTH = 256;
    private static final int IV_LENGTH = 16;
    
    public String encrypt(String plainText, String key) throws Exception {
        SecretKeySpec secretKey = generateKey(key);
        Cipher cipher = Cipher.getInstance(TRANSFORMATION);
        
        byte[] iv = new byte[IV_LENGTH];
        new SecureRandom().nextBytes(iv);
        IvParameterSpec ivSpec = new IvParameterSpec(iv);
        
        cipher.init(Cipher.ENCRYPT_MODE, secretKey, ivSpec);
        byte[] encrypted = cipher.doFinal(plainText.getBytes(StandardCharsets.UTF_8));
        
        // Combine IV and encrypted data
        byte[] combined = new byte[IV_LENGTH + encrypted.length];
        System.arraycopy(iv, 0, combined, 0, IV_LENGTH);
        System.arraycopy(encrypted, 0, combined, IV_LENGTH, encrypted.length);
        
        return Base64.getEncoder().encodeToString(combined);
    }
    
    public String decrypt(String encryptedText, String key) throws Exception {
        SecretKeySpec secretKey = generateKey(key);
        Cipher cipher = Cipher.getInstance(TRANSFORMATION);
        
        byte[] combined = Base64.getDecoder().decode(encryptedText);
        
        // Extract IV and encrypted data
        byte[] iv = new byte[IV_LENGTH];
        byte[] encrypted = new byte[combined.length - IV_LENGTH];
        System.arraycopy(combined, 0, iv, 0, IV_LENGTH);
        System.arraycopy(combined, IV_LENGTH, encrypted, 0, encrypted.length);
        
        IvParameterSpec ivSpec = new IvParameterSpec(iv);
        cipher.init(Cipher.DECRYPT_MODE, secretKey, ivSpec);
        
        byte[] decrypted = cipher.doFinal(encrypted);
        return new String(decrypted, StandardCharsets.UTF_8);
    }
    
    private SecretKeySpec generateKey(String key) throws Exception {
        MessageDigest sha = MessageDigest.getInstance("SHA-256");
        byte[] keyBytes = key.getBytes(StandardCharsets.UTF_8);
        keyBytes = sha.digest(keyBytes);
        keyBytes = Arrays.copyOf(keyBytes, KEY_LENGTH / 8);
        
        return new SecretKeySpec(keyBytes, ALGORITHM);
    }
}
```

### 4. Rate Limiting & Brute Force Protection

```java
@Service
public class LoginAttemptService {
    
    @Autowired
    private RedisTemplate<String, String> redisTemplate;
    
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
}

@Component
public class RateLimitingFilter extends OncePerRequestFilter {
    
    @Autowired
    private RedisTemplate<String, String> redisTemplate;
    
    private final Map<String, RateLimitConfig> endpointConfigs = new HashMap<>();
    
    @PostConstruct
    public void init() {
        // Configure rate limits for different endpoints
        endpointConfigs.put("/api/auth/login", new RateLimitConfig(5, 60)); // 5 attempts per minute
        endpointConfigs.put("/api/scan/validate", new RateLimitConfig(100, 60)); // 100 scans per minute
        endpointConfigs.put("/api/public/**", new RateLimitConfig(1000, 60)); // 1000 requests per minute
        endpointConfigs.put("/api/citizen-reports/submit", new RateLimitConfig(3, 300)); // 3 reports per 5 minutes
        endpointConfigs.put("/api/**", new RateLimitConfig(500, 60)); // 500 requests per minute
    }
    
    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, 
                                  FilterChain filterChain) throws ServletException, IOException {
        
        String clientIp = getClientIpAddress(request);
        String endpoint = request.getRequestURI();
        
        // Find matching rate limit config
        RateLimitConfig config = findRateLimitConfig(endpoint);
        
        if (config != null) {
            String key = "rate_limit:" + endpoint + ":" + clientIp;
            
            // Check rate limit
            if (isRateLimited(key, config)) {
                handleRateLimitExceeded(response, clientIp, endpoint);
                return;
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
    
    private String getClientIpAddress(HttpServletRequest request) {
        
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
    
    @Data
    @AllArgsConstructor
    private static class RateLimitConfig {
        private int maxRequests;
        private int timeWindowSeconds;
    }
}
```

### 5. Audit Logging & Security Events

```java
@Service
public class SecurityAuditService {
    
    @Autowired
    private SecurityEventRepository securityEventRepository;
    
    @Autowired
    private AuditLogRepository auditLogRepository;
    
    /**
     * Log security event
     */
    public void logSecurityEvent(SecurityEventType eventType, String username, Long userId, 
                              HttpServletRequest request, String details) {
        
        SecurityEvent event = SecurityEvent.builder()
            .eventType(eventType)
            .username(username)
            .userId(userId)
            .ipAddress(getClientIpAddress(request))
            .userAgent(request.getHeader("User-Agent"))
            .eventDetails(details)
            .isBlocked(isBlockingEvent(eventType))
            .blockedUntil(calculateBlockDuration(eventType))
            .createdAt(LocalDateTime.now())
            .build();
        
        securityEventRepository.save(event);
        
        // Trigger immediate alerts for critical events
        if (isCriticalEvent(eventType)) {
            triggerSecurityAlert(event);
        }
    }
    
    /**
     * Log API access
     */
    public void logApiAccess(String username, String endpoint, String method, 
                           String result, HttpServletRequest request) {
        
        AuditLog auditLog = AuditLog.builder()
            .username(username)
            .actionType(ActionType.API_ACCESS)
            .entityType(EntityType.API)
            .entityId(endpoint)
            .operation(method)
            .result(result)
            .ipAddress(getClientIpAddress(request))
            .userAgent(request.getHeader("User-Agent"))
            .sessionId(getCurrentSessionId())
            .riskScore(calculateApiRiskScore(endpoint, method, result))
            .isSuspicious(isSuspiciousApiAccess(endpoint, method, result))
            .createdAt(LocalDateTime.now())
            .build();
        
        auditLogRepository.save(auditLog);
    }
    
    /**
     * Log data access
     */
    public void logDataAccess(String username, String entityType, Long entityId, 
                           String operation, String result) {
        
        AuditLog auditLog = AuditLog.builder()
            .username(username)
            .actionType(ActionType.DATA_ACCESS)
            .entityType(EntityType.valueOf(entityType.toUpperCase()))
            .entityId(entityId)
            .operation(operation)
            .result(result)
            .isSuspicious(isSuspiciousDataAccess(username, entityType, operation))
            .createdAt(LocalDateTime.now())
            .build();
        
        auditLogRepository.save(auditLog);
    }
    
    /**
     * Get security analytics
     */
    public SecurityAnalytics getSecurityAnalytics(LocalDate startDate, LocalDate endDate) {
        
        // Get security events
        List<SecurityEvent> events = securityEventRepository
            .findByCreatedAtBetween(startDate.atStartOfDay(), endDate.atTime(23, 59, 59));
        
        // Get audit logs
        List<AuditLog> auditLogs = auditLogRepository
            .findByCreatedAtBetween(startDate.atStartOfDay(), endDate.atTime(23, 59, 59));
        
        // Calculate metrics
        Map<SecurityEventType, Long> eventCounts = events.stream()
            .collect(Collectors.groupingBy(SecurityEvent::getEventType, Collectors.counting()));
        
        Map<String, Long> suspiciousActivityCounts = auditLogs.stream()
            .filter(AuditLog::isSuspicious)
            .collect(Collectors.groupingBy(AuditLog::getUsername, Collectors.counting()));
        
        List<String> highRiskIPs = identifyHighRiskIPs(events);
        List<String> suspiciousUsers = identifySuspiciousUsers(auditLogs);
        
        return SecurityAnalytics.builder()
            .totalEvents(events.size())
            .eventCounts(eventCounts)
            .suspiciousActivityCounts(suspiciousActivityCounts)
            .highRiskIPs(highRiskIPs)
            .suspiciousUsers(suspiciousUsers)
            .generatedAt(LocalDateTime.now())
            .build();
    }
    
    private boolean isBlockingEvent(SecurityEventType eventType) {
        return switch (eventType) {
            case BRUTE_FORCE_BLOCKED, RATE_LIMIT_EXCEEDED, DDOS_SUSPECTED -> true;
            default -> false;
        };
    }
    
    private LocalDateTime calculateBlockDuration(SecurityEventType eventType) {
        return switch (eventType) {
            case BRUTE_FORCE_BLOCKED -> LocalDateTime.now().plusMinutes(15);
            case RATE_LIMIT_EXCEEDED -> LocalDateTime.now().plusMinutes(5);
            case DDOS_SUSPECTED -> LocalDateTime.now().plusHours(1);
            default -> null;
        };
    }
    
    private boolean isCriticalEvent(SecurityEventType eventType) {
        return switch (eventType) {
            case UNAUTHORIZED_ACCESS, BRUTE_FORCE_BLOCKED, DDOS_SUSPECTED -> true;
            default -> false;
        };
    }
    
    private void triggerSecurityAlert(SecurityEvent event) {
        
        // Send notification to security team
        notificationService.sendSecurityAlert(event);
        
        // Log to security monitoring system
        logToSecuritySystem(event);
    }
}
```

### 6. Database Security

```sql
-- Enhanced user table with security fields
ALTER TABLE users 
ADD COLUMN failed_login_attempts INT DEFAULT 0,
ADD COLUMN last_failed_login TIMESTAMP NULL,
ADD COLUMN account_locked_until TIMESTAMP NULL,
ADD COLUMN password_changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN two_factor_enabled BOOLEAN DEFAULT FALSE,
ADD COLUMN two_factor_secret VARCHAR(32) NULL,
ADD COLUMN device_fingerprint VARCHAR(100) NULL,
ADD COLUMN last_login_ip VARCHAR(45) NULL,
ADD COLUMN last_login_at TIMESTAMP NULL;

-- Create security events table
CREATE TABLE security_events (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    event_type ENUM('LOGIN_SUCCESS', 'LOGIN_FAILED', 'LOGIN_FAILED_INVALID_USER', 'LOGIN_FAILED_WRONG_PASSWORD', 
                     'LOGIN_FAILED_DISABLED', 'LOGIN_FAILED_LOCKED', 'LOGIN_FAILED_SESSION_EXPIRED',
                     'BRUTE_FORCE_BLOCKED', 'RATE_LIMIT_EXCEEDED', 'UNAUTHORIZED_ACCESS', 
                     'DDOS_SUSPECTED', 'SUSPICIOUS_ACTIVITY', 'SECURITY_BREACH') NOT NULL,
    username VARCHAR(100),
    user_id BIGINT,
    ip_address VARCHAR(45),
    user_agent TEXT,
    event_details TEXT,
    is_blocked BOOLEAN DEFAULT FALSE,
    blocked_until TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_security_events_type_created (event_type, created_at),
    INDEX idx_security_events_username_created (username, created_at),
    INDEX idx_security_events_ip_created (ip_address, created_at)
);

-- Create audit logs table
CREATE TABLE audit_logs (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    username VARCHAR(100),
    action_type ENUM('API_ACCESS', 'DATA_ACCESS', 'DATA_MODIFICATION', 'SECURITY_EVENT', 'USER_ACTION') NOT NULL,
    entity_type ENUM('USER', 'VENDOR', 'ZONE', 'VIOLATION', 'PAYMENT', 'REPORT', 'API') NOT NULL,
    entity_id VARCHAR(100),
    operation VARCHAR(50),
    result VARCHAR(20),
    old_values JSON,
    new_values JSON,
    ip_address VARCHAR(45),
    user_agent TEXT,
    session_id VARCHAR(100),
    risk_score DECIMAL(3,2),
    is_suspicious BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_audit_logs_username_created (username, created_at),
    INDEX idx_audit_logs_entity_created (entity_type, entity_id, created_at),
    INDEX idx_audit_logs_suspicious_created (is_suspicious, created_at)
);

-- Create password reset tokens table
CREATE TABLE password_reset_tokens (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    user_id BIGINT NOT NULL,
    token VARCHAR(255) NOT NULL UNIQUE,
    expires_at TIMESTAMP NOT NULL,
    used_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_password_reset_tokens_token (token),
    INDEX idx_password_reset_tokens_user_id (user_id)
);
```

This enhanced security implementation provides **comprehensive protection** for SMC's vendor management system without the complexity of blockchain, making it practical and achievable for Phase 1.
