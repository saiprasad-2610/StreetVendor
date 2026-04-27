# 🔐 Enterprise Security Architecture

## 🛡️ Government-Grade Security Framework

### 1. Advanced Authentication & Authorization

```java
@Configuration
@EnableWebSecurity
@EnableMethodSecurity(prePostEnabled = true)
public class AdvancedSecurityConfig {
    
    @Autowired
    private CustomAuthenticationProvider authProvider;
    
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
                .requestMatchers("/api/scan/validate").permitAll()
                
                // Role-based access
                .requestMatchers("/api/admin/**").hasRole("ADMIN")
                .requestMatchers("/api/officer/**").hasAnyRole("OFFICER", "ADMIN")
                .requestMatchers("/api/vendor/**").hasAnyRole("VENDOR", "ADMIN")
                .requestMatchers("/api/citizen/**").hasAnyRole("CITIZEN", "PUBLIC", "ADMIN")
                
                // API endpoints
                .requestMatchers("/api/**").authenticated()
                .anyRequest().denyAll()
            )
            .authenticationProvider(authProvider)
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
                    .policyDirectives("default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' wss: https:; media-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none';")
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
    
    @Bean
    public AuthenticationManager authenticationManager(AuthenticationConfiguration config) throws Exception {
        return config.getAuthenticationManager();
    }
}

@Service
public class CustomAuthenticationProvider implements AuthenticationProvider {
    
    @Autowired
    private UserRepository userRepository;
    
    @Autowired
    private SecurityAuditService auditService;
    
    @Autowired
    private BruteForceProtectionService bruteForceService;
    
    @Override
    public Authentication authenticate(Authentication authentication) throws AuthenticationException {
        
        String username = authentication.getName();
        String password = authentication.getCredentials().toString();
        
        // Check for brute force attempts
        if (bruteForceService.isBlocked(username)) {
            auditService.logSecurityEvent(SecurityEventType.BRUTE_FORCE_BLOCKED, username, null);
            throw new BadCredentialsException("Account temporarily locked due to multiple failed attempts");
        }
        
        User user = userRepository.findByUsername(username)
            .orElseThrow(() -> {
                bruteForceService.recordFailedAttempt(username);
                auditService.logSecurityEvent(SecurityEventType.LOGIN_FAILED_INVALID_USER, username, null);
                return new BadCredentialsException("Invalid credentials");
            });
        
        // Check account status
        if (!user.isEnabled()) {
            auditService.logSecurityEvent(SecurityEventType.LOGIN_FAILED_DISABLED, username, user.getId());
            throw new DisabledException("Account is disabled");
        }
        
        if (user.isAccountLocked()) {
            auditService.logSecurityEvent(SecurityEventType.LOGIN_FAILED_LOCKED, username, user.getId());
            throw new LockedException("Account is locked");
        }
        
        // Verify password
        if (!passwordEncoder().matches(password, user.getPassword())) {
            bruteForceService.recordFailedAttempt(username);
            auditService.logSecurityEvent(SecurityEventType.LOGIN_FAILED_WRONG_PASSWORD, username, user.getId());
            throw new BadCredentialsException("Invalid credentials");
        }
        
        // Check for session timeout
        if (user.isSessionExpired()) {
            auditService.logSecurityEvent(SecurityEventType.LOGIN_FAILED_SESSION_EXPIRED, username, user.getId());
            throw new CredentialsExpiredException("Session expired");
        }
        
        // Reset failed attempts on successful login
        bruteForceService.resetFailedAttempts(username);
        
        // Update last login
        user.setLastLoginAt(LocalDateTime.now());
        userRepository.save(user);
        
        // Log successful login
        auditService.logSecurityEvent(SecurityEventType.LOGIN_SUCCESS, username, user.getId());
        
        return new UsernamePasswordAuthenticationToken(
            user, password, getAuthorities(user.getRole())
        );
    }
    
    private Collection<? extends GrantedAuthority> getAuthorities(UserRole role) {
        return List.of(new SimpleGrantedAuthority("ROLE_" + role.name()));
    }
}
```

### 2. Advanced JWT Security

