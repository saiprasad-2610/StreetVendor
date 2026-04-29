package com.smc.svms.service;

import com.smc.svms.algorithm.AdvancedGeofencingAlgorithms;
import com.smc.svms.dto.ScanRequest;
import com.smc.svms.dto.ScanValidationResponse;
import com.smc.svms.entity.Vendor;
import com.smc.svms.enums.ValidationStatus;
import com.smc.svms.repository.VendorRepository;
import com.smc.svms.util.GeoUtils;
import com.smc.svms.util.ReverseGeocodingUtil;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Slf4j
public class ScanServiceImpl implements ScanService {

    private final VendorRepository vendorRepository;
    private final ChallanService challanService;
    private final ReverseGeocodingUtil reverseGeocodingUtil;
    private final BasicViolationDetectionService violationDetectionService;

    @Value("${app.location.threshold-meters}")
    private double thresholdMeters;

    @Value("${app.expected-city:Solapur}")
    private String expectedCity;
    
    @Value("${geofencing.use-advanced-algorithms:true}")
    private boolean useAdvancedAlgorithms;

    @Override
    @Transactional
    public ScanValidationResponse validateVendorLocation(ScanRequest request) {
        Vendor vendor = vendorRepository.findByVendorId(request.getVendorId())
                .orElseThrow(() -> new RuntimeException("Vendor not found with id: " + request.getVendorId()));

        if (vendor.getLocation() == null) {
            throw new RuntimeException("Vendor has no registered location");
        }

        // Validate city using reverse geocoding to prevent location spoofing
        String detectedCity = reverseGeocodingUtil.getCityFromCoordinates(
                request.getLatitude(), request.getLongitude());

        // Log detected city for debugging
        if (detectedCity != null) {
            System.out.println("Detected city from coordinates: " + detectedCity);
        }

        double distance;
        String algorithmUsed = "HAVERSINE";
        double confidence = 1.0;
        
        // DEBUG: Log coordinates for troubleshooting
        double scanLat = request.getLatitude();
        double scanLon = request.getLongitude();
        double vendorLat = vendor.getLocation().getLatitude().doubleValue();
        double vendorLon = vendor.getLocation().getLongitude().doubleValue();
        log.info("DEBUG SCAN: Scan Location: ({}, {}), Vendor Location: ({}, {}), Vendor: {}",
                 scanLat, scanLon, vendorLat, vendorLon, vendor.getVendorId());

        // Use advanced algorithms if enabled
        if (useAdvancedAlgorithms) {
            // Always use Improved Haversine - it's accurate (99%) and reliable for all distances
            // Vincenty has numerical precision issues with short distances (< 100m)
            distance = AdvancedGeofencingAlgorithms.ImprovedHaversine.calculateDistance(
                scanLat, scanLon, vendorLat, vendorLon
            );
            log.info("DEBUG SCAN: Calculated distance: {} meters ({} feet)", distance, distance * 3.281);
            algorithmUsed = "IMPROVED_HAVERSINE";
            
            // Calculate confidence based on GPS accuracy
            confidence = calculateConfidence(request.getGpsAccuracy(), distance);
        } else {
            // Default scanner type for backward compatibility
            if (request.getScannerType() == null) {
                request.setScannerType(ScanRequest.ScannerType.PUBLIC_USER);
            }
            // Use legacy Haversine
            distance = GeoUtils.calculateDistance(
                request.getLatitude(),
                request.getLongitude(),
                vendor.getLocation().getLatitude().doubleValue(),
                vendor.getLocation().getLongitude().doubleValue()
            );
        }

        // Use FIXED threshold - strict 4 meter rule regardless of GPS accuracy
        // This ensures consistent violation detection
        double fixedThreshold = thresholdMeters;

        ValidationStatus status = distance <= fixedThreshold ? ValidationStatus.VALID : ValidationStatus.INVALID;
        String message = generateValidationMessage(status, distance, fixedThreshold, request.getGpsAccuracy(), detectedCity, algorithmUsed, confidence);

        // If location is invalid, determine action based on scanner type
        // CRITICAL FRAUD PREVENTION: Only auto-issue challans for authenticated enforcement officers
        if (status == ValidationStatus.INVALID && confidence >= 0.7) {
            String locationStr = String.format("%.4f, %.4f", request.getLatitude(), request.getLongitude());
            String cityInfo = detectedCity != null ? " (Detected: " + detectedCity + ")" : "";
            String algorithmInfo = useAdvancedAlgorithms ? " (Algorithm: " + algorithmUsed + ", Confidence: " + String.format("%.1f%%", confidence * 100) + ")" : "";
            
            // FRAUD PREVENTION: Check who is scanning
            if (request.isEnforcementOfficer()) {
                // ✅ Authenticated officer scan - Safe to auto-issue challan
                log.info("Auto-issuing challan for vendor {} - scanned by enforcement officer {}", 
                        vendor.getVendorId(), request.getScannerId());
                // Convert distance to feet for challan message
                double distanceFeet = distance * 3.281;
                challanService.issueAutomaticChallan(
                    vendor,
                    "Location Mismatch: Vendor found at " + locationStr + cityInfo + " instead of registered location" + algorithmInfo + " [Officer: " + request.getScannerName() + ", Distance: " + String.format("%.1fft", distanceFeet) + "]",
                    locationStr,
                    request.getImageProofUrl()
                );
            } else if (request.isVendorSelfScan()) {
                // ⚠️ Vendor scanning their own QR code but at wrong location
                // Don't auto-issue challan - vendor can't frame themselves
                log.warn("Vendor {} self-scan shows location mismatch. Creating pending review instead of auto-challan.", 
                        vendor.getVendorId());
                createPendingReviewViolation(vendor, request, locationStr, cityInfo, distance, "Vendor self-scan outside registered location");
            } else {
                // 🚨 PUBLIC USER SCAN - HIGH FRAUD RISK
                // Sham can photograph Ram's QR, go elsewhere, scan it, and frame Ram
                // Solution: Create PENDING REVIEW violation, NOT auto-challan
                log.warn("Public/anonymous scan detected location mismatch for vendor {}. Creating PENDING REVIEW instead of auto-challan to prevent fraud.", 
                        vendor.getVendorId());
                createPendingReviewViolation(vendor, request, locationStr, cityInfo, distance, 
                    "Public reported location mismatch (PENDING REVIEW - Possible fraud attempt)");
            }
        } else if (status == ValidationStatus.INVALID && confidence < 0.7) {
            log.warn("Skipping challan for vendor {} due to low confidence ({:.1f%})", 
                     vendor.getVendorId(), confidence);
        }

        return ScanValidationResponse.builder()
                .vendorId(vendor.getVendorId())
                .vendorName(vendor.getName())
                .category(vendor.getCategory().name())
                .validationStatus(status)
                .distance(distance)
                .message(message)
                .confidence(useAdvancedAlgorithms ? confidence : null)
                .algorithmUsed(useAdvancedAlgorithms ? algorithmUsed : null)
                .build();
    }

