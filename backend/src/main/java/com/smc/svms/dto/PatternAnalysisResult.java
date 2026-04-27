package com.smc.svms.dto;

import com.smc.svms.enums.RiskLevel;
import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class PatternAnalysisResult {
    private boolean patternValid;
    private double confidence;
    private String message;
    private double patternScore;
    private RiskLevel riskLevel;
    private int historicalViolations;
}