```java
@Component
public class AdvancedJwtUtils {
    
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
        claims.put("deviceFingerprint", user.getDeviceFingerprint());
        claims.put("issuedAt", Instant.now().toString());
        
        return Jwts.builder()
            .setClaims(claims)
            .setSubject(user.getUsername())
            .setIssuedAt(new Date())
            .setExpiration(new Date(System.currentTimeMillis() + jwtExpirationMs))
            .signWith(key, SignatureAlgorithm.HS512)
            .compact();
    }
    
    /**
     * Generate refresh token
     */
    public String generateRefreshToken(String username) {
        
        return Jwts.builder()
            .setSubject(username)
            .setIssuedAt(new Date())
            .setExpiration(new Date(System.currentTimeMillis() + refreshExpirationMs))
            .claim("type", "refresh")
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
            
            // Additional validation checks
            Claims claims = getClaimsFromToken(token);
            
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
     * Extract claims with validation
     */
    public Claims getClaimsFromToken(String token) {
        return Jwts.parserBuilder()
            .setSigningKey(key)
            .build()
            .parseClaimsJws(token)
            .getBody();
    }
    
    private boolean isTokenBlacklisted(String token) {
        // Check against token blacklist
        return tokenBlacklistService.isBlacklisted(token);
    }
    
    private boolean isSessionValid(Claims claims) {
        String sessionId = claims.get("sessionId", String.class);
        return sessionService.isSessionValid(sessionId);
    }
    
    private boolean isValidDeviceFingerprint(Claims claims) {
        String storedFingerprint = claims.get("deviceFingerprint", String.class);
        String currentFingerprint = deviceFingerprintService.getCurrentFingerprint();
        return storedFingerprint.equals(currentFingerprint);
    }
}

@Component
public class JwtAuthenticationFilter extends OncePerRequestFilter {
    
    @Autowired
    private AdvancedJwtUtils jwtUtils;
    
    @Autowired
    private UserDetailsService userDetailsService;
    
    @Autowired
    private SecurityAuditService auditService;
    
    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, 
                                  FilterChain filterChain) throws ServletException, IOException {
        
        try {
            String jwt = parseJwt(request);
            
            if (jwt != null && jwtUtils.validateJwtToken(jwt)) {
                
                Claims claims = jwtUtils.getClaimsFromToken(jwt);
                String username = claims.getSubject();
                
                // Load user details
                UserDetails userDetails = userDetailsService.loadUserByUsername(username);
                
                // Create authentication with enhanced details
                UsernamePasswordAuthenticationToken authentication = 
                    new UsernamePasswordAuthenticationToken(
                        userDetails, 
                        null, 
                        userDetails.getAuthorities()
                    );
                
                authentication.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
                
                // Set security context
                SecurityContextHolder.getContext().setAuthentication(authentication);
                
                // Log successful authentication
                auditService.logApiAccess(username, request.getRequestURI(), "SUCCESS");
                
            }
        } catch (Exception e) {
            log.error("Cannot set user authentication: {}", e.getMessage());
            auditService.logSecurityEvent(SecurityEventType.AUTHENTICATION_FAILED, null, null);
            
            response.sendError(HttpServletResponse.SC_UNAUTHORIZED, "Authentication failed");
            return;
        }
        
        filterChain.doFilter(request, response);
    }
    
    private String parseJwt(HttpServletRequest request) {
        String headerAuth = request.getHeader("Authorization");
        
        if (StringUtils.hasText(headerAuth) && headerAuth.startsWith("Bearer ")) {
            return headerAuth.substring(7);
        }
        
        return null;
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
    
    /**
     * Generate secure random token
     */
    public String generateSecureToken(int length) {
        SecureRandom random = new SecureRandom();
        byte[] bytes = new byte[length];
        random.nextBytes(bytes);
        
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }
    
    private String bytesToHex(byte[] bytes) {
        StringBuilder hexString = new StringBuilder();
        for (byte b : bytes) {
            String hex = Integer.toHexString(0xff & b);
            if (hex.length() == 1) {
                hexString.append('0');
            }
            hexString.append(hex);
        }
        return hexString.toString();
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
    
    public byte[] encryptBytes(byte[] data, String key) throws Exception {
        SecretKeySpec secretKey = generateKey(key);
        Cipher cipher = Cipher.getInstance(TRANSFORMATION);
        
        byte[] iv = new byte[IV_LENGTH];
        new SecureRandom().nextBytes(iv);
        IvParameterSpec ivSpec = new IvParameterSpec(iv);
        
        cipher.init(Cipher.ENCRYPT_MODE, secretKey, ivSpec);
        byte[] encrypted = cipher.doFinal(data);
        
        byte[] combined = new byte[IV_LENGTH + encrypted.length];
        System.arraycopy(iv, 0, combined, 0, IV_LENGTH);
        System.arraycopy(encrypted, 0, combined, IV_LENGTH, encrypted.length);
        
        return combined;
    }
    
    public byte[] decryptBytes(byte[] combined, String key) throws Exception {
        SecretKeySpec secretKey = generateKey(key);
        Cipher cipher = Cipher.getInstance(TRANSFORMATION);
        
        byte[] iv = new byte[IV_LENGTH];
        byte[] encrypted = new byte[combined.length - IV_LENGTH];
        System.arraycopy(combined, 0, iv, 0, IV_LENGTH);
        System.arraycopy(combined, IV_LENGTH, encrypted, 0, encrypted.length);
        
        IvParameterSpec ivSpec = new IvParameterSpec(iv);
        cipher.init(Cipher.DECRYPT_MODE, secretKey, ivSpec);
        
        return cipher.doFinal(encrypted);
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

### 4. Comprehensive Audit & Logging

```java
@Service
public class SecurityAuditService {
    
