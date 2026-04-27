# 🚨 Basic Violation Detection Implementation

## 📋 Simple, Rule-Based Violation Detection for SMC

### 1. Enhanced Violation Entity

```java
@Entity
@Table(name = "violations")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Violation {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @Column(name = "vendor_id")
    private Long vendorId;
    
    @Enumerated(EnumType.STRING)
    @Column(name = "violation_type", nullable = false, length = 30)
    private ViolationType violationType;
    
    @Enumerated(EnumType.STRING)
    @Column(name = "detection_method", length = 20)
    private DetectionMethod detectionMethod;
    
    @Column(name = "description", columnDefinition = "TEXT")
    private String description;
    
    @Column(name = "location_latitude", precision = 10, scale = 8)
    private Double locationLatitude;
    
    @Column(name = "location_longitude", precision = 11, scale = 8)
    private Double locationLongitude;
    
    @Column(name = "image_proof_url", length = 500)
    private String imageProofUrl;
    
    @Column(name = "officer_id")
    private Long officerId;
    
    @Column(name = "reported_by", length = 100)
    private String reportedBy;
    
    @Column(name = "reported_by_phone", length = 20)
    private String reportedByPhone;
    
    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 20)
    private ViolationStatus status;
    
    @Column(name = "auto_detected", nullable = false)
    private Boolean autoDetected = false;
    
    @Column(name = "confidence_score", precision = 3, scale = 2)
    private Double confidenceScore;
    
    @Column(name = "distance_from_zone", precision = 8, scale = 2)
    private Double distanceFromZone;
    
    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;
    
    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
}

// Enums
public enum ViolationType {
    LOCATION_VIOLATION,
    TIME_RESTRICTION,
    OVERCROWDING,
    UNAUTHORIZED_ZONE,
    MISSING_LICENSE,
    EXPIRED_LICENSE
}

public enum DetectionMethod {
    AUTOMATIC,
    OFFICER_REPORT,
    CITIZEN_REPORT,
    MANUAL_REVIEW
}

public enum ViolationStatus {
    PENDING,
    CONFIRMED,
    DISMISSED,
    RESOLVED
}
```

### 2. Simple Violation Detection Service

