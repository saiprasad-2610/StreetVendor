package com.smc.svms.service;

import com.smc.svms.entity.*;
import com.smc.svms.enums.ZoneType;
import com.smc.svms.enums.ValidationStatus;
import com.smc.svms.dto.ViolationRequest;
import com.smc.svms.repository.*;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.List;

@Service
@RequiredArgsConstructor
public class BasicViolationDetectionService {
    
    private static final Logger log = LoggerFactory.getLogger(BasicViolationDetectionService.class);

    private final VendorRepository vendorRepository;
    private final ViolationRepository violationRepository;
    private final VendorLocationRepository vendorLocationRepository;
    private final EnhancedGeofencingService geofencingService;
    private final ZoneRepository zoneRepository;
    private final UserRepository userRepository;

    private static final double MAX_ALLOWED_DISTANCE = 50.0; // meters
    private static final double OVERCROWDING_THRESHOLD = 0.9; // 90% capacity

    /**
     * Scheduled violation detection - runs every 15 minutes
     */
    @Scheduled(fixedRate = 900000) // 15 minutes
    public void detectViolationsScheduled() {
        log.info("Starting scheduled violation detection");
        
        try {
            List<Violation> violations = detectViolations();
            
            if (!violations.isEmpty()) {
                log.info("Detected {} new violations", violations.size());
                
                // Save violations
                violationRepository.saveAll(violations);
                
                // Send alerts for critical violations
                sendAlertsForViolations(violations);
            }
            
        } catch (Exception e) {
            log.error("Error in scheduled violation detection", e);
        }
    }

    /**
     * Detect violations using rule-based logic
     */
    public List<Violation> detectViolations() {
        List<Violation> violations = new ArrayList<>();

        try {
            // Get all active vendors
            List<Vendor> activeVendors = vendorRepository.findActiveVendors();
            
            for (Vendor vendor : activeVendors) {
                // Check location violations
                Violation locationViolation = detectLocationViolation(vendor);
                if (locationViolation != null) {
                    violations.add(locationViolation);
                }

                // Check time restriction violations
                Violation timeViolation = detectTimeRestrictionViolation(vendor);
                if (timeViolation != null) {
                    violations.add(timeViolation);
                }

                // Check zone capacity violations
                List<Violation> capacityViolations = detectZoneCapacityViolations(vendor);
                violations.addAll(capacityViolations);
            }

        } catch (Exception e) {
            log.error("Error detecting violations", e);
        }

        return violations;
    }

    /**
     * Detect location violation for a vendor
     */
    private Violation detectLocationViolation(Vendor vendor) {
        try {
            java.util.List<VendorLocation> vendorLocations = vendorLocationRepository.findByVendorId(vendor.getId());
            if (vendorLocations.isEmpty()) {
                return null;
            }
            VendorLocation vendorLocation = vendorLocations.get(0);
            
            if (vendorLocation == null || vendorLocation.getZone() == null) {
                return null;
            }

            // Get vendor's last known location (simplified - in real app, you'd get actual GPS data)
            // For now, we'll check if vendor is assigned to a valid zone
            Zone zone = vendorLocation.getZone();
            
            // Check if zone is restricted
            if (zone.getZoneType() == ZoneType.RESTRICTED) {
                return createViolation(vendor, ViolationType.UNAUTHORIZED_ZONE, 
                    "Vendor assigned to restricted zone", 
                    DetectionMethod.RULE_BASED, 
                    1.0);
            }

            // Check if vendor has valid location assignment
            if (zone.getLatitude() == null || zone.getLongitude() == null) {
                return createViolation(vendor, ViolationType.LOCATION_VIOLATION, 
                    "Vendor zone has invalid coordinates", 
                    DetectionMethod.RULE_BASED, 
                    0.8);
            }

            return null; // No location violation detected

        } catch (Exception e) {
            log.error("Error detecting location violation for vendor: {}", vendor.getId(), e);
            return null;
        }
    }

