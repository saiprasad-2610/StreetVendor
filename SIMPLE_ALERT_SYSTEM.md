# 🚨 Simple Alert System

## 📋 Practical Alert Management for SMC

### 1. Alert Entity

```java
@Entity
@Table(name = "alerts")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Alert {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @Column(name = "alert_type", nullable = false, length = 30)
    private String alertType;
    
    @Enumerated(EnumType.STRING)
    @Column(name = "severity", nullable = false, length = 20)
    private AlertSeverity severity;
    
    @Column(name = "title", nullable = false, length = 200)
    private String title;
    
    @Column(name = "message", columnDefinition = "TEXT")
    private String message;
    
    @Column(name = "vendor_id")
    private Long vendorId;
    
    @Column(name = "zone_id")
    private Long zoneId;
    
    @Column(name = "officer_id")
    private Long officerId;
    
    @Column(name = "location_latitude", precision = 10, scale = 8)
    private Double locationLatitude;
    
    @Column(name = "location_longitude", precision = 11, scale = 8)
    private Double locationLongitude;
    
    @Column(name = "reference_id", length = 100)
    private String referenceId;
    
    @Column(name = "reference_type", length = 30)
    private String referenceType;
    
    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 20)
    private AlertStatus status;
    
    @Column(name = "assigned_to", length = 100)
    private String assignedTo;
    
    @Column(name = "priority_level", nullable = false)
    private Integer priorityLevel;
    
    @Column(name = "auto_escalated", nullable = false)
    private Boolean autoEscalated = false;
    
    @Column(name = "escalation_level", nullable = false)
    private Integer escalationLevel = 0;
    
    @Column(name = "acknowledged_at")
    private LocalDateTime acknowledgedAt;
    
    @Column(name = "resolved_at")
    private LocalDateTime resolvedAt;
    
    @Column(name = "resolution_notes", columnDefinition = "TEXT")
    private String resolutionNotes;
    
    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;
    
    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
}

// Enums
public enum AlertSeverity {
    LOW, MEDIUM, HIGH, CRITICAL
}

public enum AlertStatus {
    PENDING, ACKNOWLEDGED, IN_PROGRESS, RESOLVED
}
```

### 2. Simple Alert Service

