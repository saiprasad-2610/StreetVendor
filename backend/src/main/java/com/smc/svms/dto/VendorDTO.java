package com.smc.svms.dto;

import com.smc.svms.enums.VendorCategory;
import com.smc.svms.enums.VendorStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class VendorDTO {
    private Long id;
    private String vendorId;
    private String name;
    private String phone;
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
}
