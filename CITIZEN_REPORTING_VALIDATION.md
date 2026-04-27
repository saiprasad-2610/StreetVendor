# 📱 Citizen Reporting with Validation

## 📋 Simple, Effective Citizen Reporting System for SMC

### 1. Citizen Report Entity

```java
@Entity
@Table(name = "citizen_reports")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CitizenReport {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @Column(name = "vendor_id")
    private Long vendorId;
    
    @Column(name = "reporter_name", length = 100)
    private String reporterName;
    
    @Column(name = "reporter_phone", length = 20)
    private String reporterPhone;
    
    @Column(name = "reporter_email", length = 100)
    private String reporterEmail;
    
    @Enumerated(EnumType.STRING)
    @Column(name = "report_type", nullable = false, length = 30)
    private ReportType reportType;
    
    @Column(name = "description", columnDefinition = "TEXT")
    private String description;
    
    @Column(name = "location_latitude", precision = 10, scale = 8)
    private Double locationLatitude;
    
    @Column(name = "location_longitude", precision = 11, scale = 8)
    private Double locationLongitude;
    
    @Column(name = "location_address", length = 500)
    private String locationAddress;
    
    @Column(name = "image_proof_url", length = 500)
    private String imageProofUrl;
    
    @Column(name = "additional_images", columnDefinition = "JSON")
    private String additionalImages;
    
    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 20)
    private ReportStatus status;
    
    @Column(name = "validation_score", precision = 3, scale = 2)
    private Double validationScore;
    
    @Column(name = "is_duplicate", nullable = false)
    private Boolean isDuplicate = false;
    
    @Column(name = "duplicate_report_id")
    private Long duplicateReportId;
    
    @Column(name = "officer_assigned_id")
    private Long officerAssignedId;
    
    @Column(name = "resolution_notes", columnDefinition = "TEXT")
    private String resolutionNotes;
    
    @Column(name = "ip_address", length = 45)
    private String ipAddress;
    
    @Column(name = "user_agent", length = 500)
    private String userAgent;
    
    @Column(name = "device_fingerprint", length = 100)
    private String deviceFingerprint;
    
    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;
    
    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
}

// Enums
public enum ReportType {
    LOCATION_VIOLATION,
    TIME_VIOLATION,
    OVERCROWDING,
    UNAUTHORIZED_VENDOR,
    HYGIENE_ISSUE,
    PRICE_COMPLAINT,
    BEHAVIOR_ISSUE,
    OTHER
}

public enum ReportStatus {
    PENDING_REVIEW,
    UNDER_INVESTIGATION,
    CONFIRMED,
    DISMISSED,
    RESOLVED
}
```

### 2. Citizen Reporting Service

