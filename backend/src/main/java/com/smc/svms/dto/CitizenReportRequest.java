package com.smc.svms.dto;

import com.smc.svms.entity.ReportType;
import org.springframework.web.multipart.MultipartFile;
import java.util.List;

public class CitizenReportRequest {
    private Long vendorId;
    private String reporterName;
    private String reporterPhone;
    private String reporterEmail;
    private ReportType reportType;
    private String description;
    private Double latitude;
    private Double longitude;
    private String locationAddress;
    private MultipartFile imageFile;
    private List<MultipartFile> additionalImages;

    public CitizenReportRequest() {}

    // Getters and Setters
    public Long getVendorId() { return vendorId; }
    public void setVendorId(Long vendorId) { this.vendorId = vendorId; }

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

    public Double getLatitude() { return latitude; }
    public void setLatitude(Double latitude) { this.latitude = latitude; }

    public Double getLongitude() { return longitude; }
    public void setLongitude(Double longitude) { this.longitude = longitude; }

    public String getLocationAddress() { return locationAddress; }
    public void setLocationAddress(String locationAddress) { this.locationAddress = locationAddress; }

    public MultipartFile getImageFile() { return imageFile; }
    public void setImageFile(MultipartFile imageFile) { this.imageFile = imageFile; }

    public List<MultipartFile> getAdditionalImages() { return additionalImages; }
    public void setAdditionalImages(List<MultipartFile> additionalImages) { this.additionalImages = additionalImages; }

    // Builder
    public static Builder builder() {
        return new Builder();
    }

    public static class Builder {
        private CitizenReportRequest r = new CitizenReportRequest();
        
        public Builder vendorId(Long vendorId) { r.vendorId = vendorId; return this; }
        public Builder reporterName(String reporterName) { r.reporterName = reporterName; return this; }
        public Builder reporterPhone(String reporterPhone) { r.reporterPhone = reporterPhone; return this; }
        public Builder reporterEmail(String reporterEmail) { r.reporterEmail = reporterEmail; return this; }
        public Builder reportType(ReportType reportType) { r.reportType = reportType; return this; }
        public Builder description(String description) { r.description = description; return this; }
        public Builder latitude(Double latitude) { r.latitude = latitude; return this; }
        public Builder longitude(Double longitude) { r.longitude = longitude; return this; }
        public Builder locationAddress(String locationAddress) { r.locationAddress = locationAddress; return this; }
        public Builder imageFile(MultipartFile imageFile) { r.imageFile = imageFile; return this; }
        public Builder additionalImages(List<MultipartFile> additionalImages) { r.additionalImages = additionalImages; return this; }
        
        public CitizenReportRequest build() {
            return r;
        }
    }
}
