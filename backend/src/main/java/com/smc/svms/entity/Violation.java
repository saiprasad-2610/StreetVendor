package com.smc.svms.entity;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.smc.svms.enums.ValidationStatus;
import jakarta.persistence.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "violations", indexes = {
    @Index(name = "idx_violation_vendor", columnList = "vendor_id"),
    @Index(name = "idx_violation_reported_by", columnList = "reported_by"),
    @Index(name = "idx_violation_status", columnList = "validation_status"),
    @Index(name = "idx_violations_detection_method", columnList = "detection_method"),
    @Index(name = "idx_violations_reporter", columnList = "reported_by"),
    @Index(name = "idx_violations_confidence", columnList = "confidence_score")
})
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
public class Violation {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "vendor_id", nullable = false)
    @JsonIgnoreProperties({"location", "qrCode", "createdBy"})
    private Vendor vendor;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "reported_by", nullable = true)
    private User reportedBy;

    // NEW: Violation type for better categorization
    @Enumerated(EnumType.STRING)
    @Column(name = "violation_type", nullable = false, length = 30)
    private ViolationType violationType = ViolationType.OTHER;

    // NEW: Detection method
    @Enumerated(EnumType.STRING)
    @Column(name = "detection_method", nullable = false, length = 20)
    private DetectionMethod detectionMethod = DetectionMethod.MANUAL;

    @Column(name = "image_proof_url", columnDefinition = "LONGTEXT")
    @Lob
    private String imageProofUrl;

    @Column(name = "gps_latitude", precision = 10, scale = 8)
    private BigDecimal gpsLatitude;

    @Column(name = "gps_longitude", precision = 11, scale = 8)
    private BigDecimal gpsLongitude;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(name = "reporter_name")
    private String reporterName;

    @Column(name = "reporter_phone")
    private String reporterPhone;

    // NEW: Auto-detection flag
    @Column(name = "auto_detected", nullable = false)
    private Boolean autoDetected = false;

    // NEW: Confidence score for AI/automated detection
    @Column(name = "confidence_score")
    private Double confidenceScore;

    // NEW: Distance from zone
    @Column(name = "distance_from_zone", precision = 10, scale = 2)
    private BigDecimal distanceFromZone;

    @Column(name = "captured_at")
    private LocalDateTime capturedAt;

    @Enumerated(EnumType.STRING)
    @Column(name = "validation_status", nullable = false, length = 30)
    private com.smc.svms.enums.ValidationStatus validationStatus = com.smc.svms.enums.ValidationStatus.PENDING;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
    
    public Violation() {}
    
    // Getters and Setters
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    
    public Vendor getVendor() { return vendor; }
    public void setVendor(Vendor vendor) { this.vendor = vendor; }
    
    public User getReportedBy() { return reportedBy; }
    public void setReportedBy(User reportedBy) { this.reportedBy = reportedBy; }
    
    public ViolationType getViolationType() { return violationType; }
    public void setViolationType(ViolationType violationType) { this.violationType = violationType; }
    
    public DetectionMethod getDetectionMethod() { return detectionMethod; }
    public void setDetectionMethod(DetectionMethod detectionMethod) { this.detectionMethod = detectionMethod; }
    
    public String getImageProofUrl() { return imageProofUrl; }
    public void setImageProofUrl(String imageProofUrl) { this.imageProofUrl = imageProofUrl; }
    
    public BigDecimal getGpsLatitude() { return gpsLatitude; }
    public void setGpsLatitude(BigDecimal gpsLatitude) { this.gpsLatitude = gpsLatitude; }
    
    public BigDecimal getGpsLongitude() { return gpsLongitude; }
    public void setGpsLongitude(BigDecimal gpsLongitude) { this.gpsLongitude = gpsLongitude; }
    
    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }
    
    public String getReporterName() { return reporterName; }
    public void setReporterName(String reporterName) { this.reporterName = reporterName; }
    
    public String getReporterPhone() { return reporterPhone; }
    public void setReporterPhone(String reporterPhone) { this.reporterPhone = reporterPhone; }
    
    public Boolean getAutoDetected() { return autoDetected; }
    public void setAutoDetected(Boolean autoDetected) { this.autoDetected = autoDetected; }
    
    public boolean isAutoDetected() { return autoDetected != null && autoDetected; }
    
    public Double getConfidenceScore() { return confidenceScore; }
    public void setConfidenceScore(Double confidenceScore) { this.confidenceScore = confidenceScore; }
    
    public BigDecimal getDistanceFromZone() { return distanceFromZone; }
    public void setDistanceFromZone(BigDecimal distanceFromZone) { this.distanceFromZone = distanceFromZone; }
    
    public LocalDateTime getCapturedAt() { return capturedAt; }
    public void setCapturedAt(LocalDateTime capturedAt) { this.capturedAt = capturedAt; }
    
    public com.smc.svms.enums.ValidationStatus getValidationStatus() { return validationStatus; }
    public void setValidationStatus(com.smc.svms.enums.ValidationStatus validationStatus) { this.validationStatus = validationStatus; }
    
    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
    
    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }

    // NEW: Resolution fields for violation review workflow
    @Enumerated(EnumType.STRING)
    @Column(name = "resolution_action", length = 20)
    private com.smc.svms.enums.ViolationAction resolutionAction;

    @Column(name = "resolution_notes", columnDefinition = "TEXT")
    private String resolutionNotes;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "resolved_by")
    @JsonIgnoreProperties({"password", "roles", "createdAt", "updatedAt"})
    private User resolvedBy;

    @Column(name = "resolved_at")
    private LocalDateTime resolvedAt;

    @Column(name = "challan_issued")
    private Boolean challanIssued = false;

    @Column(name = "warning_number")
    private Integer warningNumber;

    public com.smc.svms.enums.ViolationAction getResolutionAction() { return resolutionAction; }
    public void setResolutionAction(com.smc.svms.enums.ViolationAction resolutionAction) { this.resolutionAction = resolutionAction; }

    public String getResolutionNotes() { return resolutionNotes; }
    public void setResolutionNotes(String resolutionNotes) { this.resolutionNotes = resolutionNotes; }

    public User getResolvedBy() { return resolvedBy; }
    public void setResolvedBy(User resolvedBy) { this.resolvedBy = resolvedBy; }

    public LocalDateTime getResolvedAt() { return resolvedAt; }
    public void setResolvedAt(LocalDateTime resolvedAt) { this.resolvedAt = resolvedAt; }

    public Boolean getChallanIssued() { return challanIssued; }
    public void setChallanIssued(Boolean challanIssued) { this.challanIssued = challanIssued; }

    public Integer getWarningNumber() { return warningNumber; }
    public void setWarningNumber(Integer warningNumber) { this.warningNumber = warningNumber; }

    /**
     * Check if violation has been resolved
     */
    public boolean isResolved() {
        return this.resolvedAt != null || this.resolutionAction != null;
    }

    // Static builder method
    public static Builder builder() {
        return new Builder();
    }
    
    public static class Builder {
        private Long id;
        private Vendor vendor;
        private User reportedBy;
        private ViolationType violationType = ViolationType.OTHER;
        private DetectionMethod detectionMethod = DetectionMethod.MANUAL;
        private String imageProofUrl;
        private BigDecimal gpsLatitude;
        private BigDecimal gpsLongitude;
        private String description;
        private String reporterName;
        private String reporterPhone;
        private Boolean autoDetected = false;
        private Double confidenceScore;
        private BigDecimal distanceFromZone;
        private LocalDateTime capturedAt;
        private LocalDateTime createdAt;
        private ValidationStatus validationStatus = ValidationStatus.PENDING;
        
        public Builder id(Long id) {
            this.id = id;
            return this;
        }
        
        public Builder vendor(Vendor vendor) {
            this.vendor = vendor;
            return this;
        }
        
        public Builder reportedBy(User reportedBy) {
            this.reportedBy = reportedBy;
            return this;
        }
        
        public Builder violationType(ViolationType violationType) {
            this.violationType = violationType;
            return this;
        }
        
        public Builder detectionMethod(DetectionMethod detectionMethod) {
            this.detectionMethod = detectionMethod;
            return this;
        }
        
        public Builder imageProofUrl(String imageProofUrl) {
            this.imageProofUrl = imageProofUrl;
            return this;
        }
        
        public Builder gpsLatitude(BigDecimal gpsLatitude) {
            this.gpsLatitude = gpsLatitude;
            return this;
        }
        
        public Builder gpsLongitude(BigDecimal gpsLongitude) {
            this.gpsLongitude = gpsLongitude;
            return this;
        }
        
        public Builder description(String description) {
            this.description = description;
            return this;
        }
        
        public Builder reporterName(String reporterName) {
            this.reporterName = reporterName;
            return this;
        }
        
        public Builder reporterPhone(String reporterPhone) {
            this.reporterPhone = reporterPhone;
            return this;
        }
        
        public Builder autoDetected(Boolean autoDetected) {
            this.autoDetected = autoDetected;
            return this;
        }
        
        public Builder confidenceScore(Double confidenceScore) {
            this.confidenceScore = confidenceScore;
            return this;
        }
        
        public Builder distanceFromZone(BigDecimal distanceFromZone) {
            this.distanceFromZone = distanceFromZone;
            return this;
        }
        
        public Builder capturedAt(LocalDateTime capturedAt) {
            this.capturedAt = capturedAt;
            return this;
        }
        
        public Builder createdAt(LocalDateTime createdAt) {
            this.createdAt = createdAt;
            return this;
        }
        
        public Builder validationStatus(ValidationStatus validationStatus) {
            this.validationStatus = validationStatus;
            return this;
        }
        
        public Violation build() {
            Violation violation = new Violation();
            violation.id = id;
            violation.vendor = vendor;
            violation.reportedBy = reportedBy;
            violation.violationType = violationType;
            violation.detectionMethod = detectionMethod;
            violation.imageProofUrl = imageProofUrl;
            violation.gpsLatitude = gpsLatitude;
            violation.gpsLongitude = gpsLongitude;
            violation.description = description;
            violation.reporterName = reporterName;
            violation.reporterPhone = reporterPhone;
            violation.autoDetected = autoDetected;
            violation.confidenceScore = confidenceScore;
            violation.distanceFromZone = distanceFromZone;
            violation.capturedAt = capturedAt;
            violation.createdAt = createdAt;
            violation.validationStatus = validationStatus;
            return violation;
        }
    }
}
