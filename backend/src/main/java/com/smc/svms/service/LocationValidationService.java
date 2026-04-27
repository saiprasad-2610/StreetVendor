package com.smc.svms.service;

import com.smc.svms.entity.Vendor;
import com.smc.svms.entity.VendorLocation;
import com.smc.svms.repository.VendorRepository;
import com.smc.svms.util.DistanceCalculator;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.Optional;

@Service
@RequiredArgsConstructor
@Slf4j
public class LocationValidationService {
    
    private final VendorRepository vendorRepository;
    
    /**
     * Validate vendor location and calculate real distance
     * @param vendorId The vendor ID to validate
     * @param currentLatitude Current GPS latitude
     * @param currentLongitude Current GPS longitude
     * @return Validation result with real distance
     */
    public LocationValidationResult validateVendorLocation(String vendorId, double currentLatitude, double currentLongitude) {
        log.info("Validating location for vendor: {} at ({}, {})", vendorId, currentLatitude, currentLongitude);
        
        try {
            // Find vendor by vendorId
            Optional<Vendor> vendorOpt = vendorRepository.findByVendorId(vendorId);
            if (vendorOpt.isEmpty()) {
                log.warn("Vendor not found: {}", vendorId);
                return LocationValidationResult.builder()
                    .vendorId(vendorId)
                    .vendorName("Unknown Vendor")
                    .category("Unknown")
                    .validationStatus(com.smc.svms.enums.ValidationStatus.INVALID)
                    .distance(null)
                    .message("❌ VENDOR NOT FOUND - QR code may be invalid or vendor not registered")
                    .build();
            }
            
            Vendor vendor = vendorOpt.get();
            VendorLocation registeredLocation = vendor.getLocation();
            
            if (registeredLocation == null) {
                log.warn("No location data found for vendor: {}", vendorId);
                return LocationValidationResult.builder()
                    .vendorId(vendorId)
                    .vendorName(vendor.getName())
                    .category(vendor.getCategory() != null ? vendor.getCategory().toString() : "Unknown")
                    .validationStatus(com.smc.svms.enums.ValidationStatus.INVALID)
                    .distance(null)
                    .message("❌ NO REGISTERED LOCATION - Vendor location not found in system")
                    .build();
            }
            
            // Calculate real distance using Haversine formula
            double registeredLat = registeredLocation.getLatitude().doubleValue();
            double registeredLon = registeredLocation.getLongitude().doubleValue();
            double distance = DistanceCalculator.calculateDistance(
                registeredLat, registeredLon, 
                currentLatitude, currentLongitude
            );
            
            log.info("Distance calculated: {} meters between registered ({}, {}) and current ({}, {})", 
                distance, registeredLat, registeredLon, currentLatitude, currentLongitude);
            
            // Determine validation status based on distance threshold
            double threshold = 50.0; // 50 meters threshold
            com.smc.svms.enums.ValidationStatus status = distance <= threshold ? 
                com.smc.svms.enums.ValidationStatus.VALID : 
                com.smc.svms.enums.ValidationStatus.INVALID;
            
            // Create detailed message
            String message = createValidationMessage(status, distance, currentLatitude, currentLongitude);
            
            return LocationValidationResult.builder()
                .vendorId(vendorId)
                .vendorName(vendor.getName())
                .category(vendor.getCategory() != null ? vendor.getCategory().toString() : "Unknown")
                .validationStatus(status)
                .distance(DistanceCalculator.getPreciseDistance(distance))
                .message(message)
                .build();
            
        } catch (Exception e) {
            log.error("Error validating vendor location", e);
            return LocationValidationResult.builder()
                .vendorId(vendorId)
                .vendorName("Error")
                .category("Error")
                .validationStatus(com.smc.svms.enums.ValidationStatus.INVALID)
                .distance(null)
                .message("❌ VALIDATION ERROR: " + e.getMessage())
                .build();
        }
    }
    
    private String createValidationMessage(com.smc.svms.enums.ValidationStatus status, double distance, 
                                         double currentLat, double currentLon) {
        String formattedDistance = DistanceCalculator.formatDistance(distance);
        
        if (status == com.smc.svms.enums.ValidationStatus.VALID) {
            return String.format("✅ VERIFIED SPOT - %s - Vendor is in correct location " +
                "(Distance: %s, GPS: %.6f, %.6f) [✅ Photo Verified]", 
                formattedDistance, formattedDistance, currentLat, currentLon);
        } else {
            return String.format("❌ LOCATION VIOLATION - %s - Vendor is outside permitted area " +
                "(Distance: %s, GPS: %.6f, %.6f) [❌ Photo Evidence Required]", 
                formattedDistance, formattedDistance, currentLat, currentLon);
        }
    }
    
    // Builder pattern for result
    public static class LocationValidationResult {
        private String vendorId;
        private String vendorName;
        private String category;
        private com.smc.svms.enums.ValidationStatus validationStatus;
        private Double distance;
        private String message;
        
        public static LocationValidationResultBuilder builder() {
            return new LocationValidationResultBuilder();
        }
        
        // Getters
        public String getVendorId() { return vendorId; }
        public String getVendorName() { return vendorName; }
        public String getCategory() { return category; }
        public com.smc.svms.enums.ValidationStatus getValidationStatus() { return validationStatus; }
        public Double getDistance() { return distance; }
        public String getMessage() { return message; }
        
        public static class LocationValidationResultBuilder {
            private LocationValidationResult result = new LocationValidationResult();
            
            public LocationValidationResultBuilder vendorId(String vendorId) {
                result.vendorId = vendorId;
                return this;
            }
            
            public LocationValidationResultBuilder vendorName(String vendorName) {
                result.vendorName = vendorName;
                return this;
            }
            
            public LocationValidationResultBuilder category(String category) {
                result.category = category;
                return this;
            }
            
            public LocationValidationResultBuilder validationStatus(com.smc.svms.enums.ValidationStatus status) {
                result.validationStatus = status;
                return this;
            }
            
            public LocationValidationResultBuilder distance(Double distance) {
                result.distance = distance;
                return this;
            }
            
            public LocationValidationResultBuilder message(String message) {
                result.message = message;
                return this;
            }
            
            public LocationValidationResult build() {
                return result;
            }
        }
    }
}