```java
@Service
public class SimpleAlertService {
    
    @Autowired
    private AlertRepository alertRepository;
    
    @Autowired
    private UserRepository userRepository;
    
    @Autowired
    private NotificationService notificationService;
    
    @Autowired
    private EmailService emailService;
    
    @Autowired
    private SMSService smsService;
    
    /**
     * Create alert
     */
    public Alert createAlert(AlertRequest request) {
        
        try {
            Alert alert = Alert.builder()
                .alertType(request.getAlertType())
                .severity(request.getSeverity())
                .title(request.getTitle())
                .message(request.getMessage())
                .vendorId(request.getVendorId())
                .zoneId(request.getZoneId())
                .locationLatitude(request.getLocationLatitude())
                .locationLongitude(request.getLocationLongitude())
                .referenceId(request.getReferenceId())
                .referenceType(request.getReferenceType())
                .status(AlertStatus.PENDING)
                .priorityLevel(calculatePriorityLevel(request.getSeverity(), request.getAlertType()))
                .createdAt(LocalDateTime.now())
                .build();
            
            alert = alertRepository.save(alert);
            
            // Send notifications
            sendAlertNotifications(alert, request.getRecipients());
            
            // Schedule escalation if needed
            if (request.isAutoEscalation()) {
                scheduleEscalation(alert);
            }
            
            log.info("Alert created: {} - {}", alert.getId(), alert.getTitle());
            
            return alert;
            
        } catch (Exception e) {
            log.error("Failed to create alert", e);
            throw new AlertCreationException("Failed to create alert", e);
        }
    }
    
    /**
     * Create violation alert
     */
    public Alert createViolationAlert(Violation violation) {
        
        AlertRequest request = AlertRequest.builder()
            .alertType("VIOLATION_DETECTED")
            .severity(calculateViolationSeverity(violation))
            .title("Violation Detected: " + violation.getViolationType())
            .message(String.format(
                "Violation detected for vendor %s: %s at %s",
                violation.getVendorId(),
                violation.getDescription(),
                violation.getCreatedAt().toString()
            ))
            .vendorId(violation.getVendorId())
            .locationLatitude(violation.getLocationLatitude())
            .locationLongitude(violation.getLocationLongitude())
            .referenceId(violation.getId().toString())
            .referenceType("VIOLATION")
            .autoEscalation(true)
            .recipients(getViolationAlertRecipients(violation))
            .build();
        
        return createAlert(request);
    }
    
    /**
     * Create zone capacity alert
     */
    public Alert createZoneCapacityAlert(Zone zone, int currentVendors, int maxVendors) {
        
        AlertRequest request = AlertRequest.builder()
            .alertType("ZONE_CAPACITY")
            .severity(currentVendors >= maxVendors ? AlertSeverity.HIGH : AlertSeverity.MEDIUM)
            .title("Zone Capacity Alert: " + zone.getName())
            .message(String.format(
                "Zone %s is at %d%% capacity (%d/%d vendors)",
                zone.getName(),
                (currentVendors * 100) / maxVendors,
                currentVendors,
                maxVendors
            ))
            .zoneId(zone.getId())
            .autoEscalation(true)
            .recipients(getZoneAlertRecipients(zone))
            .build();
        
        return createAlert(request);
    }
    
    /**
     * Acknowledge alert
     */
    public Alert acknowledgeAlert(Long alertId, Long officerId) {
        
        Alert alert = alertRepository.findById(alertId)
            .orElseThrow(() -> new ResourceNotFoundException("Alert not found"));
        
        alert.setStatus(AlertStatus.ACKNOWLEDGED);
        alert.setAcknowledgedAt(LocalDateTime.now());
        alert.setOfficerId(officerId);
        
        alert = alertRepository.save(alert);
        
        log.info("Alert acknowledged: {} by officer {}", alertId, officerId);
        
        return alert;
    }
    
    /**
     * Resolve alert
     */
    public Alert resolveAlert(Long alertId, Long officerId, String resolutionNotes) {
        
        Alert alert = alertRepository.findById(alertId)
            .orElseThrow(() -> new ResourceNotFoundException("Alert not found"));
        
        alert.setStatus(AlertStatus.RESOLVED);
        alert.setResolvedAt(LocalDateTime.now());
        alert.setOfficerId(officerId);
        alert.setResolutionNotes(resolutionNotes);
        
        alert = alertRepository.save(alert);
        
        log.info("Alert resolved: {} by officer {}", alertId, officerId);
        
        return alert;
    }
    
    /**
     * Get pending alerts
     */
    public List<Alert> getPendingAlerts() {
        
        return alertRepository.findByStatusOrderByPriorityLevelDesc(AlertStatus.PENDING);
    }
    
    /**
     * Get alerts for officer
     */
    public List<Alert> getAlertsForOfficer(Long officerId) {
        
        return alertRepository.findByOfficerIdOrderByCreatedAtDesc(officerId);
    }
    
    /**
     * Get alert statistics
     */
    public AlertStatistics getAlertStatistics(LocalDate startDate, LocalDate endDate) {
        
        List<Alert> alerts = alertRepository
            .findByCreatedAtBetween(startDate.atStartOfDay(), endDate.atTime(23, 59, 59));
        
        // Count by status
        Map<AlertStatus, Long> statusCounts = alerts.stream()
            .collect(Collectors.groupingBy(Alert::getStatus, Collectors.counting()));
        
        // Count by severity
        Map<AlertSeverity, Long> severityCounts = alerts.stream()
            .collect(Collectors.groupingBy(Alert::getSeverity, Collectors.counting()));
        
        // Count by type
        Map<String, Long> typeCounts = alerts.stream()
            .collect(Collectors.groupingBy(Alert::getAlertType, Collectors.counting()));
        
        // Average resolution time
        double avgResolutionTime = alerts.stream()
            .filter(alert -> alert.getResolvedAt() != null)
            .mapToLong(alert -> Duration.between(alert.getCreatedAt(), alert.getResolvedAt()).toMinutes())
            .average()
            .orElse(0.0);
        
        return AlertStatistics.builder()
            .totalAlerts(alerts.size())
            .statusCounts(statusCounts)
            .severityCounts(severityCounts)
            .typeCounts(typeCounts)
            .averageResolutionTime(avgResolutionTime)
            .generatedAt(LocalDateTime.now())
            .build();
    }
    
    /**
     * Calculate priority level
     */
    private Integer calculatePriorityLevel(AlertSeverity severity, String alertType) {
        
        int basePriority = switch (severity) {
            case CRITICAL -> 100;
            case HIGH -> 75;
            case MEDIUM -> 50;
            case LOW -> 25;
            default -> 25;
        };
        
        // Adjust based on alert type
        return switch (alertType) {
            case "VIOLATION_DETECTED" -> basePriority + 25;
            case "ZONE_CAPACITY" -> basePriority + 20;
            case "SYSTEM_ERROR" -> basePriority + 30;
            case "SECURITY_BREACH" -> basePriority + 35;
            default -> basePriority;
        };
    }
    
    /**
     * Calculate violation severity
     */
    private AlertSeverity calculateViolationSeverity(Violation violation) {
        
        return switch (violation.getViolationType()) {
            case LOCATION_VIOLATION -> AlertSeverity.MEDIUM;
            case TIME_RESTRICTION -> AlertSeverity.LOW;
            case OVERCROWDING -> AlertSeverity.HIGH;
            case UNAUTHORIZED_ZONE -> AlertSeverity.HIGH;
            case MISSING_LICENSE -> AlertSeverity.MEDIUM;
            case EXPIRED_LICENSE -> AlertSeverity.LOW;
            default -> AlertSeverity.MEDIUM;
        };
    }
    
    /**
     * Get violation alert recipients
     */
    private List<String> getViolationAlertRecipients(Violation violation) {
        
        List<String> recipients = new ArrayList<>();
        
        // Get zone manager
        if (violation.getVendor() != null && violation.getVendor().getLocation() != null) {
            Zone zone = violation.getVendor().getLocation().getZone();
            if (zone != null && zone.getManagerEmail() != null) {
                recipients.add(zone.getManagerEmail());
            }
        }
        
        // Get nearby officers
        List<User> nearbyOfficers = userRepository.findNearbyOfficers(
            violation.getLocationLatitude(),
            violation.getLocationLongitude(),
            2.0 // 2km radius
        );
        
        nearbyOfficers.forEach(officer -> {
            if (officer.getEmail() != null) {
                recipients.add(officer.getEmail());
            }
        });
        
        return recipients;
    }
    
    /**
     * Get zone alert recipients
     */
    private List<String> getZoneAlertRecipients(Zone zone) {
        
        List<String> recipients = new ArrayList<>();
        
        // Zone manager
        if (zone.getManagerEmail() != null) {
            recipients.add(zone.getManagerEmail());
        }
        
        // Officers in zone
        List<User> zoneOfficers = userRepository.findByZoneId(zone.getId());
        
        zoneOfficers.forEach(officer -> {
            if (officer.getEmail() != null) {
                recipients.add(officer.getEmail());
            }
        });
        
        return recipients;
    }
    
    /**
     * Send alert notifications
     */
    private void sendAlertNotifications(Alert alert, List<String> recipients) {
        
        if (recipients == null || recipients.isEmpty()) {
            return;
        }
        
        // Send email notifications
        for (String recipient : recipients) {
            try {
                emailService.sendAlertEmail(recipient, alert);
            } catch (Exception e) {
                log.error("Failed to send email to: {}", recipient, e);
            }
        }
        
        // Send SMS for critical alerts
        if (alert.getSeverity() == AlertSeverity.CRITICAL) {
            for (String recipient : recipients) {
                try {
                    User user = userRepository.findByEmail(recipient).orElse(null);
                    if (user != null && user.getPhone() != null) {
                        smsService.sendAlertSMS(user.getPhone(), alert);
                    }
                } catch (Exception e) {
                    log.error("Failed to send SMS to: {}", recipient, e);
                }
            }
        }
    }
    
    /**
     * Schedule escalation
     */
    private void scheduleEscalation(Alert alert) {
        
        // Escalate after 30 minutes for high priority, 1 hour for medium, 2 hours for low
        long delayMinutes = switch (alert.getSeverity()) {
            case CRITICAL -> 15;
            case HIGH -> 30;
            case MEDIUM -> 60;
            case LOW -> 120;
            default -> 60;
        };
        
        ScheduledExecutorService scheduler = Executors.newSingleThreadScheduledExecutor();
        scheduler.schedule(() -> {
            escalateAlert(alert);
        }, delayMinutes, TimeUnit.MINUTES);
    }
    
    /**
     * Escalate alert
     */
    private void escalateAlert(Alert alert) {
        
        try {
            Alert currentAlert = alertRepository.findById(alert.getId()).orElse(null);
            
            if (currentAlert != null && currentAlert.getStatus() == AlertStatus.PENDING) {
                
                // Update escalation level
                currentAlert.setEscalationLevel(currentAlert.getEscalationLevel() + 1);
                currentAlert.setAutoEscalated(true);
                
                // Increase severity if escalated multiple times
                if (currentAlert.getEscalationLevel() >= 2) {
                    currentAlert.setSeverity(AlertSeverity.HIGH);
                }
                
                alertRepository.save(currentAlert);
                
                // Send escalation notifications
                sendEscalationNotifications(currentAlert);
                
                log.warn("Alert escalated: {} - Level {}", currentAlert.getId(), currentAlert.getEscalationLevel());
            }
        } catch (Exception e) {
            log.error("Failed to escalate alert: {}", alert.getId(), e);
        }
    }
    
    /**
     * Send escalation notifications
     */
    private void sendEscalationNotifications(Alert alert) {
        
        // Get escalation recipients (higher authorities)
        List<String> escalationRecipients = getEscalationRecipients(alert);
        
        if (escalationRecipients.isEmpty()) {
            return;
        }
        
        // Send escalation email
        String escalationMessage = String.format(
            "Alert has been escalated: %s\nLevel: %d\nOriginal Alert: %s\nCreated: %s",
            alert.getTitle(),
            alert.getEscalationLevel(),
            alert.getId(),
            alert.getCreatedAt().toString()
        );
        
        for (String recipient : escalationRecipients) {
            try {
                emailService.sendEscalationEmail(recipient, alert, escalationMessage);
            } catch (Exception e) {
                log.error("Failed to send escalation email to: {}", recipient, e);
            }
        }
    }
    
    /**
     * Get escalation recipients
     */
    private List<String> getEscalationRecipients(Alert alert) {
        
        List<String> recipients = new ArrayList<>();
        
        // Get admin users
        List<User> adminUsers = userRepository.findByRole(UserRole.ADMIN);
        
        adminUsers.forEach(admin -> {
            if (admin.getEmail() != null) {
                recipients.add(admin.getEmail());
            }
        });
        
        // Get senior officers
        List<User> seniorOfficers = userRepository.findByRoleAndExperience(
            UserRole.OFFICER, 5 // 5+ years experience
        );
        
        seniorOfficers.forEach(officer -> {
            if (officer.getEmail() != null) {
                recipients.add(officer.getEmail());
            }
        });
        
        return recipients;
    }
}
```