    /**
     * Detect time restriction violations
     */
    private Violation detectTimeRestrictionViolation(Vendor vendor) {
        try {
            java.util.List<VendorLocation> vendorLocations = vendorLocationRepository.findByVendorId(vendor.getId());
            if (vendorLocations.isEmpty()) {
                return null;
            }
            VendorLocation vendorLocation = vendorLocations.get(0);
            
            if (vendorLocation == null || vendorLocation.getZone() == null) {
                return null;
            }

            Zone zone = vendorLocation.getZone();
            
            // Check if zone has time restrictions
            if (!zone.hasTimeRestrictions()) {
                return null;
            }

            // Check if current time is within allowed time
            if (!geofencingService.isWithinTimeRestrictions(zone)) {
                return createViolation(vendor, ViolationType.TIME_RESTRICTION, 
                    "Vendor operating outside allowed time", 
                    DetectionMethod.RULE_BASED, 
                    0.9);
            }

            return null;

        } catch (Exception e) {
            log.error("Error detecting time restriction violation for vendor: {}", vendor.getId(), e);
            return null;
        }
    }

    /**
     * Detect zone capacity violations
     */
    private List<Violation> detectZoneCapacityViolations(Vendor vendor) {
        List<Violation> violations = new ArrayList<>();

        try {
            java.util.List<VendorLocation> vendorLocations = vendorLocationRepository.findByVendorId(vendor.getId());
            if (vendorLocations.isEmpty()) {
                return violations;
            }
            VendorLocation vendorLocation = vendorLocations.get(0);
            
            if (vendorLocation == null || vendorLocation.getZone() == null) {
                return violations;
            }

            Zone zone = vendorLocation.getZone();
            
            // Check if zone has capacity limits
            if (!zone.hasCapacityLimit()) {
                return violations;
            }

            // Get current zone capacity
            var capacityInfo = geofencingService.getZoneCapacity(zone.getId());
            
            // Check if zone is overcrowded
            if (capacityInfo.getUtilizationRate() >= OVERCROWDING_THRESHOLD) {
                Violation overcrowdingViolation = createViolation(vendor, ViolationType.OVERCROWDING, 
                    String.format("Zone overcrowded: %d/%d vendors (%.1f%%)", 
                        capacityInfo.getCurrentVendors(), 
                        capacityInfo.getMaxVendors(), 
                        capacityInfo.getUtilizationRate() * 100), 
                    DetectionMethod.RULE_BASED, 
                    0.8);
                
                violations.add(overcrowdingViolation);
            }

        } catch (Exception e) {
            log.error("Error detecting zone capacity violations for vendor: {}", vendor.getId(), e);
        }

        return violations;
    }

    /**
     * Create violation with proper attributes
     */
    private Violation createViolation(Vendor vendor, ViolationType violationType, 
                                    String description, DetectionMethod detectionMethod, 
                                    double confidenceScore) {
        
        try {
            java.util.List<VendorLocation> vendorLocations = vendorLocationRepository.findByVendorId(vendor.getId());
            BigDecimal distance = null;
            VendorLocation vendorLocation = null;
            Zone zone = null;
            
            // Calculate distance from zone if applicable
            if (!vendorLocations.isEmpty()) {
                vendorLocation = vendorLocations.get(0);
                if (vendorLocation.getZone() != null) {
                    zone = vendorLocation.getZone();
                    if (zone.getLatitude() != null && zone.getLongitude() != null) {
                        distance = BigDecimal.valueOf(
                            geofencingService.calculateHaversineDistance(
                                zone.getLatitude().doubleValue(),
                                zone.getLongitude().doubleValue(),
                                zone.getLatitude().doubleValue(),
                                zone.getLongitude().doubleValue()
                            )
                        );
                    }
                }
            }

            return Violation.builder()
                .vendor(vendor)
                .violationType(violationType)
                .detectionMethod(detectionMethod)
                .description(description)
                .gpsLatitude(vendorLocation != null && vendorLocation.getZone() != null ? 
                    vendorLocation.getZone().getLatitude() : null)
                .gpsLongitude(vendorLocation != null && vendorLocation.getZone() != null ? 
                    vendorLocation.getZone().getLongitude() : null)
                .distanceFromZone(distance)
                .autoDetected(detectionMethod != DetectionMethod.MANUAL)
                .confidenceScore(confidenceScore)
                .validationStatus(ValidationStatus.PENDING)
                .capturedAt(LocalDateTime.now())
                .createdAt(LocalDateTime.now())
                .build();

        } catch (Exception e) {
            log.error("Error creating violation", e);
            return null;
        }
    }