    @Autowired
    private AuditLogRepository auditLogRepository;
    
    @Autowired
    private SecurityEventRepository securityEventRepository;
    
    /**
     * Log API access
     */
    public void logApiAccess(String username, String endpoint, String result) {
        
        AuditLog auditLog = AuditLog.builder()
            .username(username)
            .actionType(ActionType.API_ACCESS)
            .entityType(EntityType.API)
            .entityId(endpoint)
            .oldValues(null)
            .newValues(Map.of("result", result, "timestamp", LocalDateTime.now()))
            .ipAddress(getCurrentIpAddress())
            .userAgent(getCurrentUserAgent())
            .sessionId(getCurrentSessionId())
            .riskScore(calculateRiskScore(username, endpoint, result))
            .createdAt(LocalDateTime.now())
            .build();
        
        auditLogRepository.save(auditLog);
    }
    
    /**
     * Log security events
     */
    public void logSecurityEvent(SecurityEventType eventType, String username, Long userId) {
        
        SecurityEvent securityEvent = SecurityEvent.builder()
            .eventType(eventType)
            .username(username)
            .userId(userId)
            .ipAddress(getCurrentIpAddress())
            .userAgent(getCurrentUserAgent())
            .eventData(collectSecurityEventData(eventType))
            .isBlocked(shouldBlockEvent(eventType))
            .blockedUntil(calculateBlockDuration(eventType))
            .createdAt(LocalDateTime.now())
            .build();
        
        securityEventRepository.save(securityEvent);
        
        // Trigger immediate alerts for critical events
        if (isCriticalEvent(eventType)) {
            triggerSecurityAlert(securityEvent);
        }
    }
    
    /**
     * Log data access attempts
     */
    public void logDataAccess(String username, String entityType, Long entityId, String operation) {
        
        AuditLog auditLog = AuditLog.builder()
            .username(username)
            .actionType(ActionType.DATA_ACCESS)
            .entityType(EntityType.valueOf(entityType.toUpperCase()))
            .entityId(entityId)
            .newValues(Map.of("operation", operation))
            .ipAddress(getCurrentIpAddress())
            .userAgent(getCurrentUserAgent())
            .sessionId(getCurrentSessionId())
            .riskScore(calculateDataAccessRisk(username, entityType, operation))
            .isSuspicious(isSuspiciousDataAccess(username, entityType, entityId))
            .createdAt(LocalDateTime.now())
            .build();
        
        auditLogRepository.save(auditLog);
        
        // Check for data access patterns
        analyzeDataAccessPatterns(username);
    }
    
    /**
     * Log sensitive data operations
     */
    public void logSensitiveDataOperation(String username, String operation, String dataType, boolean success) {
        
        AuditLog auditLog = AuditLog.builder()
            .username(username)
            .actionType(ActionType.SENSITIVE_DATA_OPERATION)
            .entityType(EntityType.SENSITIVE_DATA)
            .newValues(Map.of(
                "operation", operation,
                "dataType", dataType,
                "success", success,
                "timestamp", LocalDateTime.now()
            ))
            .ipAddress(getCurrentIpAddress())
            .userAgent(getCurrentUserAgent())
            .sessionId(getCurrentSessionId())
            .riskScore(calculateSensitiveDataRisk(username, operation, dataType))
            .isSuspicious(!success)
            .createdAt(LocalDateTime.now())
            .build();
        
        auditLogRepository.save(auditLog);
    }
    
    /**
     * Get security analytics
     */
    public SecurityAnalytics getSecurityAnalytics(LocalDateTime startDate, LocalDateTime endDate) {
        
        // Get security events
        List<SecurityEvent> events = securityEventRepository
            .findByCreatedAtBetween(startDate, endDate);
        
        // Get audit logs
        List<AuditLog> auditLogs = auditLogRepository
            .findByCreatedAtBetween(startDate, endDate);
        
        // Calculate metrics
        Map<SecurityEventType, Long> eventCounts = events.stream()
            .collect(Collectors.groupingBy(
                SecurityEvent::getEventType, 
                Collectors.counting()
            ));
        
        Map<String, Long> userActivityCounts = auditLogs.stream()
            .collect(Collectors.groupingBy(
                AuditLog::getUsername, 
                Collectors.counting()
            ));
        
        List<String> suspiciousUsers = identifySuspiciousUsers(auditLogs);
        List<String> highRiskIPs = identifyHighRiskIPs(events);
        
        return SecurityAnalytics.builder()
            .totalEvents(events.size())
            .eventCounts(eventCounts)
            .totalApiCalls(auditLogs.size())
            .userActivityCounts(userActivityCounts)
            .suspiciousUsers(suspiciousUsers)
            .highRiskIPs(highRiskIPs)
            .riskTrends(calculateRiskTrends(events))
            .complianceScore(calculateComplianceScore(events, auditLogs))
            .build();
    }
    