### 3. Alert Controller

```java
@RestController
@RequestMapping("/api/alerts")
@PreAuthorize("hasRole('ADMIN') or hasRole('OFFICER')")
public class AlertController {
    
    @Autowired
    private SimpleAlertService alertService;
    
    /**
     * Get all alerts
     */
    @GetMapping
    public ResponseEntity<ApiResponse<List<Alert>>> getAlerts(
            @RequestParam(required = false) AlertStatus status,
            @RequestParam(required = false) AlertSeverity severity,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        
        Pageable pageable = PageRequest.of(page, size, Sort.by("createdAt").descending());
        
        Page<Alert> alerts;
        if (status != null && severity != null) {
            alerts = alertRepository.findByStatusAndSeverity(status, severity, pageable);
        } else if (status != null) {
            alerts = alertRepository.findByStatusOrderByCreatedAtDesc(status, pageable);
        } else if (severity != null) {
            alerts = alertRepository.findBySeverityOrderByCreatedAtDesc(severity, pageable);
        } else {
            alerts = alertRepository.findAllByOrderByCreatedAtDesc(pageable);
        }
        
        return ResponseEntity.ok(ApiResponse.success(alerts.getContent()));
    }
    
    /**
     * Get pending alerts
     */
    @GetMapping("/pending")
    public ResponseEntity<ApiResponse<List<Alert>>> getPendingAlerts() {
        
        List<Alert> alerts = alertService.getPendingAlerts();
        
        return ResponseEntity.ok(ApiResponse.success(alerts));
    }
    
    /**
     * Get alert by ID
     */
    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<Alert>> getAlert(@PathVariable Long id) {
        
        Alert alert = alertRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Alert not found"));
        
        return ResponseEntity.ok(ApiResponse.success(alert));
    }
    
    /**
     * Create manual alert
     */
    @PostMapping
    public ResponseEntity<ApiResponse<Alert>> createAlert(
            @Valid @RequestBody AlertRequest request,
            @RequestHeader("X-User-ID") Long officerId) {
        
        try {
            Alert alert = alertService.createAlert(request);
            
            return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success(alert));
                
        } catch (Exception e) {
            return ResponseEntity.badRequest()
                .body(ApiResponse.error("Failed to create alert: " + e.getMessage()));
        }
    }
    
    /**
     * Acknowledge alert
     */
    @PutMapping("/{id}/acknowledge")
    public ResponseEntity<ApiResponse<String>> acknowledgeAlert(
            @PathVariable Long id,
            @RequestHeader("X-User-ID") Long officerId) {
        
        try {
            Alert alert = alertService.acknowledgeAlert(id, officerId);
            
            return ResponseEntity.ok(ApiResponse.success("Alert acknowledged successfully"));
            
        } catch (Exception e) {
            return ResponseEntity.badRequest()
                .body(ApiResponse.error("Failed to acknowledge alert: " + e.getMessage()));
        }
    }
    
    /**
     * Resolve alert
     */
    @PutMapping("/{id}/resolve")
    public ResponseEntity<ApiResponse<String>> resolveAlert(
            @PathVariable Long id,
            @RequestBody @RequestBody AlertResolutionRequest request,
            @RequestHeader("X-User-ID") Long officerId) {
        
        try {
            Alert alert = alertService.resolveAlert(id, officerId, request.getResolutionNotes());
            
            return ResponseEntity.ok(ApiResponse.success("Alert resolved successfully"));
            
        } catch (Exception e) {
            return ResponseEntity.badRequest()
                .body(ApiResponse.error("Failed to resolve alert: " + e.getMessage()));
        }
    }
    
    /**
     * Get alert statistics
     */
    @GetMapping("/statistics")
    public ResponseEntity<ApiResponse<AlertStatistics>> getAlertStatistics(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate) {
        
        if (startDate == null) {
            startDate = LocalDate.now().minusDays(30);
        }
        if (endDate == null) {
            endDate = LocalDate.now();
        }
        
        AlertStatistics stats = alertService.getAlertStatistics(startDate, endDate);
        
        return ResponseEntity.ok(ApiResponse.success(stats));
    }
}
```