```java
@Service
public class BasicViolationDetectionService {
    
    @Autowired
    private VendorRepository vendorRepository;
    
    @Autowired
    private VendorLocationRepository vendorLocationRepository;
    
    @Autowired
    private ZoneRepository zoneRepository;
    
    @Autowired
    private ViolationRepository violationRepository;
    
    @Autowired
    private NotificationService notificationService;
    
    private static final double VIOLATION_THRESHOLD_METERS = 50.0;
    private static final int MAX_VIOLATIONS_PER_HOUR = 3;
    
    /**
     * Run violation detection every 5 minutes
     */
    @Scheduled(fixedRate = 300000) // Every 5 minutes
    public void detectViolations() {
        
        try {
            log.info("Starting violation detection");
            
            // Get all active vendors with their locations
            List<VendorWithLocation> vendors = getActiveVendorsWithLocations();
            
            for (VendorWithLocation vendor : vendors) {
                
                // Check location violation
                checkLocationViolation(vendor);
                
                // Check time restriction violation
                checkTimeRestrictionViolation(vendor);
                
                // Check zone capacity violation
                checkZoneCapacityViolation(vendor);
            }
            
            // Check for repeated violations
            checkRepeatedViolations();
            
            log.info("Violation detection completed");
            
        } catch (Exception e) {
            log.error("Error during violation detection", e);
        }
    }
    
    /**
     * Check if vendor is outside their assigned zone
     */
    private void checkLocationViolation(VendorWithLocation vendor) {
        
        if (vendor.getLocation() == null || vendor.getVendor().getStatus() != VendorStatus.APPROVED) {
            return;
        }
        
        // Get vendor's latest known location
        VendorLocation lastLocation = vendor.getLocation();
        Zone assignedZone = lastLocation.getZone();
        
        // Calculate distance from zone center
        double distance = calculateDistanceFromZoneCenter(
            lastLocation.getLatitude(),
            lastLocation.getLongitude(),
            assignedZone
        );
        
        // Check if vendor is outside allowed distance
        if (distance > VIOLATION_THRESHOLD_METERS) {
            
            // Check if violation already exists for this vendor
            boolean recentViolation = violationRepository
                .existsByVendorIdAndViolationTypeAndCreatedAtAfter(
                    vendor.getVendor().getId(),
                    ViolationType.LOCATION_VIOLATION,
                    LocalDateTime.now().minusHours(1)
                );
            
            if (!recentViolation) {
                
                // Create violation record
                Violation violation = Violation.builder()
                    .vendorId(vendor.getVendor().getId())
                    .violationType(ViolationType.LOCATION_VIOLATION)
                    .detectionMethod(DetectionMethod.AUTOMATIC)
                    .description(String.format(
                        "Vendor is %.2f meters outside assigned zone", 
                        distance
                    ))
                    .locationLatitude(lastLocation.getLatitude())
                    .locationLongitude(lastLocation.getLongitude())
                    .distanceFromZone(distance)
                    .autoDetected(true)
                    .confidenceScore(0.95)
                    .status(ViolationStatus.PENDING)
                    .createdAt(LocalDateTime.now())
                    .build();
                
                violationRepository.save(violation);
                
                // Send notification to officers
                notificationService.sendViolationAlert(violation, vendor.getVendor());
                
                log.info("Location violation detected for vendor: {}", vendor.getVendor().getVendorId());
            }
        }
    }
    
    /**
     * Check if vendor is operating during restricted hours
     */
    private void checkTimeRestrictionViolation(VendorWithLocation vendor) {
        
        Zone zone = vendor.getLocation() != null ? vendor.getLocation().getZone() : null;
        
        if (zone == null || !zone.hasTimeRestrictions()) {
            return;
        }
        
        try {
            // Parse time restrictions
            ObjectMapper mapper = new ObjectMapper();
            Map<String, Object> restrictions = mapper.readValue(
                zone.getTimeRestrictions(), 
                new TypeReference<Map<String, Object>>(){}
            );
            
            LocalTime currentTime = LocalTime.now();
            DayOfWeek currentDay = LocalDate.now().getDayOfWeek();
            
            // Check if current day is allowed
            List<String> allowedDays = (List<String>) restrictions.get("allowedDays");
            if (allowedDays != null && !allowedDays.isEmpty()) {
                if (!allowedDays.contains(currentDay.name())) {
                    createTimeRestrictionViolation(vendor, "Operating on restricted day");
                    return;
                }
            }
            
            // Check time range
            Map<String, Object> timeRange = (Map<String, Object>) restrictions.get("timeRange");
            if (timeRange != null) {
                String startTimeStr = (String) timeRange.get("start");
                String endTimeStr = (String) timeRange.get("end");
                
                if (startTimeStr != null && endTimeStr != null) {
                    LocalTime startTime = LocalTime.parse(startTimeStr);
                    LocalTime endTime = LocalTime.parse(endTimeStr);
                    
                    if (currentTime.isBefore(startTime) || currentTime.isAfter(endTime)) {
                        createTimeRestrictionViolation(vendor, "Operating during restricted hours");
                    }
                }
            }
            
        } catch (Exception e) {
            log.error("Error checking time restrictions for vendor: {}", vendor.getVendor().getId(), e);
        }
    }
    
    /**
     * Check if zone is over capacity
     */
    private void checkZoneCapacityViolation(VendorWithLocation vendor) {
        
        Zone zone = vendor.getLocation() != null ? vendor.getLocation().getZone() : null;
        
        if (zone == null || zone.getMaxVendors() == null) {
            return;
        }
        
        // Count current vendors in zone
        int currentVendors = vendorLocationRepository.countByZoneId(zone.getId());
        
        if (currentVendors > zone.getMaxVendors()) {
            
            // Check if capacity violation already exists for this zone
            boolean recentViolation = violationRepository
                .existsByViolationTypeAndZoneIdAndCreatedAtAfter(
                    ViolationType.OVERCROWDING,
                    zone.getId(),
                    LocalDateTime.now().minusHours(1)
                );
            
            if (!recentViolation) {
                
                // Create violation for all vendors in zone (or just the latest one)
                List<Vendor> vendorsInZone = vendorRepository.findByZoneId(zone.getId());
                
                for (Vendor v : vendorsInZone) {
                    Violation violation = Violation.builder()
                        .vendorId(v.getId())
                        .violationType(ViolationType.OVERCROWDING)
                        .detectionMethod(DetectionMethod.AUTOMATIC)
                        .description(String.format(
                            "Zone overcrowded: %d vendors (max: %d)", 
                            currentVendors, 
                            zone.getMaxVendors()
                        ))
                        .autoDetected(true)
                        .confidenceScore(0.90)
                        .status(ViolationStatus.PENDING)
                        .createdAt(LocalDateTime.now())
                        .build();
                    
                    violationRepository.save(violation);
                }
                
                // Send alert to zone manager
                notificationService.sendOvercrowdingAlert(zone, currentVendors, zone.getMaxVendors());
                
                log.warn("Overcrowding detected in zone: {} - {}/{} vendors", 
                    zone.getName(), currentVendors, zone.getMaxVendors());
            }
        }
    }
    
    /**
     * Check for repeated violations by same vendor
     */
    private void checkRepeatedViolations() {
        
        // Get violations from last hour
        List<Violation> recentViolations = violationRepository
            .findByCreatedAtAfter(LocalDateTime.now().minusHours(1));
        
        // Group by vendor
        Map<Long, List<Violation>> violationsByVendor = recentViolations.stream()
            .collect(Collectors.groupingBy(Violation::getVendorId));
        
        for (Map.Entry<Long, List<Violation>> entry : violationsByVendor.entrySet()) {
            
            if (entry.getValue().size() >= MAX_VIOLATIONS_PER_HOUR) {
                
                Vendor vendor = vendorRepository.findById(entry.getKey()).orElse(null);
                if (vendor != null) {
                    
                    // Create high-priority alert
                    notificationService.sendRepeatedViolationAlert(vendor, entry.getValue());
                    
                    log.warn("Repeated violations detected for vendor: {} - {} violations in 1 hour", 
                        vendor.getVendorId(), entry.getValue().size());
                }
            }
        }
    }
    
    /**
     * Create time restriction violation
     */
    private void createTimeRestrictionViolation(VendorWithLocation vendor, String reason) {
        
        Violation violation = Violation.builder()
            .vendorId(vendor.getVendor().getId())
            .violationType(ViolationType.TIME_RESTRICTION)
            .detectionMethod(DetectionMethod.AUTOMATIC)
            .description(reason)
            .locationLatitude(vendor.getLocation().getLatitude())
            .locationLongitude(vendor.getLocation().getLongitude())
            .autoDetected(true)
            .confidenceScore(0.85)
            .status(ViolationStatus.PENDING)
            .createdAt(LocalDateTime.now())
            .build();
        
        violationRepository.save(violation);
        
        // Send notification
        notificationService.sendViolationAlert(violation, vendor.getVendor());
    }
    
    /**
     * Get active vendors with their locations
     */
    private List<VendorWithLocation> getActiveVendorsWithLocations() {
        
        String sql = """
            SELECT v as vendor, vl as location 
            FROM vendors v 
            LEFT JOIN vendor_locations vl ON v.id = vl.vendor_id 
            WHERE v.status = 'APPROVED' 
            AND (vl.is_active = true OR vl.is_active IS NULL)
            ORDER BY v.id
            """;
        
        return jdbcTemplate.query(sql, (rs, rowNum) -> {
            Vendor vendor = new Vendor();
            vendor.setId(rs.getLong("vendor_id"));
            vendor.setVendorId(rs.getString("vendor_id"));
            vendor.setName(rs.getString("name"));
            vendor.setStatus(VendorStatus.valueOf(rs.getString("status")));
            
            VendorLocation location = null;
            if (rs.getLong("location_id") != 0) {
                location = new VendorLocation();
                location.setId(rs.getLong("location_id"));
                location.setVendorId(rs.getLong("vendor_id"));
                location.setLatitude(rs.getDouble("latitude"));
                location.setLongitude(rs.getDouble("longitude"));
                // Set zone if needed
            }
            
            return new VendorWithLocation(vendor, location);
        });
    }
    
    /**
     * Calculate distance from zone center
     */
    private double calculateDistanceFromZoneCenter(double lat, double lng, Zone zone) {
        
        return calculateHaversineDistance(
            lat, lng,
            zone.getLatitude(), 
            zone.getLongitude()
        );
    }
    
    /**
     * Haversine formula for distance calculation
     */
    private double calculateHaversineDistance(double lat1, double lon1, double lat2, double lon2) {
        
        final int R = 6371; // Radius of earth in kilometers
        
        double latDistance = Math.toRadians(lat2 - lat1);
        double lonDistance = Math.toRadians(lon2 - lon1);
        
        double a = Math.sin(latDistance / 2) * Math.sin(latDistance / 2)
                + Math.cos(Math.toRadians(lat1)) * Math.cos(Math.toRadians(lat2))
                * Math.sin(lonDistance / 2) * Math.sin(lonDistance / 2);
        
        double c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        
        return R * c * 1000; // Convert to meters
    }
    
    /**
     * Manual violation creation by officer
     */
    public Violation createManualViolation(ViolationRequest request, Long officerId) {
        
        Violation violation = Violation.builder()
            .vendorId(request.getVendorId())
            .violationType(request.getViolationType())
            .detectionMethod(DetectionMethod.OFFICER_REPORT)
            .description(request.getDescription())
            .locationLatitude(request.getLatitude())
            .locationLongitude(request.getLongitude())
            .imageProofUrl(request.getImageProofUrl())
            .officerId(officerId)
            .reportedBy(request.getReportedBy())
            .reportedByPhone(request.getReportedByPhone())
            .status(ViolationStatus.CONFIRMED)
            .autoDetected(false)
            .confidenceScore(1.0)
            .createdAt(LocalDateTime.now())
            .build();
        
        return violationRepository.save(violation);
    }
    
    /**
     * Manual violation creation by citizen
     */
    public Violation createCitizenViolation(ViolationRequest request) {
        
        // Basic validation for citizen reports
        if (!isValidCitizenReport(request)) {
            throw new IllegalArgumentException("Invalid citizen report");
        }
        
        Violation violation = Violation.builder()
            .vendorId(request.getVendorId())
            .violationType(request.getViolationType())
            .detectionMethod(DetectionMethod.CITIZEN_REPORT)
            .description(request.getDescription())
            .locationLatitude(request.getLatitude())
            .locationLongitude(request.getLongitude())
            .imageProofUrl(request.getImageProofUrl())
            .reportedBy(request.getReportedBy())
            .reportedByPhone(request.getReportedByPhone())
            .status(ViolationStatus.PENDING)
            .autoDetected(false)
            .confidenceScore(0.5) // Lower confidence for citizen reports
            .createdAt(LocalDateTime.now())
            .build();
        
        return violationRepository.save(violation);
    }
    
    private boolean isValidCitizenReport(ViolationRequest request) {
        return request.getVendorId() != null &&
               request.getDescription() != null &&
               request.getDescription().length() > 10 &&
               request.getLatitude() != null &&
               request.getLongitude() != null &&
               request.getReportedBy() != null;
    }
}
```

