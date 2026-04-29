package com.smc.svms.dto;

import com.smc.svms.enums.VendorCategory;
import com.smc.svms.enums.VendorStatus;

public class VendorDTO {
    private Long id;
    private String vendorId;
    private String name;
    private String phone;
    private String email;
    private String faceImageUrl;
    private VendorCategory category;
    private VendorStatus status;
    private java.math.BigDecimal monthlyRent;
    private java.math.BigDecimal totalPendingFine;
    private Double latitude;
    private Double longitude;
    private String address;
    private String qrCodeUrl;
    private Long zoneId;
    private String zoneName;
    private java.time.LocalDateTime createdAt;
    private Boolean isRentPaidCurrentMonth;

    public VendorDTO() {}

    // Getters and Setters
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getVendorId() { return vendorId; }
    public void setVendorId(String vendorId) { this.vendorId = vendorId; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getPhone() { return phone; }
    public void setPhone(String phone) { this.phone = phone; }

    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }

    public String getFaceImageUrl() { return faceImageUrl; }
    public void setFaceImageUrl(String faceImageUrl) { this.faceImageUrl = faceImageUrl; }

    public VendorCategory getCategory() { return category; }
    public void setCategory(VendorCategory category) { this.category = category; }

    public VendorStatus getStatus() { return status; }
    public void setStatus(VendorStatus status) { this.status = status; }

    public java.math.BigDecimal getMonthlyRent() { return monthlyRent; }
    public void setMonthlyRent(java.math.BigDecimal monthlyRent) { this.monthlyRent = monthlyRent; }

    public java.math.BigDecimal getTotalPendingFine() { return totalPendingFine; }
    public void setTotalPendingFine(java.math.BigDecimal totalPendingFine) { this.totalPendingFine = totalPendingFine; }

    public Double getLatitude() { return latitude; }
    public void setLatitude(Double latitude) { this.latitude = latitude; }

    public Double getLongitude() { return longitude; }
    public void setLongitude(Double longitude) { this.longitude = longitude; }

    public String getAddress() { return address; }
    public void setAddress(String address) { this.address = address; }

    public String getQrCodeUrl() { return qrCodeUrl; }
    public void setQrCodeUrl(String qrCodeUrl) { this.qrCodeUrl = qrCodeUrl; }

    public Long getZoneId() { return zoneId; }
    public void setZoneId(Long zoneId) { this.zoneId = zoneId; }

    public String getZoneName() { return zoneName; }
    public void setZoneName(String zoneName) { this.zoneName = zoneName; }

    public java.time.LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(java.time.LocalDateTime createdAt) { this.createdAt = createdAt; }

    public Boolean getIsRentPaidCurrentMonth() { return isRentPaidCurrentMonth; }
    public void setIsRentPaidCurrentMonth(Boolean isRentPaidCurrentMonth) { this.isRentPaidCurrentMonth = isRentPaidCurrentMonth; }

    // Builder
    public static Builder builder() {
        return new Builder();
    }

    public static class Builder {
        private VendorDTO d = new VendorDTO();
        
        public Builder id(Long id) { d.id = id; return this; }
        public Builder vendorId(String vendorId) { d.vendorId = vendorId; return this; }
        public Builder name(String name) { d.name = name; return this; }
        public Builder phone(String phone) { d.phone = phone; return this; }
        public Builder email(String email) { d.email = email; return this; }
        public Builder faceImageUrl(String faceImageUrl) { d.faceImageUrl = faceImageUrl; return this; }
        public Builder category(VendorCategory category) { d.category = category; return this; }
        public Builder status(VendorStatus status) { d.status = status; return this; }
        public Builder monthlyRent(java.math.BigDecimal monthlyRent) { d.monthlyRent = monthlyRent; return this; }
        public Builder totalPendingFine(java.math.BigDecimal totalPendingFine) { d.totalPendingFine = totalPendingFine; return this; }
        public Builder latitude(Double latitude) { d.latitude = latitude; return this; }
        public Builder longitude(Double longitude) { d.longitude = longitude; return this; }
        public Builder address(String address) { d.address = address; return this; }
        public Builder qrCodeUrl(String qrCodeUrl) { d.qrCodeUrl = qrCodeUrl; return this; }
        public Builder zoneId(Long zoneId) { d.zoneId = zoneId; return this; }
        public Builder zoneName(String zoneName) { d.zoneName = zoneName; return this; }
        public Builder createdAt(java.time.LocalDateTime createdAt) { d.createdAt = createdAt; return this; }
        public Builder isRentPaidCurrentMonth(Boolean isRentPaidCurrentMonth) { d.isRentPaidCurrentMonth = isRentPaidCurrentMonth; return this; }
        
        public VendorDTO build() {
            return d;
        }
    }
}