### 4. Database Migration

```sql
-- Create alerts table
CREATE TABLE alerts (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    alert_type VARCHAR(30) NOT NULL,
    severity ENUM('LOW', 'MEDIUM', 'HIGH', 'CRITICAL') NOT NULL,
    title VARCHAR(200) NOT NULL,
    message TEXT,
    vendor_id BIGINT,
    zone_id BIGINT,
    officer_id BIGINT,
    location_latitude DECIMAL(10,8),
    location_longitude DECIMAL(11,8),
    reference_id VARCHAR(100),
    reference_type VARCHAR(30),
    status ENUM('PENDING', 'ACKNOWLEDGED', 'IN_PROGRESS', 'RESOLVED') DEFAULT 'PENDING',
    assigned_to VARCHAR(100),
    priority_level INT NOT NULL,
    auto_escalated BOOLEAN DEFAULT FALSE,
    escalation_level INT DEFAULT 0,
    acknowledged_at TIMESTAMP NULL,
    resolved_at TIMESTAMP NULL,
    resolution_notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (vendor_id) REFERENCES vendors(id) ON DELETE SET NULL,
    FOREIGN KEY (zone_id) REFERENCES zones(id) ON DELETE SET NULL,
    FOREIGN KEY (officer_id) REFERENCES users(id) ON DELETE SET NULL,
    
    INDEX idx_alerts_status_created (status, created_at),
    INDEX idx_alerts_severity_created (severity, created_at),
    INDEX idx_alerts_priority_created (priority_level, created_at),
    INDEX idx_alerts_officer_created (officer_id, created_at),
    INDEX idx_alerts_vendor_created (vendor_id, created_at)
);
```

This simple alert system provides **effective alert management** for SMC with automatic escalation, notifications, and comprehensive tracking without over-engineering.
