package com.smc.svms.dto;

import lombok.Data;
import java.math.BigDecimal;

@Data
public class ChallanRequest {
    private String vendorId;
    private BigDecimal fineAmount;
    private String reason;
    private String location;
    private String imageProofUrl;
}
