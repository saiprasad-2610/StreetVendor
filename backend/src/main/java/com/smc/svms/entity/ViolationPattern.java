package com.smc.svms.entity;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.smc.svms.dto.ValidationLayer;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;
import java.util.List;

@Entity
@Table(name = "violation_patterns", indexes = {
    @Index(name = "idx_vendor_pattern", columnList = "vendor_id"),
    @Index(name = "idx_pattern_time", columnList = "validation_time"),
    @Index(name = "idx_pattern_valid", columnList = "is_valid")
})
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ViolationPattern {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @Column(name = "vendor_id", nullable = false)
    private Long vendorId;
    
    @Column(nullable = false)
    private Double latitude;
    
    @Column(nullable = false)
    private Double longitude;
    
    @Column(name = "validation_time", nullable = false)
    private LocalDateTime validationTime;
    
    @Column(name = "is_valid", nullable = false)
    private Boolean isValid;
    
    @Column(name = "device_id", length = 100)
    private String deviceId;
    
    @Column(name = "weather_condition", length = 50)
    private String weatherCondition;
    
    @Column(name = "confidence_score")
    private Double confidenceScore;
    
    @Column(name = "violation_risk")
    private Double violationRisk;
    
    @Column(name = "adaptive_threshold")
    private Double adaptiveThreshold;
    
    @Column(name = "validation_result", columnDefinition = "JSON")
    private String validationResult; // Serialized ValidationLayer list
    
    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;
    
    // Helper methods
    public List<ValidationLayer> getValidationLayers() {
        if (validationResult == null || validationResult.trim().isEmpty()) {
            return null;
        }
        try {
            com.fasterxml.jackson.databind.ObjectMapper mapper = new com.fasterxml.jackson.databind.ObjectMapper();
            return mapper.readValue(validationResult, 
                mapper.getTypeFactory().constructCollectionType(List.class, ValidationLayer.class));
        } catch (Exception e) {
            return null;
        }
    }
    
    public void setValidationLayers(List<ValidationLayer> layers) {
        if (layers == null || layers.isEmpty()) {
            this.validationResult = null;
        } else {
            try {
                com.fasterxml.jackson.databind.ObjectMapper mapper = new com.fasterxml.jackson.databind.ObjectMapper();
                this.validationResult = mapper.writeValueAsString(layers);
            } catch (Exception e) {
                this.validationResult = null;
            }
        }
    }
    
    public boolean isValid() {
        return this.isValid != null ? this.isValid : false;
    }
}
