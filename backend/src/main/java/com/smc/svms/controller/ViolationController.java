package com.smc.svms.controller;

import com.smc.svms.dto.ViolationRequest;
import com.smc.svms.dto.ApiResponse;
import com.smc.svms.entity.Violation;
import com.smc.svms.entity.ViolationType;
import com.smc.svms.service.ViolationService;
import com.smc.svms.service.BasicViolationDetectionService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import jakarta.validation.Valid;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

@RestController
@RequestMapping("/api/violations")
public class ViolationController {

    private static final Logger log = LoggerFactory.getLogger(ViolationController.class);

    private final ViolationService violationService;
    private final BasicViolationDetectionService violationDetectionService;

    public ViolationController(ViolationService violationService, BasicViolationDetectionService violationDetectionService) {
        this.violationService = violationService;
        this.violationDetectionService = violationDetectionService;
    }

    @PostMapping("/report")
    public ResponseEntity<?> reportViolation(
            @RequestParam("vendorId") String vendorId,
            @RequestParam("description") String description,
            @RequestParam("gpsLatitude") Double gpsLatitude,
            @RequestParam("gpsLongitude") Double gpsLongitude,
            @RequestParam(value = "reporterName", required = false) String reporterName,
            @RequestParam(value = "reporterPhone", required = false) String reporterPhone,
            @RequestParam(value = "image", required = false) MultipartFile image,
            @RequestParam(value = "images", required = false) List<MultipartFile> images,
            @RequestParam(value = "photoCount", required = false) Integer photoCount) {
        
        try {
            log.info("Violation report received for vendor: {} with {} photos", vendorId, photoCount);
            
            // Handle multiple images
            List<MultipartFile> imageList = new ArrayList<>();
            if (images != null && !images.isEmpty()) {
                imageList.addAll(images);
            } else if (image != null && !image.isEmpty()) {
                imageList.add(image);
            }
            
            if (imageList.isEmpty()) {
                return ResponseEntity.badRequest()
                    .body(ApiResponse.error("At least one photo is required for violation report"));
            }
            
            ViolationRequest request = new ViolationRequest();
            request.setVendorId(vendorId);
            request.setDescription(description);
            request.setGpsLatitude(gpsLatitude);
            request.setGpsLongitude(gpsLongitude);
            request.setReporterName(reporterName);
            request.setReporterPhone(reporterPhone);
            request.setCapturedAt(LocalDateTime.now());

            // Save all images and get URLs
            List<String> imageUrls = violationService.reportViolationWithImages(request, imageList);
            log.info("Violation reported successfully with {} images", imageUrls.size());
            return ResponseEntity.ok(ApiResponse.success("Violation reported successfully with " + imageUrls.size() + " images"));
        } catch (Exception e) {
            log.error("Failed to report violation", e);
            return ResponseEntity.badRequest()
                .body(ApiResponse.error("Failed to report violation: " + e.getMessage()));
        }
    }

    /**
     * Create manual violation (Phase 1 enhancement)
     */
    @PostMapping("/manual")
    @PreAuthorize("hasAnyRole('ADMIN', 'OFFICER')")
    public ResponseEntity<ApiResponse<Violation>> createManualViolation(
            @Valid @RequestBody ManualViolationRequest request,
            @RequestHeader("X-User-ID") Long officerId) {

        try {
            ViolationRequest violationRequest = new ViolationRequest();
            violationRequest.setVendorId(String.valueOf(request.getVendorId()));
            violationRequest.setViolationType(request.getViolationType());
            violationRequest.setDescription(request.getDescription());
            violationRequest.setReporterName(request.getReporterName());
            violationRequest.setReporterPhone(request.getReporterPhone());
            violationRequest.setCapturedAt(LocalDateTime.now());

            Violation violation = violationDetectionService.createManualViolation(
                com.smc.svms.dto.ViolationRequest.builder()
                    .vendorId(String.valueOf(request.getVendorId()))
                    .violationType(request.getViolationType())
                    .description(request.getDescription())
                    .reporterName(request.getReporterName())
                    .reporterPhone(request.getReporterPhone())
                    .imageProofUrl(request.getImageProofUrl())
                    .reportedByUserId(officerId)
                    .build()
            );

            return ResponseEntity.status(201)
                .body(ApiResponse.success(violation));

        } catch (Exception e) {
            log.error("Failed to create manual violation", e);
            return ResponseEntity.badRequest()
                .body(ApiResponse.error("Failed to create violation: " + e.getMessage()));
        }
    }

