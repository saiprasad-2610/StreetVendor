package com.smc.svms.dto;

import java.time.LocalDateTime;
import lombok.Data;

@Data
public class ViolationRequest {
    private String vendorId;
    private String imageProofUrl;
    private Double gpsLatitude;
    private Double gpsLongitude;
    private String description;
    private String reporterName;
    private String reporterPhone;
    private LocalDateTime capturedAt;
}
