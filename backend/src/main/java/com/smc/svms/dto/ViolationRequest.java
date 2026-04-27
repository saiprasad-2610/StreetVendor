package com.smc.svms.dto;

import com.smc.svms.entity.ViolationType;
import java.time.LocalDateTime;

public class ViolationRequest {
    private String vendorId;
    private String imageProofUrl;
    private Double gpsLatitude;
    private Double gpsLongitude;
    private String description;
    private String reporterName;
    private String reporterPhone;
    private LocalDateTime capturedAt;
    private ViolationType violationType;
    private Long reportedByUserId;

    public ViolationRequest() {}

    public ViolationRequest(String vendorId, String imageProofUrl, Double gpsLatitude, Double gpsLongitude, String description, String reporterName, String reporterPhone, LocalDateTime capturedAt, ViolationType violationType, Long reportedByUserId) {
        this.vendorId = vendorId;
        this.imageProofUrl = imageProofUrl;
        this.gpsLatitude = gpsLatitude;
        this.gpsLongitude = gpsLongitude;
        this.description = description;
        this.reporterName = reporterName;
        this.reporterPhone = reporterPhone;
        this.capturedAt = capturedAt;
        this.violationType = violationType;
        this.reportedByUserId = reportedByUserId;
    }
    
    // Getters and Setters
    public String getVendorId() { return vendorId; }
    public void setVendorId(String vendorId) { this.vendorId = vendorId; }
    
    public String getImageProofUrl() { return imageProofUrl; }
    public void setImageProofUrl(String imageProofUrl) { this.imageProofUrl = imageProofUrl; }
    
    public Double getGpsLatitude() { return gpsLatitude; }
    public void setGpsLatitude(Double gpsLatitude) { this.gpsLatitude = gpsLatitude; }
    
    public Double getGpsLongitude() { return gpsLongitude; }
    public void setGpsLongitude(Double gpsLongitude) { this.gpsLongitude = gpsLongitude; }
    
    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }
    
    public String getReporterName() { return reporterName; }
    public void setReporterName(String reporterName) { this.reporterName = reporterName; }
    
    public String getReporterPhone() { return reporterPhone; }
    public void setReporterPhone(String reporterPhone) { this.reporterPhone = reporterPhone; }
    
    public LocalDateTime getCapturedAt() { return capturedAt; }
    public void setCapturedAt(LocalDateTime capturedAt) { this.capturedAt = capturedAt; }
    
    public ViolationType getViolationType() { return violationType; }
    public void setViolationType(ViolationType violationType) { this.violationType = violationType; }

    public Long getReportedByUserId() { return reportedByUserId; }
    public void setReportedByUserId(Long reportedByUserId) { this.reportedByUserId = reportedByUserId; }

    // Static builder method
    public static Builder builder() {
        return new Builder();
    }
    
    public static class Builder {
        private String vendorId;
        private String imageProofUrl;
        private Double gpsLatitude;
        private Double gpsLongitude;
        private String description;
        private String reporterName;
        private String reporterPhone;
        private LocalDateTime capturedAt;
        private ViolationType violationType;
        private Long reportedByUserId;

        public Builder vendorId(String vendorId) {
            this.vendorId = vendorId;
            return this;
        }

        public Builder imageProofUrl(String imageProofUrl) {
            this.imageProofUrl = imageProofUrl;
            return this;
        }

        public Builder gpsLatitude(Double gpsLatitude) {
            this.gpsLatitude = gpsLatitude;
            return this;
        }

        public Builder gpsLongitude(Double gpsLongitude) {
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

        public Builder capturedAt(LocalDateTime capturedAt) {
            this.capturedAt = capturedAt;
            return this;
        }

        public Builder violationType(ViolationType violationType) {
            this.violationType = violationType;
            return this;
        }

        public Builder reportedByUserId(Long reportedByUserId) {
            this.reportedByUserId = reportedByUserId;
            return this;
        }

        public ViolationRequest build() {
            return new ViolationRequest(vendorId, imageProofUrl, gpsLatitude, gpsLongitude, description, reporterName, reporterPhone, capturedAt, violationType, reportedByUserId);
        }
    }
}