```java
@Service
public class CitizenReportingService {
    
    @Autowired
    private CitizenReportRepository reportRepository;
    
    @Autowired
    private VendorRepository vendorRepository;
    
    @Autowired
    private ViolationRepository violationRepository;
    
    @Autowired
    private NotificationService notificationService;
    
    @Autowired
    private FileUploadService fileUploadService;
    
    private static final int MAX_REPORTS_PER_HOUR = 3;
    private static final int MAX_REPORTS_PER_DAY = 10;
    
    /**
     * Submit citizen report with validation
     */
    public CitizenReportResult submitReport(CitizenReportRequest request, HttpServletRequest httpRequest) {
        
        try {
            // Basic validation
            ValidationResult validation = validateReport(request);
            if (!validation.isValid()) {
                return CitizenReportResult.builder()
                    .success(false)
                    .message(validation.getErrorMessage())
                    .build();
            }
            
            // Check for rate limiting
            RateLimitResult rateLimit = checkRateLimit(request.getReporterPhone(), httpRequest.getRemoteAddr());
            if (!rateLimit.isAllowed()) {
                return CitizenReportResult.builder()
                    .success(false)
                    .message(rateLimit.getMessage())
                    .build();
            }
            
            // Check for duplicate reports
            DuplicateCheckResult duplicateCheck = checkDuplicateReport(request);
            if (duplicateCheck.isDuplicate()) {
                return CitizenReportResult.builder()
                    .success(false)
                    .message("Similar report already submitted. Report ID: " + duplicateCheck.getExistingReportId())
                    .build();
            }
            
            // Validate vendor if specified
            Vendor vendor = null;
            if (request.getVendorId() != null) {
                vendor = vendorRepository.findById(request.getVendorId()).orElse(null);
                if (vendor == null) {
                    return CitizenReportResult.builder()
                        .success(false)
                        .message("Invalid vendor ID")
                        .build();
                }
            }
            
            // Upload image if provided
            String imageProofUrl = null;
            String additionalImagesJson = null;
            if (request.getImageFile() != null) {
                imageProofUrl = fileUploadService.uploadImage(request.getImageFile(), "reports");
            }
            if (request.getAdditionalImages() != null && !request.getAdditionalImages().isEmpty()) {
                List<String> additionalImageUrls = fileUploadService.uploadMultipleImages(
                    request.getAdditionalImages(), "reports");
                additionalImagesJson = new ObjectMapper().writeValueAsString(additionalImageUrls);
            }
            
            // Create report
            CitizenReport report = CitizenReport.builder()
                .vendorId(request.getVendorId())
                .reporterName(request.getReporterName())
                .reporterPhone(request.getReporterPhone())
                .reporterEmail(request.getReporterEmail())
                .reportType(request.getReportType())
                .description(request.getDescription())
                .locationLatitude(request.getLatitude())
                .locationLongitude(request.getLongitude())
                .locationAddress(request.getLocationAddress())
                .imageProofUrl(imageProofUrl)
                .additionalImages(additionalImagesJson)
                .status(ReportStatus.PENDING_REVIEW)
                .validationScore(calculateValidationScore(request, vendor))
                .ipAddress(httpRequest.getRemoteAddr())
                .userAgent(httpRequest.getHeader("User-Agent"))
                .deviceFingerprint(generateDeviceFingerprint(httpRequest))
                .createdAt(LocalDateTime.now())
                .build();
            
            report = reportRepository.save(report);
            
            // Send confirmation
            notificationService.sendReportConfirmation(report);
            
            // If high validation score, create violation automatically
            if (report.getValidationScore() >= 0.8 && vendor != null) {
                createViolationFromReport(report, vendor);
            }
            
            return CitizenReportResult.builder()
                .success(true)
                .reportId(report.getId())
                .message("Report submitted successfully. Report ID: " + report.getId())
                .validationScore(report.getValidationScore())
                .build();
                
        } catch (Exception e) {
            log.error("Failed to submit citizen report", e);
            return CitizenReportResult.builder()
                .success(false)
                .message("Failed to submit report. Please try again.")
                .build();
        }
    }
    
    /**
     * Basic report validation
     */
    private ValidationResult validateReport(CitizenReportRequest request) {
        
        // Required fields
        if (request.getReporterName() == null || request.getReporterName().trim().isEmpty()) {
            return ValidationResult.builder()
                .valid(false)
                .errorMessage("Reporter name is required")
                .build();
        }
        
        if (request.getReporterPhone() == null || !isValidPhoneNumber(request.getReporterPhone())) {
            return ValidationResult.builder()
                .valid(false)
                .errorMessage("Valid phone number is required")
                .build();
        }
        
        if (request.getReportType() == null) {
            return ValidationResult.builder()
                .valid(false)
                .errorMessage("Report type is required")
                .build();
        }
        
        if (request.getDescription() == null || request.getDescription().trim().length() < 10) {
            return ValidationResult.builder()
                .valid(false)
                .errorMessage("Description must be at least 10 characters")
                .build();
        }
        
        if (request.getDescription().length() > 1000) {
            return ValidationResult.builder()
                .valid(false)
                .errorMessage("Description must not exceed 1000 characters")
                .build();
        }
        
        // Location validation
        if (request.getLatitude() == null || request.getLongitude() == null) {
            if (request.getLocationAddress() == null || request.getLocationAddress().trim().isEmpty()) {
                return ValidationResult.builder()
                    .valid(false)
                    .errorMessage("Either GPS coordinates or address is required")
                    .build();
            }
        } else {
            // Validate coordinates are within Solapur
            if (!isWithinSolapur(request.getLatitude(), request.getLongitude())) {
                return ValidationResult.builder()
                    .valid(false)
                    .errorMessage("Location must be within Solapur city limits")
                    .build();
            }
        }
        
        return ValidationResult.builder().valid(true).build();
    }
    
    /**
     * Check rate limiting
     */
    private RateLimitResult checkRateLimit(String phoneNumber, String ipAddress) {
        
        LocalDateTime now = LocalDateTime.now();
        
        // Check hourly limit
        long hourlyCount = reportRepository.countByReporterPhoneAndCreatedAtAfter(
            phoneNumber, now.minusHours(1));
        
        if (hourlyCount >= MAX_REPORTS_PER_HOUR) {
            return RateLimitResult.builder()
                .allowed(false)
                .message("Too many reports submitted in the last hour. Please wait before submitting again.")
                .build();
        }
        
        // Check daily limit
        long dailyCount = reportRepository.countByReporterPhoneAndCreatedAtAfter(
            phoneNumber, now.minusDays(1));
        
        if (dailyCount >= MAX_REPORTS_PER_DAY) {
            return RateLimitResult.builder()
                .allowed(false)
                .message("Daily report limit reached. Please try again tomorrow.")
                .build();
        }
        
        // Check IP-based limit
        long ipCount = reportRepository.countByIpAddressAndCreatedAtAfter(
            ipAddress, now.minusHours(1));
        
        if (ipCount >= MAX_REPORTS_PER_HOUR * 2) {
            return RateLimitResult.builder()
                .allowed(false)
                .message("Too many reports from this location. Please try again later.")
                .build();
        }
        
        return RateLimitResult.builder().allowed(true).build();
    }
    
    /**
     * Check for duplicate reports
     */
    private DuplicateCheckResult checkDuplicateReport(CitizenReportRequest request) {
        
        // Check for similar reports in last 24 hours
        List<CitizenReport> recentReports = reportRepository.findSimilarReports(
            request.getVendorId(),
            request.getLatitude(),
            request.getLongitude(),
            request.getReportType(),
            LocalDateTime.now().minusHours(24)
        );
        
        for (CitizenReport existingReport : recentReports) {
            
            double similarity = calculateReportSimilarity(request, existingReport);
            
            if (similarity >= 0.8) {
                return DuplicateCheckResult.builder()
                    .duplicate(true)
                    .existingReportId(existingReport.getId())
                    .similarity(similarity)
                    .build();
            }
        }
        
        return DuplicateCheckResult.builder().duplicate(false).build();
    }
    
    /**
     * Calculate validation score based on multiple factors
     */
    private double calculateValidationScore(CitizenReportRequest request, Vendor vendor) {
        
        double score = 0.0;
        
        // Reporter credibility (30%)
        score += calculateReporterCredibility(request) * 0.3;
        
        // Content quality (25%)
        score += calculateContentQuality(request) * 0.25;
        
        // Location accuracy (20%)
        score += calculateLocationAccuracy(request) * 0.2;
        
        // Vendor match (15%)
        score += calculateVendorMatch(request, vendor) * 0.15;
        
        // Image evidence (10%)
        score += calculateImageEvidence(request) * 0.1;
        
        return Math.min(1.0, Math.max(0.0, score));
    }
    
    /**
     * Calculate reporter credibility
     */
    private double calculateReporterCredibility(CitizenReportRequest request) {
        
        double credibility = 0.5; // Base score
        
        // Phone number format
        if (isValidPhoneNumber(request.getReporterPhone())) {
            credibility += 0.2;
        }
        
        // Email provided
        if (request.getReporterEmail() != null && isValidEmail(request.getReporterEmail())) {
            credibility += 0.1;
        }
        
        // Name format
        if (request.getReporterName().split(" ").length >= 2) {
            credibility += 0.1;
        }
        
        // Historical accuracy (if available)
        double historicalAccuracy = getHistoricalAccuracy(request.getReporterPhone());
        credibility += historicalAccuracy * 0.1;
        
        return Math.min(1.0, credibility);
    }
    
    /**
     * Calculate content quality
     */
    private double calculateContentQuality(CitizenReportRequest request) {
        
        double quality = 0.0;
        
        String description = request.getDescription();
        
        // Length
        if (description.length() >= 50) {
            quality += 0.3;
        } else if (description.length() >= 20) {
            quality += 0.2;
        }
        
        // Contains specific details
        if (containsSpecificDetails(description)) {
            quality += 0.3;
        }
        
        // Language quality (basic check)
        if (isReasonableLanguage(description)) {
            quality += 0.2;
        }
        
        // No excessive capitalization
        if (!isExcessiveCapitalization(description)) {
            quality += 0.1;
        }
        
        // No repeated characters
        if (!hasRepeatedCharacters(description)) {
            quality += 0.1;
        }
        
        return Math.min(1.0, quality);
    }
    
    /**
     * Calculate location accuracy
     */
    private double calculateLocationAccuracy(CitizenReportRequest request) {
        
        double accuracy = 0.0;
        
        // GPS coordinates provided
        if (request.getLatitude() != null && request.getLongitude() != null) {
            accuracy += 0.6;
            
            // Coordinates are precise
            if (request.getLatitude().toString().split("\\.")[1].length() >= 6 &&
                request.getLongitude().toString().split("\\.")[1].length() >= 6) {
                accuracy += 0.2;
            }
        }
        
        // Address provided
        if (request.getLocationAddress() != null && request.getLocationAddress().length() > 10) {
            accuracy += 0.2;
        }
        
        return Math.min(1.0, accuracy);
    }
    
    /**
     * Calculate vendor match score
     */
    private double calculateVendorMatch(CitizenReportRequest request, Vendor vendor) {
        
        if (vendor == null) {
            return 0.0;
        }
        
        double matchScore = 0.0;
        
        // Location proximity
        if (request.getLatitude() != null && vendor.getLocation() != null) {
            double distance = calculateDistance(
                request.getLatitude(), request.getLongitude(),
                vendor.getLocation().getLatitude(), vendor.getLocation().getLongitude()
            );
            
            if (distance <= 50) { // Within 50 meters
                matchScore += 0.5;
            } else if (distance <= 100) { // Within 100 meters
                matchScore += 0.3;
            } else if (distance <= 200) { // Within 200 meters
                matchScore += 0.1;
            }
        }
        
        // Report type matches vendor category
        if (isReportTypeRelevant(request.getReportType(), vendor.getCategory())) {
            matchScore += 0.3;
        }
        
        // Vendor is active
        if (vendor.getStatus() == VendorStatus.APPROVED) {
            matchScore += 0.2;
        }
        
        return Math.min(1.0, matchScore);
    }
    
    /**
     * Calculate image evidence score
     */
    private double calculateImageEvidence(CitizenReportRequest request) {
        
        double evidenceScore = 0.0;
        
        // Main image provided
        if (request.getImageFile() != null) {
            evidenceScore += 0.6;
            
            // Additional images provided
            if (request.getAdditionalImages() != null && !request.getAdditionalImages().isEmpty()) {
                evidenceScore += 0.2;
            }
        }
        
        return Math.min(1.0, evidenceScore);
    }
    
    /**
     * Create violation from high-scoring report
     */
    private void createViolationFromReport(CitizenReport report, Vendor vendor) {
        
        try {
            Violation violation = Violation.builder()
                .vendorId(vendor.getId())
                .violationType(convertReportTypeToViolationType(report.getReportType()))
                .detectionMethod(DetectionMethod.CITIZEN_REPORT)
                .description("Citizen report: " + report.getDescription())
                .locationLatitude(report.getLocationLatitude())
                .locationLongitude(report.getLocationLongitude())
                .imageProofUrl(report.getImageProofUrl())
                .reportedBy(report.getReporterName())
                .reportedByPhone(report.getReporterPhone())
                .status(ViolationStatus.PENDING)
                .autoDetected(false)
                .confidenceScore(report.getValidationScore())
                .createdAt(LocalDateTime.now())
                .build();
            
            violationRepository.save(violation);
            
            // Update report status
            report.setStatus(ReportStatus.CONFIRMED);
            reportRepository.save(report);
            
            // Notify relevant officers
            notificationService.sendViolationAlert(violation, vendor);
            
            log.info("Violation created from citizen report: {}", report.getId());
            
        } catch (Exception e) {
            log.error("Failed to create violation from report", e);
        }
    }
    
    // Utility methods
    private boolean isValidPhoneNumber(String phone) {
        return phone != null && phone.matches("^[6-9]\\d{9}$");
    }
    
    private boolean isValidEmail(String email) {
        return email != null && email.matches("^[A-Za-z0-9+_.-]+@(.+)$");
    }
    
    private boolean isWithinSolapur(double lat, double lng) {
        // Simple bounding box check for Solapur
        return lat >= 17.5 && lat <= 17.8 && lng >= 75.8 && lng <= 76.0;
    }
    
    private double calculateReportSimilarity(CitizenReportRequest request, CitizenReport existingReport) {
        
        double similarity = 0.0;
        
        // Same reporter
        if (request.getReporterPhone().equals(existingReport.getReporterPhone())) {
            similarity += 0.3;
        }
        
        // Same vendor
        if (request.getVendorId() != null && request.getVendorId().equals(existingReport.getVendorId())) {
            similarity += 0.3;
        }
        
        // Same report type
        if (request.getReportType().equals(existingReport.getReportType())) {
            similarity += 0.2;
        }
        
        // Location proximity
        if (request.getLatitude() != null && existingReport.getLocationLatitude() != null) {
            double distance = calculateDistance(
                request.getLatitude(), request.getLongitude(),
                existingReport.getLocationLatitude(), existingReport.getLocationLongitude()
            );
            
            if (distance <= 50) {
                similarity += 0.2;
            }
        }
        
        return similarity;
    }
    
    private double calculateDistance(double lat1, double lng1, double lat2, double lng2) {
        final int R = 6371; // Earth's radius in kilometers
        
        double latDistance = Math.toRadians(lat2 - lat1);
        double lngDistance = Math.toRadians(lng2 - lng1);
        
        double a = Math.sin(latDistance / 2) * Math.sin(latDistance / 2) +
                Math.cos(Math.toRadians(lat1)) * Math.cos(Math.toRadians(lat2)) *
                Math.sin(lngDistance / 2) * Math.sin(lngDistance / 2);
        
        double c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        
        return R * c * 1000; // Distance in meters
    }
    
    private ViolationType convertReportTypeToViolationType(ReportType reportType) {
        return switch (reportType) {
            case LOCATION_VIOLATION -> ViolationType.LOCATION_VIOLATION;
            case TIME_VIOLATION -> ViolationType.TIME_RESTRICTION;
            case OVERCROWDING -> ViolationType.OVERCROWDING;
            case UNAUTHORIZED_VENDOR -> ViolationType.UNAUTHORIZED_ZONE;
            default -> ViolationType.LOCATION_VIOLATION;
        };
    }
}
```