    private int calculateRiskScore(String username, String endpoint, String result) {
        int riskScore = 0;
        
        // Endpoint-based risk
        if (endpoint.contains("/admin/")) riskScore += 30;
        if (endpoint.contains("/delete")) riskScore += 20;
        if (endpoint.contains("/sensitive")) riskScore += 40;
        
        // Result-based risk
        if (!"SUCCESS".equals(result)) riskScore += 10;
        
        // Time-based risk
        int hour = LocalDateTime.now().getHour();
        if (hour < 6 || hour > 22) riskScore += 15;
        
        // User-based risk
        if (isHighRiskUser(username)) riskScore += 25;
        
        return Math.min(100, riskScore);
    }
    
    private boolean isSuspiciousDataAccess(String username, String entityType, Long entityId) {
        
        // Check for unusual access patterns
        List<AuditLog> recentAccess = auditLogRepository
            .findByUsernameAndEntityTypeAndCreatedAtAfter(
                username, 
                EntityType.valueOf(entityType.toUpperCase()), 
                LocalDateTime.now().minusHours(1)
            );
        
        // Too many accesses in short time
        if (recentAccess.size() > 100) return true;
        
        // Access to many different entities
        long distinctEntities = recentAccess.stream()
            .mapToLong(log -> log.getEntityId())
            .distinct()
            .count();
        
        if (distinctEntities > 50) return true;
        
        return false;
    }
}
```

### 5. Rate Limiting & DDoS Protection

```java
@Component
public class RateLimitingFilter extends OncePerRequestFilter {
    
    @Autowired
    private RedisTemplate<String, String> redisTemplate;
    
    @Autowired
    private SecurityAuditService auditService;
    
    private final Map<String, RateLimitConfig> endpointConfigs = new HashMap<>();
    
    @PostConstruct
    public void init() {
        // Configure rate limits for different endpoints
        endpointConfigs.put("/api/auth/login", new RateLimitConfig(5, 60)); // 5 attempts per minute
        endpointConfigs.put("/api/scan/validate", new RateLimitConfig(100, 60)); // 100 scans per minute
        endpointConfigs.put("/api/public/**", new RateLimitConfig(1000, 60)); // 1000 requests per minute
        endpointConfigs.put("/api/admin/**", new RateLimitConfig(200, 60)); // 200 requests per minute
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
        
        // Check global rate limits
        if (isGloballyRateLimited(clientIp)) {
            handleGlobalRateLimitExceeded(response, clientIp);
            return;
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
            log.error("Rate limiting check failed", e);
            return false; // Allow request on error
        }
    }
    
    private boolean isGloballyRateLimited(String clientIp) {
        
        String globalKey = "global_rate_limit:" + clientIp;
        
        try {
            String countStr = redisTemplate.opsForValue().get(globalKey);
            int currentCount = countStr != null ? Integer.parseInt(countStr) : 0;
            
            // Global limit: 1000 requests per minute
            if (currentCount >= 1000) {
                return true;
            }
            
            if (currentCount == 0) {
                redisTemplate.opsForValue().set(globalKey, "1", 60, TimeUnit.SECONDS);
            } else {
                redisTemplate.opsForValue().increment(globalKey);
            }
            
            return false;
            
        } catch (Exception e) {
            log.error("Global rate limiting check failed", e);
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
        auditService.logSecurityEvent(SecurityEventType.RATE_LIMIT_EXCEEDED, null, null);
    }
    
    private void handleGlobalRateLimitExceeded(HttpServletResponse response, String clientIp) {
        
        response.setStatus(HttpStatus.TOO_MANY_REQUESTS.value());
        response.setContentType("application/json");
        
        try {
            response.getWriter().write("""
                {
                    "error": "Global rate limit exceeded",
                    "message": "Too many requests from your IP. Please try again later.",
                    "retryAfter": 300
                }
                """);
        } catch (IOException e) {
            log.error("Failed to write global rate limit response", e);
        }
        
        // Log potential DDoS attack
        auditService.logSecurityEvent(SecurityEventType.DDOS_SUSPECTED, null, null);
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

This enterprise security architecture provides comprehensive protection including advanced authentication, data encryption, audit logging, rate limiting, and DDoS protection - meeting government-grade security requirements for the smart city vendor management platform.
