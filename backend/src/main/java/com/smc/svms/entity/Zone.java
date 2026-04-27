package com.smc.svms.entity;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.smc.svms.enums.ZoneType;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "zones", indexes = {
    @Index(name = "idx_zone_type", columnList = "zone_type"),
    @Index(name = "idx_zone_active", columnList = "is_active"),
    @Index(name = "idx_zone_category", columnList = "zone_category"),
    @Index(name = "idx_zone_manager", columnList = "manager_email")
})
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Zone {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 100)
    private String name;

    @Enumerated(EnumType.STRING)
    @Column(name = "zone_type", nullable = false, length = 20)
    private com.smc.svms.enums.ZoneType zoneType;

    @Enumerated(EnumType.STRING)
    @Column(name = "zone_category", length = 20)
    private ZoneCategory zoneCategory;

    @Column(nullable = false, precision = 10, scale = 8)
    private BigDecimal latitude;

    @Column(nullable = false, precision = 11, scale = 8)
    private BigDecimal longitude;

    @Column(name = "radius_meters")
    private Integer radiusMeters;

    // NEW: Polygon coordinates for complex zones
    @Column(name = "polygon_coordinates", columnDefinition = "JSON")
    private String polygonCoordinates;

    // NEW: Maximum vendors allowed
    @Column(name = "max_vendors")
    private Integer maxVendors;

    // NEW: Time restrictions
    @Column(name = "time_restrictions", columnDefinition = "JSON")
    private String timeRestrictions;

    // NEW: Zone manager contact
    @Column(name = "manager_email", length = 100)
    private String managerEmail;

    @Column(name = "manager_phone", length = 20)
    private String managerPhone;

    // NEW: Monthly rent for vendors in this zone
    @Column(name = "monthly_rent", precision = 10, scale = 2)
    private BigDecimal monthlyRent;

    // NEW: Zone dimensions
    @Column(name = "length_meters", precision = 10, scale = 2)
    private BigDecimal lengthMeters;

    @Column(name = "breadth_meters", precision = 10, scale = 2)
    private BigDecimal breadthMeters;

    @Column(name = "total_size_sq_meters", precision = 12, scale = 2)
    private BigDecimal totalSizeSqMeters;

    @Builder.Default
    @Column(name = "is_active", nullable = false)
    private Boolean isActive = true;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
    
    // Helper methods
    public boolean hasPolygon() {
        return polygonCoordinates != null && !polygonCoordinates.trim().isEmpty();
    }

    public boolean hasTimeRestrictions() {
        return timeRestrictions != null && !timeRestrictions.trim().isEmpty();
    }

    public boolean hasCapacityLimit() {
        return maxVendors != null && maxVendors > 0;
    }
    
    // Helper method for backward compatibility
    public void setPolygonCoordinates(java.util.List<java.util.Map<String, Double>> coordinates) {
        if (coordinates == null || coordinates.isEmpty()) {
            this.polygonCoordinates = null;
        } else {
            try {
                com.fasterxml.jackson.databind.ObjectMapper mapper = new com.fasterxml.jackson.databind.ObjectMapper();
                this.polygonCoordinates = mapper.writeValueAsString(coordinates);
            } catch (Exception e) {
                this.polygonCoordinates = null;
            }
        }
    }
    
    // Additional getter for polygon coordinates as list
    public java.util.List<java.util.Map<String, Double>> getPolygonCoordinatesList() {
        if (polygonCoordinates == null || polygonCoordinates.trim().isEmpty()) {
            return null;
        }
        try {
            com.fasterxml.jackson.databind.ObjectMapper mapper = new com.fasterxml.jackson.databind.ObjectMapper();
            return mapper.readValue(polygonCoordinates, 
                mapper.getTypeFactory().constructCollectionType(java.util.List.class, 
                    mapper.getTypeFactory().constructMapType(java.util.Map.class, String.class, Double.class)));
        } catch (Exception e) {
            return null;
        }
    }
    
    // Explicit getters for compilation
    public Long getId() {
        return id;
    }
    
    public String getName() {
        return name;
    }
    
    public com.smc.svms.enums.ZoneType getZoneType() {
        return zoneType;
    }
    
    public ZoneCategory getZoneCategory() {
        return zoneCategory;
    }
    
    public BigDecimal getLatitude() {
        return latitude;
    }
    
    public BigDecimal getLongitude() {
        return longitude;
    }
    
    public Integer getRadiusMeters() {
        return radiusMeters;
    }
    
    public String getPolygonCoordinates() {
        return polygonCoordinates;
    }
    
    public Integer getMaxVendors() {
        return maxVendors;
    }
    
    public String getTimeRestrictions() {
        return timeRestrictions;
    }
    
    public String getManagerEmail() {
        return managerEmail;
    }
    
    public String getManagerPhone() {
        return managerPhone;
    }

    public BigDecimal getMonthlyRent() {
        return monthlyRent;
    }

    public BigDecimal getLengthMeters() {
        return lengthMeters;
    }

    public BigDecimal getBreadthMeters() {
        return breadthMeters;
    }

    public BigDecimal getTotalSizeSqMeters() {
        return totalSizeSqMeters;
    }

    public Boolean getIsActive() {
        return isActive;
    }
    
    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public String getPolygonCoordinatesJson() { return polygonCoordinates; }
    
    public void setName(String name) { this.name = name; }
    public void setZoneType(com.smc.svms.enums.ZoneType zoneType) { this.zoneType = zoneType; }
    public void setZoneCategory(ZoneCategory zoneCategory) { this.zoneCategory = zoneCategory; }
    public void setLatitude(BigDecimal latitude) { this.latitude = latitude; }
    public void setLongitude(BigDecimal longitude) { this.longitude = longitude; }
    public void setRadiusMeters(Integer radiusMeters) { this.radiusMeters = radiusMeters; }
    public void setPolygonCoordinates(String polygonCoordinates) { this.polygonCoordinates = polygonCoordinates; }
    public void setMaxVendors(Integer maxVendors) { this.maxVendors = maxVendors; }
    public void setTimeRestrictions(String timeRestrictions) { this.timeRestrictions = timeRestrictions; }
    public void setManagerEmail(String managerEmail) { this.managerEmail = managerEmail; }
    public void setManagerPhone(String managerPhone) { this.managerPhone = managerPhone; }
    public void setMonthlyRent(BigDecimal monthlyRent) { this.monthlyRent = monthlyRent; }
    public void setLengthMeters(BigDecimal lengthMeters) { this.lengthMeters = lengthMeters; }
    public void setBreadthMeters(BigDecimal breadthMeters) { this.breadthMeters = breadthMeters; }
    public void setTotalSizeSqMeters(BigDecimal totalSizeSqMeters) { this.totalSizeSqMeters = totalSizeSqMeters; }
    public void setIsActive(Boolean isActive) { this.isActive = isActive; }
    
    // Static builder method
    public static ZoneBuilder builder() {
        return new ZoneBuilder();
    }
    
    public static class ZoneBuilder {
        private String name;
        private com.smc.svms.enums.ZoneType zoneType;
        private ZoneCategory zoneCategory;
        private BigDecimal latitude;
        private BigDecimal longitude;
        private Integer radiusMeters;
        private String polygonCoordinates;
        private Integer maxVendors;
        private String timeRestrictions;
        private String managerEmail;
        private String managerPhone;
        private BigDecimal monthlyRent;
        private BigDecimal lengthMeters;
        private BigDecimal breadthMeters;
        private BigDecimal totalSizeSqMeters;
        private Boolean isActive = true;
        
        public ZoneBuilder name(String name) {
            this.name = name;
            return this;
        }
        
        public ZoneBuilder zoneType(com.smc.svms.enums.ZoneType zoneType) {
            this.zoneType = zoneType;
            return this;
        }
        
        public ZoneBuilder zoneCategory(ZoneCategory zoneCategory) {
            this.zoneCategory = zoneCategory;
            return this;
        }
        
        public ZoneBuilder latitude(BigDecimal latitude) {
            this.latitude = latitude;
            return this;
        }
        
        public ZoneBuilder longitude(BigDecimal longitude) {
            this.longitude = longitude;
            return this;
        }
        
        public ZoneBuilder radiusMeters(Integer radiusMeters) {
            this.radiusMeters = radiusMeters;
            return this;
        }
        
        public ZoneBuilder polygonCoordinates(String polygonCoordinates) {
            this.polygonCoordinates = polygonCoordinates;
            return this;
        }
        
        public ZoneBuilder maxVendors(Integer maxVendors) {
            this.maxVendors = maxVendors;
            return this;
        }
        
        public ZoneBuilder timeRestrictions(String timeRestrictions) {
            this.timeRestrictions = timeRestrictions;
            return this;
        }
        
        public ZoneBuilder managerEmail(String managerEmail) {
            this.managerEmail = managerEmail;
            return this;
        }
        
        public ZoneBuilder managerPhone(String managerPhone) {
            this.managerPhone = managerPhone;
            return this;
        }

        public ZoneBuilder monthlyRent(BigDecimal monthlyRent) {
            this.monthlyRent = monthlyRent;
            return this;
        }

        public ZoneBuilder lengthMeters(BigDecimal lengthMeters) {
            this.lengthMeters = lengthMeters;
            return this;
        }

        public ZoneBuilder breadthMeters(BigDecimal breadthMeters) {
            this.breadthMeters = breadthMeters;
            return this;
        }

        public ZoneBuilder totalSizeSqMeters(BigDecimal totalSizeSqMeters) {
            this.totalSizeSqMeters = totalSizeSqMeters;
            return this;
        }

        public ZoneBuilder isActive(Boolean isActive) {
            this.isActive = isActive;
            return this;
        }
        
        public Zone build() {
            Zone zone = new Zone();
            zone.name = this.name;
            zone.zoneType = this.zoneType;
            zone.zoneCategory = this.zoneCategory;
            zone.latitude = this.latitude;
            zone.longitude = this.longitude;
            zone.radiusMeters = this.radiusMeters;
            zone.polygonCoordinates = this.polygonCoordinates;
            zone.maxVendors = this.maxVendors;
            zone.timeRestrictions = this.timeRestrictions;
            zone.managerEmail = this.managerEmail;
            zone.managerPhone = this.managerPhone;
            zone.monthlyRent = this.monthlyRent;
            zone.lengthMeters = this.lengthMeters;
            zone.breadthMeters = this.breadthMeters;
            zone.totalSizeSqMeters = this.totalSizeSqMeters;
            zone.isActive = this.isActive;
            return zone;
        }
    }
    
    public LocalDateTime getUpdatedAt() {
        return updatedAt;
    }
}