### 3. Citizen Reporting Controller

```java
@RestController
@RequestMapping("/api/citizen-reports")
@Validated
public class CitizenReportingController {
    
    @Autowired
    private CitizenReportingService reportingService;
    
    @Autowired
    private CitizenReportRepository reportRepository;
    
    /**
     * Submit citizen report
     */
    @PostMapping("/submit")
    public ResponseEntity<ApiResponse<CitizenReportResult>> submitReport(
            @ModelAttribute @Valid CitizenReportRequest request,
            HttpServletRequest httpRequest) {
        
        try {
            CitizenReportResult result = reportingService.submitReport(request, httpRequest);
            
            return ResponseEntity.ok(ApiResponse.success(result));
            
        } catch (Exception e) {
            log.error("Failed to submit citizen report", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(ApiResponse.error("Failed to submit report"));
        }
    }
    
    /**
     * Get report status
     */
    @GetMapping("/status/{reportId}")
    public ResponseEntity<ApiResponse<CitizenReport>> getReportStatus(@PathVariable Long reportId) {
        
        CitizenReport report = reportRepository.findById(reportId)
            .orElseThrow(() -> new ResourceNotFoundException("Report not found"));
        
        return ResponseEntity.ok(ApiResponse.success(report));
    }
    
    /**
     * Get reports for citizen
     */
    @GetMapping("/my-reports")
    public ResponseEntity<ApiResponse<List<CitizenReport>>> getMyReports(
            @RequestParam String phoneNumber,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        
        Pageable pageable = PageRequest.of(page, size, Sort.by("createdAt").descending());
        Page<CitizenReport> reports = reportRepository
            .findByReporterPhoneOrderByCreatedAtDesc(phoneNumber, pageable);
        
        return ResponseEntity.ok(ApiResponse.success(reports.getContent()));
    }
    
    /**
     * Get report statistics (public)
     */
    @GetMapping("/statistics")
    public ResponseEntity<ApiResponse<ReportStatistics>> getStatistics(
            @RequestParam(defaultValue = "30") int days) {
        
        LocalDate startDate = LocalDate.now().minusDays(days);
        
        List<CitizenReport> reports = reportRepository
            .findByCreatedAtAfter(startDate.atStartOfDay());
        
        ReportStatistics stats = ReportStatistics.builder()
            .totalReports(reports.size())
            .byStatus(reports.stream()
                .collect(Collectors.groupingBy(CitizenReport::getStatus, Collectors.counting())))
            .byType(reports.stream()
                .collect(Collectors.groupingBy(CitizenReport::getReportType, Collectors.counting())))
            .resolvedCount(reports.stream()
                .mapToLong(r -> r.getStatus() == ReportStatus.RESOLVED ? 1 : 0)
                .sum())
            .averageResolutionTime(calculateAverageResolutionTime(reports))
            .build();
        
        return ResponseEntity.ok(ApiResponse.success(stats));
    }
}
```