    /**
     * Calculate adaptive threshold based on GPS accuracy
     * Poor GPS accuracy = more lenient threshold to avoid false positives
     */
    private double calculateAdaptiveThreshold(Double gpsAccuracy, double distance) {
        double threshold = thresholdMeters;

        if (gpsAccuracy != null) {
            if (gpsAccuracy <= 5) {
                // Excellent GPS - use stricter threshold
                threshold *= 0.8;
            } else if (gpsAccuracy <= 10) {
                // Good GPS - normal threshold
                threshold *= 1.0;
            } else if (gpsAccuracy <= 20) {
                // Acceptable GPS - more lenient threshold
                threshold *= 1.5;
            } else {
                // Poor GPS - very lenient threshold
                threshold *= 2.0;
            }
        }

        // Adjust threshold based on distance (farther distances get more leniency)
        if (distance > 100) {
            threshold *= 1.2;
        } else if (distance > 50) {
            threshold *= 1.1;
        }

        return threshold;
    }

    /**
     * Calculate confidence score based on GPS accuracy and distance
     */
    private double calculateConfidence(Double gpsAccuracy, double distance) {
        double confidence = 1.0;
        
        if (gpsAccuracy != null) {
            if (gpsAccuracy <= 3) {
                confidence = 1.0; // Excellent GPS
            } else if (gpsAccuracy <= 10) {
                confidence = 0.9; // Good GPS
            } else if (gpsAccuracy <= 20) {
                confidence = 0.75; // Fair GPS
            } else if (gpsAccuracy <= 50) {
                confidence = 0.6; // Poor GPS
            } else {
                confidence = 0.4; // Very poor GPS
            }
        }
        
        // Adjust based on distance from threshold
        if (distance < 5) {
            confidence *= 0.8; // Near boundary, less certain
        } else if (distance > 50) {
            confidence *= 1.1; // Far from boundary, more certain
        }
        
        return Math.max(0.1, Math.min(1.0, confidence));
    }
    