    /**
     * Create violation from citizen report (Phase 1 enhancement)
     */
    @PostMapping("/citizen-report")
    public ResponseEntity<ApiResponse<Violation>> createViolationFromCitizenReport(
            @Valid @RequestBody CitizenViolationRequest request) {
        
        try {
            Violation violation = violationDetectionService.createViolationFromCitizenReport(
                request.getVendorId(),
                request.getReportType(),
                request.getDescription(),
                request.getReporterName(),
                request.getReporterPhone(),
                request.getImageUrl()
            );

            return ResponseEntity.status(201)
                .body(ApiResponse.success(violation));

        } catch (Exception e) {
            log.error("Failed to create violation from citizen report", e);
            return ResponseEntity.badRequest()
                .body(ApiResponse.error("Failed to create violation: " + e.getMessage()));
        }
    }

    /**
     * Trigger manual violation detection (Phase 1 enhancement)
     */
    @PostMapping("/detect")
    @PreAuthorize("hasAnyRole('ADMIN', 'OFFICER')")
    public ResponseEntity<ApiResponse<String>> triggerViolationDetection() {
        
        try {
            List<Violation> violations = violationDetectionService.detectViolations();
            
            if (!violations.isEmpty()) {
                // Save violations
                violationService.saveAll(violations);
                
                return ResponseEntity.ok(ApiResponse.success(
                    String.format("Detected and created %d violations", violations.size())));
            } else {
                return ResponseEntity.ok(ApiResponse.success("No violations detected"));
            }

        } catch (Exception e) {
            log.error("Failed to trigger violation detection", e);
            return ResponseEntity.badRequest()
                .body(ApiResponse.error("Failed to detect violations: " + e.getMessage()));
        }
    }

    /**
     * Get violation statistics (Phase 1 enhancement)
     */
    @GetMapping("/statistics")
    @PreAuthorize("hasAnyRole('ADMIN', 'OFFICER')")
    public ResponseEntity<ApiResponse<com.smc.svms.service.ViolationStatistics>> getViolationStatistics() {
        
        try {
            var statistics = violationDetectionService.getViolationStatistics();
            return ResponseEntity.ok(ApiResponse.success(statistics));
        } catch (Exception e) {
            log.error("Failed to get violation statistics", e);
            return ResponseEntity.internalServerError()
                .body(ApiResponse.error("Failed to get statistics"));
        }
    }

