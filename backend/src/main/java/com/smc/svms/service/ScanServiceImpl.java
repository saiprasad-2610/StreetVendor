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
        
        // Use advanced algorithms if enabled
        if (useAdvancedAlgorithms) {
            // Select optimal algorithm based on distance and GPS accuracy
            if (request.getGpsAccuracy() != null && request.getGpsAccuracy() > 50) {
                // Poor GPS - use Vincenty for maximum accuracy
                AdvancedGeofencingAlgorithms.GeodesicResult vincentyResult = 
                    AdvancedGeofencingAlgorithms.VincentyDistance.calculateDistance(
                        request.getLatitude(),
                        request.getLongitude(),
                        vendor.getLocation().getLatitude().doubleValue(),
                        vendor.getLocation().getLongitude().doubleValue()
                    );
                distance = vincentyResult.getDistance();
                algorithmUsed = "VINCENTY";
            } else if (request.getGpsAccuracy() != null && request.getGpsAccuracy() < 5) {
                // Excellent GPS - use Fast Euclidean for speed
                distance = AdvancedGeofencingAlgorithms.FastEuclidean.calculateDistance(
                    request.getLatitude(),
                    request.getLongitude(),
                    vendor.getLocation().getLatitude().doubleValue(),
                    vendor.getLocation().getLongitude().doubleValue()
                );
                algorithmUsed = "FAST_EUCLIDEAN";
            } else {
                // Good GPS - use Improved Haversine for balance
                distance = AdvancedGeofencingAlgorithms.ImprovedHaversine.calculateDistance(
                    request.getLatitude(),
                    request.getLongitude(),
                    vendor.getLocation().getLatitude().doubleValue(),
                    vendor.getLocation().getLongitude().doubleValue()
                );
                algorithmUsed = "IMPROVED_HAVERSINE";
            }
            
            // Calculate confidence based on GPS accuracy
            confidence = calculateConfidence(request.getGpsAccuracy(), distance);
        } else {
            // Use legacy Haversine
            distance = GeoUtils.calculateDistance(
                request.getLatitude(),
                request.getLongitude(),
                vendor.getLocation().getLatitude().doubleValue(),
                vendor.getLocation().getLongitude().doubleValue()
            );
        }

        // Calculate adaptive threshold based on GPS accuracy
        double adaptiveThreshold = calculateAdaptiveThreshold(request.getGpsAccuracy(), distance);

        ValidationStatus status = distance <= adaptiveThreshold ? ValidationStatus.VALID : ValidationStatus.INVALID;
        String message = generateValidationMessage(status, distance, adaptiveThreshold, request.getGpsAccuracy(), detectedCity, algorithmUsed, confidence);

        // If location is invalid, issue an automatic challan
        // Only issue if confidence is high enough to avoid false positives
        if (status == ValidationStatus.INVALID && confidence >= 0.7) {
            String locationStr = String.format("%.4f, %.4f", request.getLatitude(), request.getLongitude());
            String cityInfo = detectedCity != null ? " (Detected: " + detectedCity + ")" : "";
            String algorithmInfo = useAdvancedAlgorithms ? " (Algorithm: " + algorithmUsed + ", Confidence: " + String.format("%.1f%%", confidence * 100) + ")" : "";
            challanService.issueAutomaticChallan(
                vendor,
                "Location Mismatch: Vendor found at " + locationStr + cityInfo + " instead of registered location" + algorithmInfo,
                locationStr,
                request.getImageProofUrl()
            );
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
     * Generate validation message with GPS accuracy, city, algorithm, and confidence information
     */
    private String generateValidationMessage(ValidationStatus status, double distance, double threshold, 
                                           Double gpsAccuracy, String detectedCity, String algorithmUsed, double confidence) {
        String cityInfo = detectedCity != null ? " (Location: " + detectedCity + ")" : "";
        String algorithmInfo = " (Algorithm: " + algorithmUsed + ", Confidence: " + String.format("%.1f%%", confidence * 100) + ")";
        
        if (status == ValidationStatus.VALID) {
            return String.format("Vendor is in correct location%s. (Distance: %.1fm, GPS Accuracy: ±%.1fm)%s",
                    cityInfo, distance, gpsAccuracy != null ? gpsAccuracy : 0, algorithmInfo);
        } else {
            return String.format("Vendor is outside designated area%s (Distance: %.1fm, Threshold: %.1fm, GPS Accuracy: ±%.1fm)%s",
                    cityInfo, distance, threshold, gpsAccuracy != null ? gpsAccuracy : 0, algorithmInfo);
        }
    }
}