### 4. Database Migration

```sql
-- Create citizen reports table
CREATE TABLE citizen_reports (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    vendor_id BIGINT,
    reporter_name VARCHAR(100) NOT NULL,
    reporter_phone VARCHAR(20) NOT NULL,
    reporter_email VARCHAR(100),
    report_type ENUM('LOCATION_VIOLATION', 'TIME_VIOLATION', 'OVERCROWDING', 'UNAUTHORIZED_VENDOR', 'HYGIENE_ISSUE', 'PRICE_COMPLAINT', 'BEHAVIOR_ISSUE', 'OTHER') NOT NULL,
    description TEXT NOT NULL,
    location_latitude DECIMAL(10,8),
    location_longitude DECIMAL(11,8),
    location_address VARCHAR(500),
    image_proof_url VARCHAR(500),
    additional_images JSON,
    status ENUM('PENDING_REVIEW', 'UNDER_INVESTIGATION', 'CONFIRMED', 'DISMISSED', 'RESOLVED') DEFAULT 'PENDING_REVIEW',
    validation_score DECIMAL(3,2),
    is_duplicate BOOLEAN DEFAULT FALSE,
    duplicate_report_id BIGINT,
    officer_assigned_id BIGINT,
    resolution_notes TEXT,
    ip_address VARCHAR(45),
    user_agent TEXT,
    device_fingerprint VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_citizen_reports_phone_created (reporter_phone, created_at),
    INDEX idx_citizen_reports_ip_created (ip_address, created_at),
    INDEX idx_citizen_reports_vendor_created (vendor_id, created_at),
    INDEX idx_citizen_reports_status_created (status, created_at),
    INDEX idx_citizen_reports_location (location_latitude, location_longitude),
    INDEX idx_citizen_reports_type_created (report_type, created_at)
);

-- Add foreign key constraints
ALTER TABLE citizen_reports 
ADD CONSTRAINT fk_citizen_reports_vendor 
FOREIGN KEY (vendor_id) REFERENCES vendors(id) ON DELETE SET NULL,
ADD CONSTRAINT fk_citizen_reports_officer 
FOREIGN KEY (officer_assigned_id) REFERENCES users(id) ON DELETE SET NULL,
ADD CONSTRAINT fk_citizen_reports_duplicate 
FOREIGN KEY (duplicate_report_id) REFERENCES citizen_reports(id) ON DELETE SET NULL;
```

This citizen reporting system provides **effective validation and filtering** to reduce fake reports while maintaining accessibility for genuine citizen complaints.
