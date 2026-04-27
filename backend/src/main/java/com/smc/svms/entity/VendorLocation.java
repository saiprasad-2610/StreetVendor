package com.smc.svms.entity;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

@Entity
@Table(name = "vendor_locations", indexes = {
    @Index(name = "idx_vendor_location", columnList = "vendor_id")
})
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
public class VendorLocation {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "vendor_id", nullable = false, unique = true)
    @JsonIgnoreProperties("location")
    private Vendor vendor;

    @Column(nullable = false, precision = 10, scale = 8)
    private BigDecimal latitude;

    @Column(nullable = false, precision = 11, scale = 8)
    private BigDecimal longitude;

    @Column(length = 255)
    private String address;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "zone_id")
    private Zone zone;

    @Column(name = "is_active", nullable = false)
    private Boolean isActive = true;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
    
    public VendorLocation() {}
    
    // Getters and Setters
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    
    public Vendor getVendor() { return vendor; }
    public void setVendor(Vendor vendor) { this.vendor = vendor; }
    
    public BigDecimal getLatitude() { return latitude; }
    public void setLatitude(BigDecimal latitude) { this.latitude = latitude; }
    
    public BigDecimal getLongitude() { return longitude; }
    public void setLongitude(BigDecimal longitude) { this.longitude = longitude; }
    
    public String getAddress() { return address; }
    public void setAddress(String address) { this.address = address; }
    
    public Zone getZone() { return zone; }
    public void setZone(Zone zone) { this.zone = zone; }
    
    public Boolean getIsActive() { return isActive; }
    public void setIsActive(Boolean isActive) { this.isActive = isActive; }
    
    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
    
    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }

    // Static builder method
    public static VendorLocationBuilder builder() {
        return new VendorLocationBuilder();
    }
    
    public static class VendorLocationBuilder {
        private Vendor vendor;
        private BigDecimal latitude;
        private BigDecimal longitude;
        private String address;
        private Zone zone;
        private Boolean isActive = true;
        
        public VendorLocationBuilder vendor(Vendor vendor) {
            this.vendor = vendor;
            return this;
        }
        
        public VendorLocationBuilder latitude(BigDecimal latitude) {
            this.latitude = latitude;
            return this;
        }
        
        public VendorLocationBuilder longitude(BigDecimal longitude) {
            this.longitude = longitude;
            return this;
        }
        
        public VendorLocationBuilder address(String address) {
            this.address = address;
            return this;
        }
        
        public VendorLocationBuilder zone(Zone zone) {
            this.zone = zone;
            return this;
        }
        
        public VendorLocationBuilder isActive(Boolean isActive) {
            this.isActive = isActive;
            return this;
        }
        
        public VendorLocation build() {
            VendorLocation location = new VendorLocation();
            location.vendor = this.vendor;
            location.latitude = this.latitude;
            location.longitude = this.longitude;
            location.address = this.address;
            location.zone = this.zone;
            location.isActive = this.isActive;
            return location;
        }
    }
}