    /**
     * Get all violations
     */
    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'OFFICER')")
    public ResponseEntity<ApiResponse<List<Violation>>> getAllViolations() {
        
        try {
            List<Violation> violations = violationService.getAllViolations();
            return ResponseEntity.ok(ApiResponse.success(violations));
        } catch (Exception e) {
            // Failed to get all violations
            return ResponseEntity.internalServerError()
                .body(ApiResponse.error("Failed to fetch violations"));
        }
    }

    /**
     * Get violations by vendor
     */
    @GetMapping("/vendor/{vendorId}")
    @PreAuthorize("hasAnyRole('ADMIN', 'OFFICER')")
    public ResponseEntity<ApiResponse<List<Violation>>> getViolationsByVendorId(@PathVariable String vendorId) {
        
        try {
            List<Violation> violations = violationService.getViolationsByVendorId(vendorId);
            return ResponseEntity.ok(ApiResponse.success(violations));
        } catch (Exception e) {
            // Failed to get violations for vendor
            return ResponseEntity.internalServerError()
                .body(ApiResponse.error("Failed to fetch violations"));
        }
    }

    /**
     * Get violations by type (Phase 1 enhancement)
     */
    @GetMapping("/type/{violationType}")
    @PreAuthorize("hasAnyRole('ADMIN', 'OFFICER')")
    public ResponseEntity<ApiResponse<List<Violation>>> getViolationsByType(@PathVariable ViolationType violationType) {
        
        try {
            List<Violation> violations = violationService.getViolationsByType(violationType);
            return ResponseEntity.ok(ApiResponse.success(violations));
        } catch (Exception e) {
            // Failed to get violations by type
            return ResponseEntity.internalServerError()
                .body(ApiResponse.error("Failed to fetch violations"));
        }
    }

    /**
     * Get auto-detected violations (Phase 1 enhancement)
     */
    @GetMapping("/auto-detected")
    @PreAuthorize("hasAnyRole('ADMIN', 'OFFICER')")
    public ResponseEntity<ApiResponse<List<Violation>>> getAutoDetectedViolations() {

        try {
            List<Violation> violations = violationService.getAutoDetectedViolations();
            return ResponseEntity.ok(ApiResponse.success(violations));
        } catch (Exception e) {
            // Failed to get auto-detected violations
            return ResponseEntity.internalServerError()
                .body(ApiResponse.error("Failed to fetch violations"));
        }
    }

    /**
     * Resolve a violation with one of three actions:
     * - ISSUE_CHALLAN: Issue a fine to the vendor
     * - ISSUE_WARNING: Send a warning notification (max 3 warnings)
     * - NO_ACTION: Dismiss as fake/invalid violation
     */
    @PostMapping("/{violationId}/resolve")
    @PreAuthorize("hasAnyRole('ADMIN', 'OFFICER')")
    public ResponseEntity<ApiResponse<Violation>> resolveViolation(
            @PathVariable Long violationId,
            @RequestBody @Valid ResolveViolationRequest request,
            @RequestHeader("X-User-ID") Long officerId) {

        try {
            Violation resolvedViolation = violationService.resolveViolation(
                    violationId,
                    request.getActionAsEnum(),
                    request.getNotes(),
                    officerId
            );

            String message = switch (request.getActionAsEnum()) {
                case ISSUE_CHALLAN -> "Challan issued successfully";
                case ISSUE_WARNING -> "Warning #" + resolvedViolation.getWarningNumber() + " issued to vendor";
                case NO_ACTION -> "Violation marked as fake/invalid and dismissed";
            };

            return ResponseEntity.ok(ApiResponse.success(message, resolvedViolation));

        } catch (Exception e) {
            log.error("Failed to resolve violation {}", violationId, e);
            return ResponseEntity.badRequest()
                    .body(ApiResponse.error("Failed to resolve violation: " + e.getMessage()));
        }
    }

    /**
     * Get violation by ID
     */
    @GetMapping("/{violationId}")
    @PreAuthorize("hasAnyRole('ADMIN', 'OFFICER')")
    public ResponseEntity<ApiResponse<Violation>> getViolationById(@PathVariable Long violationId) {

        try {
            // This would need a findById method in the service
            // For now, we'll get all and filter
            List<Violation> violations = violationService.getAllViolations();
            Violation violation = violations.stream()
                    .filter(v -> v.getId().equals(violationId))
                    .findFirst()
                    .orElseThrow(() -> new RuntimeException("Violation not found"));

            return ResponseEntity.ok(ApiResponse.success(violation));

        } catch (Exception e) {
            log.error("Failed to get violation {}", violationId, e);
            return ResponseEntity.badRequest()
                    .body(ApiResponse.error("Failed to get violation: " + e.getMessage()));
        }
    }
}

// DTOs for enhanced violation endpoints
class ManualViolationRequest {
    private Long vendorId;
    private ViolationType violationType;
    private String description;
    private String reporterName;
    private String reporterPhone;
    private String imageProofUrl;
    
    public ManualViolationRequest() {}
    
    public ManualViolationRequest(Long vendorId, ViolationType violationType, String description, String reporterName, String reporterPhone, String imageProofUrl) {
        this.vendorId = vendorId;
        this.violationType = violationType;
        this.description = description;
        this.reporterName = reporterName;
        this.reporterPhone = reporterPhone;
        this.imageProofUrl = imageProofUrl;
    }
    
    // Getters and Setters
    public Long getVendorId() { return vendorId; }
    public void setVendorId(Long vendorId) { this.vendorId = vendorId; }
    
    public ViolationType getViolationType() { return violationType; }
    public void setViolationType(ViolationType violationType) { this.violationType = violationType; }
    
    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }
    
    public String getReporterName() { return reporterName; }
    public void setReporterName(String reporterName) { this.reporterName = reporterName; }
    
    public String getReporterPhone() { return reporterPhone; }
    public void setReporterPhone(String reporterPhone) { this.reporterPhone = reporterPhone; }
    
    public String getImageProofUrl() { return imageProofUrl; }
    public void setImageProofUrl(String imageProofUrl) { this.imageProofUrl = imageProofUrl; }
}

