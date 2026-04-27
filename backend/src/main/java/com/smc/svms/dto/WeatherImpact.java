package com.smc.svms.dto;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class WeatherImpact {
    private double accuracyReduction;
    private double thresholdAdjustment;
    private boolean vendingAllowed;
    private String message;
}