    /**
     * Create a pending review violation for public/vendor scans with location mismatch
     * This prevents fraudulent challans from malicious third-party scans
     */
    private void createPendingReviewViolation(Vendor vendor, ScanRequest request, String locationStr, 
                                               String cityInfo, double distance, String reason) {
        try {
            // Convert distance to feet for violation description
            double distanceFeet = distance * 3.281;
            String description = String.format(
                "%s - Distance: %.1fft from registered location. Scanner: %s (Type: %s). Location: %s%s. Device: %s",
                reason,
                distanceFeet,
                request.getScannerName() != null ? request.getScannerName() : "Anonymous",
                request.getScannerType() != null ? request.getScannerType() : "UNKNOWN",
                locationStr,
                cityInfo,
                request.getDeviceId() != null ? request.getDeviceId() : "Unknown"
            );
            
            violationDetectionService.createViolationFromCitizenReport(
                vendor.getId(),
                "LOCATION_VIOLATION",
                description,
                request.getScannerName() != null ? request.getScannerName() : "Public User",
                request.getDeviceId() != null ? request.getDeviceId() : "Unknown",
                request.getImageProofUrl()
            );
            
            log.info("Created pending review violation for vendor {} due to {} scan at mismatched location", 
                    vendor.getVendorId(), 
                    request.getScannerType() != null ? request.getScannerType() : "unknown");
                    
        } catch (Exception e) {
            log.error("Failed to create pending review violation for vendor {}", vendor.getVendorId(), e);
        }
    }

    /**
     * Generate validation message with GPS accuracy, city, algorithm, and confidence information
     * All distances converted to feet for display
     */
    private String generateValidationMessage(ValidationStatus status, double distance, double threshold, 
                                           Double gpsAccuracy, String detectedCity, String algorithmUsed, double confidence) {
        String cityInfo = detectedCity != null ? " (Location: " + detectedCity + ")" : "";
        String algorithmInfo = " (Algorithm: " + algorithmUsed + ", Confidence: " + String.format("%.1f%%", confidence * 100) + ")";
        
        // Convert meters to feet (1 meter = 3.281 feet)
        double distanceFeet = distance * 3.281;
        double thresholdFeet = threshold * 3.281;
        double gpsAccuracyFeet = gpsAccuracy != null ? gpsAccuracy * 3.281 : 0;
        
        if (status == ValidationStatus.VALID) {
            return String.format("Vendor is in correct location%s. (Distance: %.1fft, GPS Accuracy: ±%.1fft)%s",
                    cityInfo, distanceFeet, gpsAccuracyFeet, algorithmInfo);
        } else {
            return String.format("Vendor is outside designated area%s (Distance: %.1fft, Threshold: %.1fft, GPS Accuracy: ±%.1fft)%s",
                    cityInfo, distanceFeet, thresholdFeet, gpsAccuracyFeet, algorithmInfo);
        }
    }
}