    /**
     * Manual violation creation by officer
     */
    public Violation createManualViolation(ViolationRequest request) {

        try {
            Vendor vendor = vendorRepository.findById(Long.valueOf(request.getVendorId()))
                .orElseThrow(() -> new RuntimeException("Vendor not found"));

            Violation violation = createViolation(vendor,
                request.getViolationType(),
                request.getDescription(),
                DetectionMethod.MANUAL,
                1.0);

            violation.setReporterName(request.getReporterName());
            violation.setReporterPhone(request.getReporterPhone());
            violation.setImageProofUrl(request.getImageProofUrl());

            // Set the user who reported the violation
            if (request.getReportedByUserId() != null) {
                User reportedBy = userRepository.findById(request.getReportedByUserId())
                    .orElse(null);
                violation.setReportedBy(reportedBy);
            }

            return violationRepository.save(violation);

        } catch (Exception e) {
            log.error("Error creating manual violation", e);
            throw new RuntimeException("Failed to create violation: " + e.getMessage());
        }
    }

    /**
     * Create violation from citizen report
     */
    public Violation createViolationFromCitizenReport(Long vendorId, String reportType, 
                                                   String description, String reporterName, 
                                                   String reporterPhone, String imageUrl) {
        
        try {
            Vendor vendor = vendorRepository.findById(vendorId)
                .orElseThrow(() -> new RuntimeException("Vendor not found"));

            ViolationType violationType = mapReportTypeToViolationType(reportType);

            Violation violation = createViolation(vendor, 
                violationType, 
                "Citizen report: " + description, 
                DetectionMethod.CITIZEN_REPORT, 
                0.7); // Lower confidence for citizen reports

            violation.setReporterName(reporterName);
            violation.setReporterPhone(reporterPhone);
            violation.setImageProofUrl(imageUrl);

            return violationRepository.save(violation);

        } catch (Exception e) {
            log.error("Error creating violation from citizen report", e);
            throw new RuntimeException("Failed to create violation: " + e.getMessage());
        }
    }

    /**
     * Map citizen report type to violation type
     */
    private ViolationType mapReportTypeToViolationType(String reportType) {
        return switch (reportType.toUpperCase()) {
            case "LOCATION_VIOLATION" -> ViolationType.LOCATION_VIOLATION;
            case "TIME_VIOLATION" -> ViolationType.TIME_RESTRICTION;
            case "OVERCROWDING" -> ViolationType.OVERCROWDING;
            case "UNAUTHORIZED_VENDOR" -> ViolationType.UNAUTHORIZED_ZONE;
            case "HYGIENE_ISSUE" -> ViolationType.HYGIENE_ISSUE;
            default -> ViolationType.OTHER;
        };
    }

    /**
     * Send alerts for critical violations
     */
    private void sendAlertsForViolations(List<Violation> violations) {
        // This would integrate with the alert system
        // For now, just log the violations
        for (Violation violation : violations) {
            if (violation.getConfidenceScore() >= 0.8) {
                log.warn("High confidence violation detected: {} - {}", 
                    violation.getViolationType(), violation.getDescription());
            }
        }
    }

    /**
     * Get violation statistics
     */
    public ViolationStatistics getViolationStatistics() {
        try {
            long totalViolations = violationRepository.count();
            long autoDetected = violationRepository.countByAutoDetected(true);
            long manualDetected = totalViolations - autoDetected;
            
            return ViolationStatistics.builder()
                .totalViolations(totalViolations)
                .autoDetected(autoDetected)
                .manualDetected(manualDetected)
                .autoDetectionRate(totalViolations > 0 ? (double) autoDetected / totalViolations : 0.0)
                .build();

        } catch (Exception e) {
            log.error("Error getting violation statistics", e);
            return ViolationStatistics.builder().build();
        }
    }
}

// ViolationRequest is now in dto package
