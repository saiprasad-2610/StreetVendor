package com.smc.svms.dto;

import com.smc.svms.enums.VendorCategory;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
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
}
