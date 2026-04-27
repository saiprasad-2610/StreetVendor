package com.smc.svms.dto;

import com.smc.svms.enums.ValidationType;
import lombok.Builder;
import lombok.Data;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@Data
@Builder
public class AdvancedLocationValidationResult {
    private boolean valid;
    private double confidence;
    private String message;
    private ValidationType validationType;
    private ZoneInfo zoneInfo;
    private double adaptiveThreshold;
    private double violationRisk;
    private List<ValidationLayer> validationLayers;
    private LocalDateTime validationTime;
    private Map<String, Object> metadata;
}
