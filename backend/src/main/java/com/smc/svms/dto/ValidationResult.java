package com.smc.svms.dto;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class ValidationResult {
    private boolean valid;
    private String errorMessage;
}
