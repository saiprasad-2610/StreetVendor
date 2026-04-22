package com.smc.svms.dto;

import com.smc.svms.enums.ValidationStatus;
import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class ScanValidationResponse {
    private String vendorId;
    private String vendorName;
    private String category;
    private ValidationStatus validationStatus;
    private Double distance;
    private String message;
}
