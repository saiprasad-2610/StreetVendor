package com.smc.svms.dto;

import com.smc.svms.enums.VendorCategory;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public class VendorRequest {
    @NotBlank(message = "Name is required")
    private String name;
    
    @NotBlank(message = "Phone is required")
    private String phone;
    
    @NotBlank(message = "Aadhaar is required")
    private String aadhaar;
    
    private String faceImageUrl;
    
    @NotNull(message = "Category is required")
    private VendorCategory category;

    private java.math.BigDecimal monthlyRent;
    
    @NotNull(message = "Latitude is required")
    private Double latitude;
    
    @NotNull(message = "Longitude is required")
    private Double longitude;
    
    private String address;
    
    private Long zoneId;

    public VendorRequest() {}

    // Getters and Setters
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getPhone() { return phone; }
    public void setPhone(String phone) { this.phone = phone; }

    public String getAadhaar() { return aadhaar; }
    public void setAadhaar(String aadhaar) { this.aadhaar = aadhaar; }

    public String getFaceImageUrl() { return faceImageUrl; }
    public void setFaceImageUrl(String faceImageUrl) { this.faceImageUrl = faceImageUrl; }

    public VendorCategory getCategory() { return category; }
    public void setCategory(VendorCategory category) { this.category = category; }

    public java.math.BigDecimal getMonthlyRent() { return monthlyRent; }
    public void setMonthlyRent(java.math.BigDecimal monthlyRent) { this.monthlyRent = monthlyRent; }

    public Double getLatitude() { return latitude; }
    public void setLatitude(Double latitude) { this.latitude = latitude; }

    public Double getLongitude() { return longitude; }
    public void setLongitude(Double longitude) { this.longitude = longitude; }

    public String getAddress() { return address; }
    public void setAddress(String address) { this.address = address; }

    public Long getZoneId() { return zoneId; }
    public void setZoneId(Long zoneId) { this.zoneId = zoneId; }
}
