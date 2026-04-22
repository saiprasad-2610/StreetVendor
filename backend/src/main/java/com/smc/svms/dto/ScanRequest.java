package com.smc.svms.dto;

import lombok.Data;

@Data
public class ScanRequest {
    private String vendorId;
    private Double latitude;
    private Double longitude;
    private String imageProofUrl;
}
