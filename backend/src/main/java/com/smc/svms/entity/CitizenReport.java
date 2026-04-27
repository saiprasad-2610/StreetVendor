package com.smc.svms.entity;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "citizen_reports", indexes = {
    @Index(name = "idx_citizen_reports_phone_created", columnList = "reporter_phone, created_at"),
    @Index(name = "idx_citizen_reports_ip_created", columnList = "ip_address, created_at"),
    @Index(name = "idx_citizen_reports_vendor_created", columnList = "vendor_id, created_at"),
    @Index(name = "idx_citizen_reports_status_created", columnList = "status, created_at"),
    @Index(name = "idx_citizen_reports_location", columnList = "location_latitude, location_longitude"),
    @Index(name = "idx_citizen_reports_type_created", columnList = "report_type, created_at")
})
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
public class CitizenReport {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "vendor_id")
    @JsonIgnoreProperties({"location", "qrCode", "createdBy"})
    private Vendor vendor;
    
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
    
    @Column(name = "location_latitude")
    private Double locationLatitude;
    
    @Column(name = "location_longitude")
    private Double locationLongitude;
    
    @Column(name = "location_address", length = 500)
    private String locationAddress;
    
    @Column(name = "image_proof_url", length = 500)
    private String imageProofUrl;
    
    @Column(name = "additional_images", columnDefinition = "JSON")
    private String additionalImages;
    
    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 20)
    private ReportStatus status = ReportStatus.SUBMITTED;
    
    @Column(name = "validation_score")
    private Double validationScore;
    
    @Column(name = "is_duplicate", nullable = false)
    private Boolean isDuplicate = false;
    
    @Column(name = "duplicate_report_id")
    private Long duplicateReportId;
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "officer_assigned_id")
    private User officerAssigned;
    
    @Column(name = "resolution_notes", columnDefinition = "TEXT")
    private String resolutionNotes;
    
    @Column(name = "ip_address", length = 45)
    private String ipAddress;
    
    @Column(name = "user_agent", length = 500)
    private String userAgent;
    
    @Column(name = "device_fingerprint", length = 100)
    private String deviceFingerprint;
    
    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;
    
    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;
    
    public CitizenReport() {}

    // Getters and Setters
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Vendor getVendor() { return vendor; }
    public void setVendor(Vendor vendor) { this.vendor = vendor; }

    public String getReporterName() { return reporterName; }
    public void setReporterName(String reporterName) { this.reporterName = reporterName; }

    public String getReporterPhone() { return reporterPhone; }
    public void setReporterPhone(String reporterPhone) { this.reporterPhone = reporterPhone; }

    public String getReporterEmail() { return reporterEmail; }
    public void setReporterEmail(String reporterEmail) { this.reporterEmail = reporterEmail; }

    public ReportType getReportType() { return reportType; }
    public void setReportType(ReportType reportType) { this.reportType = reportType; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }

    public Double getLocationLatitude() { return locationLatitude; }
    public void setLocationLatitude(Double locationLatitude) { this.locationLatitude = locationLatitude; }

    public Double getLocationLongitude() { return locationLongitude; }
    public void setLocationLongitude(Double locationLongitude) { this.locationLongitude = locationLongitude; }

    public String getLocationAddress() { return locationAddress; }
    public void setLocationAddress(String locationAddress) { this.locationAddress = locationAddress; }

    public String getImageProofUrl() { return imageProofUrl; }
    public void setImageProofUrl(String imageProofUrl) { this.imageProofUrl = imageProofUrl; }

    public String getAdditionalImages() { return additionalImages; }
    public void setAdditionalImages(String additionalImages) { this.additionalImages = additionalImages; }

    public ReportStatus getStatus() { return status; }
    public void setStatus(ReportStatus status) { this.status = status; }

    public Double getValidationScore() { return validationScore; }
    public void setValidationScore(Double validationScore) { this.validationScore = validationScore; }

    public Boolean getIsDuplicate() { return isDuplicate; }
    public void setIsDuplicate(Boolean isDuplicate) { this.isDuplicate = isDuplicate; }

    public Long getDuplicateReportId() { return duplicateReportId; }
    public void setDuplicateReportId(Long duplicateReportId) { this.duplicateReportId = duplicateReportId; }

    public User getOfficerAssigned() { return officerAssigned; }
    public void setOfficerAssigned(User officerAssigned) { this.officerAssigned = officerAssigned; }

    public String getResolutionNotes() { return resolutionNotes; }
    public void setResolutionNotes(String resolutionNotes) { this.resolutionNotes = resolutionNotes; }

    public String getIpAddress() { return ipAddress; }
    public void setIpAddress(String ipAddress) { this.ipAddress = ipAddress; }

    public String getUserAgent() { return userAgent; }
    public void setUserAgent(String userAgent) { this.userAgent = userAgent; }

    public String getDeviceFingerprint() { return deviceFingerprint; }
    public void setDeviceFingerprint(String deviceFingerprint) { this.deviceFingerprint = deviceFingerprint; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }

    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }

    // Static builder method
    public static CitizenReportBuilder builder() {
        return new CitizenReportBuilder();
    }
    
    public static class CitizenReportBuilder {
        private Vendor vendor;
        private String reporterName;
        private String reporterPhone;
        private String reporterEmail;
        private ReportType reportType;
        private String description;
        private Double latitude;
        private Double longitude;
        private String locationAddress;
        private String imageProofUrl;
        private String additionalImages;
        private ReportStatus status;
        private Double validationScore;
        private String ipAddress;
        private String userAgent;
        private String deviceFingerprint;
        private LocalDateTime createdAt;
        
        public CitizenReportBuilder vendor(Vendor vendor) {
            this.vendor = vendor;
            return this;
        }
        
        public CitizenReportBuilder reporterName(String reporterName) {
            this.reporterName = reporterName;
            return this;
        }
        
        public CitizenReportBuilder reporterPhone(String reporterPhone) {
            this.reporterPhone = reporterPhone;
            return this;
        }
        
        public CitizenReportBuilder reporterEmail(String reporterEmail) {
            this.reporterEmail = reporterEmail;
            return this;
        }
        
        public CitizenReportBuilder reportType(ReportType reportType) {
            this.reportType = reportType;
            return this;
        }
        
        public CitizenReportBuilder description(String description) {
            this.description = description;
            return this;
        }
        
        public CitizenReportBuilder locationLatitude(Double latitude) {
            this.latitude = latitude;
            return this;
        }
        
        public CitizenReportBuilder locationLongitude(Double longitude) {
            this.longitude = longitude;
            return this;
        }
        
        public CitizenReportBuilder locationAddress(String locationAddress) {
            this.locationAddress = locationAddress;
            return this;
        }
        
        public CitizenReportBuilder imageProofUrl(String imageProofUrl) {
            this.imageProofUrl = imageProofUrl;
            return this;
        }
        
        public CitizenReportBuilder additionalImages(String additionalImages) {
            this.additionalImages = additionalImages;
            return this;
        }
        
        public CitizenReportBuilder status(ReportStatus status) {
            this.status = status;
            return this;
        }
        
        public CitizenReportBuilder validationScore(Double validationScore) {
            this.validationScore = validationScore;
            return this;
        }
        
        public CitizenReportBuilder ipAddress(String ipAddress) {
            this.ipAddress = ipAddress;
            return this;
        }
        
        public CitizenReportBuilder userAgent(String userAgent) {
            this.userAgent = userAgent;
            return this;
        }
        
        public CitizenReportBuilder deviceFingerprint(String deviceFingerprint) {
            this.deviceFingerprint = deviceFingerprint;
            return this;
        }
        
        public CitizenReportBuilder createdAt(LocalDateTime createdAt) {
            this.createdAt = createdAt;
            return this;
        }
        
        public CitizenReport build() {
            CitizenReport report = new CitizenReport();
            report.vendor = this.vendor;
            report.reporterName = this.reporterName;
            report.reporterPhone = this.reporterPhone;
            report.reporterEmail = this.reporterEmail;
            report.reportType = this.reportType;
            report.description = this.description;
            report.locationLatitude = this.latitude;
            report.locationLongitude = this.longitude;
            report.locationAddress = this.locationAddress;
            report.imageProofUrl = this.imageProofUrl;
            report.additionalImages = this.additionalImages;
            report.status = this.status;
            report.validationScore = this.validationScore;
            report.ipAddress = this.ipAddress;
            report.userAgent = this.userAgent;
            report.deviceFingerprint = this.deviceFingerprint;
            report.createdAt = this.createdAt;
            return report;
        }
    }
}
