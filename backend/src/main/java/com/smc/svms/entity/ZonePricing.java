package com.smc.svms.entity;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "zone_pricing", indexes = {
    @Index(name = "idx_zone_pricing_zone_category_date", columnList = "zone_id, vendor_category, effective_date"),
    @Index(name = "idx_zone_pricing_active", columnList = "is_active, effective_date")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
public class ZonePricing {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @ManyToOne(fetch = FetchType.LAZY, cascade = CascadeType.REMOVE)
    @JoinColumn(name = "zone_id", nullable = false)
    @JsonIgnoreProperties({"vendorLocations", "createdAt", "updatedAt"})
    private Zone zone;
    
    @Enumerated(EnumType.STRING)
    @Column(name = "vendor_category", nullable = false, length = 30)
    private VendorCategory vendorCategory;
    
    @Column(name = "base_rate", precision = 10, scale = 2, nullable = false)
    private BigDecimal baseRate;
    
    @Column(name = "time_multiplier")
    @Builder.Default
    private Double timeMultiplier = 1.0;
    
    @Column(name = "category_multiplier")
    @Builder.Default
    private Double categoryMultiplier = 1.0;
    
    @Column(name = "zone_multiplier")
    @Builder.Default
    private Double zoneMultiplier = 1.0;
    
    @Column(name = "event_multiplier")
    @Builder.Default
    private Double eventMultiplier = 1.0;
    
    @Column(name = "seasonal_multiplier")
    @Builder.Default
    private Double seasonalMultiplier = 1.0;
    
    @Column(name = "min_rate", precision = 10, scale = 2)
    private BigDecimal minRate;
    
    @Column(name = "max_rate", precision = 10, scale = 2)
    private BigDecimal maxRate;
    
    @Column(name = "effective_date", nullable = false)
    private LocalDate effectiveDate;
    
    @Column(name = "expiry_date")
    private LocalDate expiryDate;
    
    @Column(name = "is_active", nullable = false)
    @Builder.Default
    private Boolean isActive = true;
    
    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;
    
    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
    
    // Explicit getters/setters for compilation
    public BigDecimal getBaseRate() { return baseRate; }
    public void setBaseRate(BigDecimal baseRate) { this.baseRate = baseRate; }
    public void setTimeMultiplier(Double timeMultiplier) { this.timeMultiplier = timeMultiplier; }
    public void setCategoryMultiplier(Double categoryMultiplier) { this.categoryMultiplier = categoryMultiplier; }
    public void setZoneMultiplier(Double zoneMultiplier) { this.zoneMultiplier = zoneMultiplier; }
    public void setEventMultiplier(Double eventMultiplier) { this.eventMultiplier = eventMultiplier; }
    public void setSeasonalMultiplier(Double seasonalMultiplier) { this.seasonalMultiplier = seasonalMultiplier; }
    public void setMinRate(BigDecimal minRate) { this.minRate = minRate; }
    public void setMaxRate(BigDecimal maxRate) { this.maxRate = maxRate; }
    public void setEffectiveDate(LocalDate effectiveDate) { this.effectiveDate = effectiveDate; }
    public void setIsActive(Boolean isActive) { this.isActive = isActive; }
    public void setZone(Zone zone) { this.zone = zone; }
    public void setVendorCategory(VendorCategory vendorCategory) { this.vendorCategory = vendorCategory; }
    
    // Helper method to calculate final rate
    public BigDecimal calculateFinalRate() {
        
        BigDecimal finalRate = baseRate
            .multiply(BigDecimal.valueOf(timeMultiplier))
            .multiply(BigDecimal.valueOf(categoryMultiplier))
            .multiply(BigDecimal.valueOf(zoneMultiplier))
            .multiply(BigDecimal.valueOf(eventMultiplier))
            .multiply(BigDecimal.valueOf(seasonalMultiplier));
        
        // Apply min/max constraints
        if (minRate != null && finalRate.compareTo(minRate) < 0) {
            finalRate = minRate;
        }
        
        if (maxRate != null && finalRate.compareTo(maxRate) > 0) {
            finalRate = maxRate;
        }
        
        return finalRate.setScale(2, BigDecimal.ROUND_HALF_UP);
    }
    
    // Helper method to check if pricing is currently effective
    public boolean isCurrentlyEffective() {
        LocalDate today = LocalDate.now();
        return isActive && 
               !effectiveDate.isAfter(today) && 
               (expiryDate == null || !expiryDate.isBefore(today));
    }
}