### 3. Violation Controller

```java
@RestController
@RequestMapping("/api/violations")
@Validated
public class ViolationController {
    
    @Autowired
    private BasicViolationDetectionService violationService;
    
    @Autowired
    private ViolationRepository violationRepository;
    
    /**
     * Get all violations with filters
     */
    @GetMapping
    @PreAuthorize("hasRole('ADMIN') or hasRole('OFFICER')")
    public ResponseEntity<ApiResponse<List<Violation>>> getViolations(
            @RequestParam(required = false) ViolationType violationType,
            @RequestParam(required = false) ViolationStatus status,
            @RequestParam(required = false) Long vendorId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        
        Pageable pageable = PageRequest.of(page, size, Sort.by("createdAt").descending());
        
        Page<Violation> violations;
        if (violationType != null && vendorId != null) {
            violations = violationRepository.findByViolationTypeAndVendorId(
                violationType, vendorId, pageable);
        } else if (violationType != null) {
            violations = violationRepository.findByViolationType(violationType, pageable);
        } else if (vendorId != null) {
            violations = violationRepository.findByVendorId(vendorId, pageable);
        } else {
            violations = violationRepository.findAll(pageable);
        }
        
        return ResponseEntity.ok(ApiResponse.success(violations.getContent()));
    }
    
    /**
     * Create manual violation (officer)
     */
    @PostMapping
    @PreAuthorize("hasRole('OFFICER') or hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<Violation>> createViolation(
            @Valid @RequestBody ViolationRequest request,
            @RequestHeader("X-User-ID") Long officerId) {
        
        try {
            Violation violation = violationService.createManualViolation(request, officerId);
            
            return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success(violation));
                
        } catch (Exception e) {
            return ResponseEntity.badRequest()
                .body(ApiResponse.error("Failed to create violation: " + e.getMessage()));
        }
    }
    
    /**
     * Create citizen report
     */
    @PostMapping("/citizen-report")
    public ResponseEntity<ApiResponse<Violation>> createCitizenReport(
            @Valid @RequestBody ViolationRequest request) {
        
        try {
            Violation violation = violationService.createCitizenViolation(request);
            
            return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success(violation));
                
        } catch (Exception e) {
            return ResponseEntity.badRequest()
                .body(ApiResponse.error("Failed to create citizen report: " + e.getMessage()));
        }
    }
    
    /**
     * Update violation status
     */
    @PutMapping("/{id}/status")
    @PreAuthorize("hasRole('ADMIN') or hasRole('OFFICER')")
    public ResponseEntity<ApiResponse<String>> updateViolationStatus(
            @PathVariable Long id,
            @RequestBody @Valid ViolationStatusUpdateRequest request) {
        
        try {
            Violation violation = violationRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Violation not found"));
            
            violation.setStatus(request.getStatus());
            violation.setUpdatedAt(LocalDateTime.now());
            
            if (request.getNotes() != null) {
                violation.setDescription(violation.getDescription() + "\n\nUpdate: " + request.getNotes());
            }
            
            violationRepository.save(violation);
            
            return ResponseEntity.ok(ApiResponse.success("Violation status updated successfully"));
            
        } catch (Exception e) {
            return ResponseEntity.badRequest()
                .body(ApiResponse.error("Failed to update violation status: " + e.getMessage()));
        }
    }
    
    /**
     * Get violation statistics
     */
    @GetMapping("/statistics")
    @PreAuthorize("hasRole('ADMIN') or hasRole('OFFICER')")
    public ResponseEntity<ApiResponse<ViolationStatistics>> getStatistics(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate) {
        
        List<Violation> violations = violationRepository
            .findByCreatedAtBetween(startDate.atStartOfDay(), endDate.atTime(23, 59, 59));
        
        ViolationStatistics stats = ViolationStatistics.builder()
            .totalViolations(violations.size())
            .byType(violations.stream()
                .collect(Collectors.groupingBy(Violation::getViolationType, Collectors.counting())))
            .byStatus(violations.stream()
                .collect(Collectors.groupingBy(Violation::getStatus, Collectors.counting())))
            .byDetectionMethod(violations.stream()
                .collect(Collectors.groupingBy(Violation::getDetectionMethod, Collectors.counting())))
            .autoDetectedCount(violations.stream()
                .mapToLong(v -> v.isAutoDetected() ? 1 : 0)
                .sum())
            .build();
        
        return ResponseEntity.ok(ApiResponse.success(stats));
    }
}
```

