package com.smc.svms.dto;

import com.smc.svms.enums.ValidationLayerType;
import lombok.Builder;
import lombok.Data;
import java.time.LocalDateTime;
import java.util.Map;

@Data
@Builder
public class ValidationLayer {
    private ValidationLayerType layerType;
    private boolean valid;
    private double confidence;
    private String message;
    private Map<String, Object> metadata;
    private LocalDateTime validationTime;
}