class CitizenViolationRequest {
    private Long vendorId;
    private String reportType;
    private String description;
    private String reporterName;
    private String reporterPhone;
    private String imageUrl;
    
    public CitizenViolationRequest() {}
    
    public CitizenViolationRequest(Long vendorId, String reportType, String description, String reporterName, String reporterPhone, String imageUrl) {
        this.vendorId = vendorId;
        this.reportType = reportType;
        this.description = description;
        this.reporterName = reporterName;
        this.reporterPhone = reporterPhone;
        this.imageUrl = imageUrl;
    }
    
    // Getters and Setters
    public Long getVendorId() { return vendorId; }
    public void setVendorId(Long vendorId) { this.vendorId = vendorId; }
    
    public String getReportType() { return reportType; }
    public void setReportType(String reportType) { this.reportType = reportType; }
    
    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }
    
    public String getReporterName() { return reporterName; }
    public void setReporterName(String reporterName) { this.reporterName = reporterName; }
    
    public String getReporterPhone() { return reporterPhone; }
    public void setReporterPhone(String reporterPhone) { this.reporterPhone = reporterPhone; }
    
    public String getImageUrl() { return imageUrl; }
    public void setImageUrl(String imageUrl) { this.imageUrl = imageUrl; }
}

class ViolationStatistics {
    private long totalViolations;
    private long autoDetected;
    private long manualDetected;
    private double autoDetectionRate;
    
    public ViolationStatistics() {}
    
    public ViolationStatistics(long totalViolations, long autoDetected, long manualDetected, double autoDetectionRate) {
        this.totalViolations = totalViolations;
        this.autoDetected = autoDetected;
        this.manualDetected = manualDetected;
        this.autoDetectionRate = autoDetectionRate;
    }
    
    // Getters and Setters
    public long getTotalViolations() { return totalViolations; }
    public void setTotalViolations(long totalViolations) { this.totalViolations = totalViolations; }
    
    public long getAutoDetected() { return autoDetected; }
    public void setAutoDetected(long autoDetected) { this.autoDetected = autoDetected; }
    
    public long getManualDetected() { return manualDetected; }
    public void setManualDetected(long manualDetected) { this.manualDetected = manualDetected; }
    
    public double getAutoDetectionRate() { return autoDetectionRate; }
    public void setAutoDetectionRate(double autoDetectionRate) { this.autoDetectionRate = autoDetectionRate; }
    
    // Static builder method
    public static Builder builder() {
        return new Builder();
    }
    
    public static class Builder {
        private long totalViolations;
        private long autoDetected;
        private long manualDetected;
        private double autoDetectionRate;
        
        public Builder totalViolations(long totalViolations) {
            this.totalViolations = totalViolations;
            return this;
        }
        
        public Builder autoDetected(long autoDetected) {
            this.autoDetected = autoDetected;
            return this;
        }
        
        public Builder manualDetected(long manualDetected) {
            this.manualDetected = manualDetected;
            return this;
        }
        
        public Builder autoDetectionRate(double autoDetectionRate) {
            this.autoDetectionRate = autoDetectionRate;
            return this;
        }
        
        public ViolationStatistics build() {
            return new ViolationStatistics(totalViolations, autoDetected, manualDetected, autoDetectionRate);
        }
    }
}

/**
 * DTO for resolving a violation with one of three actions
 */
class ResolveViolationRequest {
    private String action;  // Accept string for frontend compatibility
    private String notes;

    public ResolveViolationRequest() {}

    public ResolveViolationRequest(String action, String notes) {
        this.action = action;
        this.notes = notes;
    }

    // Getters and Setters
    public String getAction() { return action; }
    public void setAction(String action) { this.action = action; }

    public String getNotes() { return notes; }
    public void setNotes(String notes) { this.notes = notes; }

    // Helper method to convert string to enum
    public com.smc.svms.enums.ViolationAction getActionAsEnum() {
        if (action == null) return null;
        try {
            return com.smc.svms.enums.ViolationAction.valueOf(action);
        } catch (IllegalArgumentException e) {
            throw new IllegalArgumentException("Invalid action: " + action);
        }
    }
}