### 4. Database Migration

```sql
-- Enhanced violations table
ALTER TABLE violations 
ADD COLUMN detection_method ENUM('AUTOMATIC', 'OFFICER_REPORT', 'CITIZEN_REPORT', 'MANUAL_REVIEW') DEFAULT 'OFFICER_REPORT',
ADD COLUMN reported_by VARCHAR(100),
ADD COLUMN reported_by_phone VARCHAR(20),
ADD COLUMN officer_id BIGINT,
ADD COLUMN auto_detected BOOLEAN DEFAULT FALSE,
ADD COLUMN confidence_score DECIMAL(3,2),
ADD COLUMN distance_from_zone DECIMAL(8,2);

-- Add foreign key constraint for officer_id
ALTER TABLE violations 
ADD CONSTRAINT fk_violations_officer 
FOREIGN KEY (officer_id) REFERENCES users(id) ON DELETE SET NULL;

-- Create indexes for performance
CREATE INDEX idx_violations_vendor_type_created ON violations(vendor_id, violation_type, created_at);
CREATE INDEX idx_violations_status_created ON violations(status, created_at);
CREATE INDEX idx_violations_detection_method ON violations(detection_method, created_at);
CREATE INDEX idx_violations_auto_detected ON violations(auto_detected, created_at);

-- Create violation statistics view
CREATE VIEW violation_statistics AS
SELECT 
    DATE(created_at) as violation_date,
    violation_type,
    detection_method,
    status,
    COUNT(*) as violation_count,
    COUNT(CASE WHEN auto_detected = TRUE THEN 1 END) as auto_detected_count
FROM violations 
GROUP BY DATE(created_at), violation_type, detection_method, status;
```

This basic violation detection system provides **effective rule-based monitoring** without the complexity of AI/ML, making it perfect for SMC's current needs and capabilities.
