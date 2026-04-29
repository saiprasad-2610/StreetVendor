package com.smc.svms.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.beans.factory.annotation.Value;
import com.smc.svms.dto.ViolationRequest;
import com.smc.svms.entity.User;
import com.smc.svms.entity.Vendor;
import com.smc.svms.entity.Violation;
import com.smc.svms.entity.ViolationType;
import com.smc.svms.entity.CitizenReport;
import com.smc.svms.entity.Challan;
import com.smc.svms.enums.ValidationStatus;
import com.smc.svms.repository.UserRepository;
import com.smc.svms.repository.VendorRepository;
import com.smc.svms.repository.ViolationRepository;
import com.smc.svms.util.GeoUtils;
import org.springframework.security.authentication.AnonymousAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.ArrayList;

@Service
public class ViolationServiceImpl implements ViolationService {

    private static final Logger log = LoggerFactory.getLogger(ViolationServiceImpl.class);

    private final ViolationRepository violationRepository;
    private final VendorRepository vendorRepository;
    private final UserRepository userRepository;
    private final ChallanService challanService;
    private final FileStorageService fileStorageService;
    private final com.smc.svms.repository.AlertRepository alertRepository;
    private final EmailService emailService;

    public ViolationServiceImpl(ViolationRepository violationRepository, VendorRepository vendorRepository, UserRepository userRepository, ChallanService challanService, FileStorageService fileStorageService, com.smc.svms.repository.AlertRepository alertRepository, EmailService emailService) {
        this.violationRepository = violationRepository;
        this.vendorRepository = vendorRepository;
        this.userRepository = userRepository;
        this.challanService = challanService;
        this.fileStorageService = fileStorageService;
        this.alertRepository = alertRepository;
        this.emailService = emailService;
    }

    @Value("${app.base-url}")
    private String baseUrl;

    @Value("${app.location.threshold-meters}")
    private double thresholdMeters;

    @Override
    @Transactional
    public Violation reportViolation(ViolationRequest request, MultipartFile image) {
        log.info("Reporting violation for vendor: {} by reporter: {}", request.getVendorId(), request.getReporterName());
        
        String imageProofUrl = null;
        if (image != null && !image.isEmpty()) {
            String fileName = fileStorageService.storeFile(image);
            imageProofUrl = baseUrl + "/api/files/violations/" + fileName;
        }

        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        User reporter = null;
        
        if (authentication != null && authentication.isAuthenticated() && 
            !(authentication instanceof AnonymousAuthenticationToken)) {
            String username = authentication.getName();
            reporter = userRepository.findByUsername(username).orElse(null);
        }

        Vendor vendor = vendorRepository.findByVendorId(request.getVendorId())
                .orElseThrow(() -> new RuntimeException("Vendor not found with id: " + request.getVendorId()));

        // Auto-validate violation based on distance
        double distance = GeoUtils.calculateDistance(
                request.getGpsLatitude(),
                request.getGpsLongitude(),
                vendor.getLocation().getLatitude().doubleValue(),
                vendor.getLocation().getLongitude().doubleValue()
        );

        ValidationStatus validationStatus = distance > thresholdMeters ? ValidationStatus.VALID : ValidationStatus.INVALID;

        Violation violation = Violation.builder()
                .vendor(vendor)
                .reportedBy(reporter)
                .reporterName(request.getReporterName())
                .reporterPhone(request.getReporterPhone())
                .imageProofUrl(imageProofUrl != null ? imageProofUrl : request.getImageProofUrl())
                .gpsLatitude(BigDecimal.valueOf(request.getGpsLatitude()))
                .gpsLongitude(BigDecimal.valueOf(request.getGpsLongitude()))
                .description(request.getDescription())
                .capturedAt(request.getCapturedAt() != null ? request.getCapturedAt() : LocalDateTime.now())
                .validationStatus(validationStatus)
                .build();

        Violation savedViolation = violationRepository.save(violation);

        // Note: Automatic fine is already handled by ScanService during the initial scan phase.
        // We only record the violation details here for evidence.

        return savedViolation;
    }

    @Override
    @Transactional
    public List<String> reportViolationWithImages(ViolationRequest request, List<MultipartFile> images) {
        log.info("Reporting violation with {} images for vendor: {}", images.size(), request.getVendorId());
        
        List<String> imageUrls = new ArrayList<>();
        
        // Save all images
        for (int i = 0; i < images.size(); i++) {
            MultipartFile image = images.get(i);
            if (image != null && !image.isEmpty()) {
                String fileName = fileStorageService.storeFile(image);
                String imageUrl = baseUrl + "/api/files/violations/" + fileName;
                imageUrls.add(imageUrl);
                log.info("Saved image {} for violation: {}", i + 1, imageUrl);
            }
        }
        
        // Store all image URLs as JSON array for multiple image support
        String imageProofUrlJson = imageUrls.isEmpty() ? null : "[" + imageUrls.stream()
            .map(url -> "\"" + url + "\"")
            .reduce((a, b) -> a + "," + b)
            .orElse("") + "]";
        
        // Get current user
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        User reporter = null;
        
        if (authentication != null && authentication.isAuthenticated() && 
            !(authentication instanceof AnonymousAuthenticationToken)) {
            String username = authentication.getName();
            reporter = userRepository.findByUsername(username).orElse(null);
        }

        // Get vendor
        Vendor vendor = vendorRepository.findByVendorId(request.getVendorId())
                .orElseThrow(() -> new RuntimeException("Vendor not found with id: " + request.getVendorId()));

        // Auto-validate violation based on distance
        double distance = GeoUtils.calculateDistance(
                request.getGpsLatitude(),
                request.getGpsLongitude(),
                vendor.getLocation().getLatitude().doubleValue(),
                vendor.getLocation().getLongitude().doubleValue()
        );

        ValidationStatus validationStatus = distance > thresholdMeters ? ValidationStatus.VALID : ValidationStatus.INVALID;

        // Build violation with all image URLs as JSON array
        Violation violation = Violation.builder()
                .vendor(vendor)
                .reportedBy(reporter)
                .reporterName(request.getReporterName())
                .reporterPhone(request.getReporterPhone())
                .imageProofUrl(imageProofUrlJson)
                .gpsLatitude(BigDecimal.valueOf(request.getGpsLatitude()))
                .gpsLongitude(BigDecimal.valueOf(request.getGpsLongitude()))
                .description(request.getDescription() + " [" + images.size() + " photos attached]")
                .capturedAt(request.getCapturedAt() != null ? request.getCapturedAt() : LocalDateTime.now())
                .validationStatus(validationStatus)
                .build();

        violationRepository.save(violation);
        log.info("Violation saved with {} images for vendor {}", imageUrls.size(), request.getVendorId());
        
        return imageUrls;
    }

    @Override
    public List<Violation> getAllViolations() {
        return violationRepository.findAll();
    }

    @Override
    public List<Violation> getViolationsByVendorId(String vendorId) {
        return violationRepository.findByVendorVendorId(vendorId);
    }

    @Override
    public List<Violation> getViolationsByType(ViolationType violationType) {
        return violationRepository.findByViolationType(violationType);
    }

    @Override
    public List<Violation> getAutoDetectedViolations() {
        return violationRepository.findByDetectionMethod(com.smc.svms.entity.DetectionMethod.AUTO_DETECTED);
    }

    @Override
    public Violation createManualViolation(ViolationRequest request) {
        // Implementation for manual violation creation
        Violation violation = Violation.builder()
                .vendor(vendorRepository.findByVendorId(request.getVendorId())
                        .orElseThrow(() -> new RuntimeException("Vendor not found")))
                .reporterName(request.getReporterName())
                .reporterPhone(request.getReporterPhone())
                .description(request.getDescription())
                .capturedAt(LocalDateTime.now())
                .validationStatus(ValidationStatus.PENDING)
                .build();
        
        return violationRepository.save(violation);
    }

    @Override
    public Violation createViolationFromCitizenReport(CitizenReport report) {
        // Implementation for creating violation from citizen report
        Violation violation = Violation.builder()
                .vendor(vendorRepository.findByVendorId(report.getVendor().getVendorId())
                        .orElseThrow(() -> new RuntimeException("Vendor not found")))
                .reporterName(report.getReporterName())
                .reporterPhone(report.getReporterPhone())
                .description(report.getDescription())
                .capturedAt(report.getCreatedAt())
                .validationStatus(ValidationStatus.PENDING)
                .build();
        
        return violationRepository.save(violation);
    }
    
    @Override
    public List<Violation> saveAll(List<Violation> violations) {
        return violationRepository.saveAll(violations);
    }

    @Override
    @Transactional
    public Violation resolveViolation(Long violationId, com.smc.svms.enums.ViolationAction action, String notes, Long officerId) {
        log.info("Resolving violation {} with action: {} by officer: {}", violationId, action, officerId);

        Violation violation = violationRepository.findById(violationId)
                .orElseThrow(() -> new RuntimeException("Violation not found with id: " + violationId));

        User officer = userRepository.findById(officerId)
                .orElseThrow(() -> new RuntimeException("Officer not found with id: " + officerId));

        Vendor vendor = violation.getVendor();

        // Set resolution details
        violation.setResolutionAction(action);
        violation.setResolutionNotes(notes);
        violation.setResolvedBy(officer);
        violation.setResolvedAt(LocalDateTime.now());

        switch (action) {
            case ISSUE_CHALLAN:
                // Issue automatic challan
                String locationStr = violation.getGpsLatitude() != null && violation.getGpsLongitude() != null
                        ? String.format("%.4f, %.4f", violation.getGpsLatitude(), violation.getGpsLongitude())
                        : "Unknown Location";

                Challan challan = challanService.issueAutomaticChallan(
                        vendor,
                        "Location Violation: " + violation.getDescription() + " [Resolved by Officer: " + officer.getUsername() + "]",
                        locationStr,
                        violation.getImageProofUrl()
                );
                violation.setChallanIssued(true);
                violation.setValidationStatus(ValidationStatus.VALID);
                log.info("Challan issued for vendor {} for violation {}", vendor.getVendorId(), violationId);

                // Send challan email notification to vendor
                try {
                    emailService.sendChallanIssuedEmail(vendor, challan);
                } catch (Exception e) {
                    log.error("Failed to send challan email to vendor {}: {}", vendor.getVendorId(), e.getMessage());
                }
                break;

            case ISSUE_WARNING:
                // Increment vendor warning count
                try {
                    int warningCount = vendor.incrementWarning();
                    vendorRepository.save(vendor);
                    violation.setWarningNumber(warningCount);
                    log.info("Vendor warning count updated to {}", warningCount);
                } catch (Exception e) {
                    log.error("Failed to update vendor warning count: {}", e.getMessage());
                    // Continue without warning count - column might not exist in DB
                    violation.setWarningNumber(1);
                }

                violation.setValidationStatus(ValidationStatus.VALID);

                // Create alert/notification for vendor
                try {
                    createWarningAlert(violation, vendor, violation.getWarningNumber(), officer);
                } catch (Exception e) {
                    log.error("Failed to create warning alert: {}", e.getMessage());
                    // Don't fail the whole operation if alert creation fails
                }

                log.info("Warning issued to vendor {} for violation {}", vendor.getVendorId(), violationId);

                // Send warning email notification to vendor
                try {
                    emailService.sendWarningIssuedEmail(vendor, violation, violation.getWarningNumber());
                } catch (Exception e) {
                    log.error("Failed to send warning email to vendor {}: {}", vendor.getVendorId(), e.getMessage());
                }

                // Check if max warnings reached (3)
                if (vendor.hasMaxWarnings()) {
                    log.warn("Vendor {} has reached maximum warnings (3). Future violations will auto-convert to challans.", vendor.getVendorId());
                    // Could auto-issue challan here if desired
                }
                break;

            case NO_ACTION:
                // Mark as rejected/fake - use INVALID status (shorter than REJECTED for DB compatibility)
                violation.setValidationStatus(ValidationStatus.INVALID);
                violation.setChallanIssued(false);
                log.info("Violation {} marked as fake/invalid by officer {}", violationId, officerId);
                break;

            default:
                throw new IllegalArgumentException("Unknown violation action: " + action);
        }

        return violationRepository.save(violation);
    }

    /**
     * Create an alert/notification for the vendor about the warning
     */
    private void createWarningAlert(Violation violation, Vendor vendor, int warningNumber, User officer) {
        try {
            com.smc.svms.entity.Alert alert = new com.smc.svms.entity.Alert();
            alert.setAlertType("VIOLATION_WARNING");
            alert.setSeverity(warningNumber >= 3 ? com.smc.svms.enums.AlertSeverity.HIGH : com.smc.svms.enums.AlertSeverity.MEDIUM);
            alert.setTitle("Warning #" + warningNumber + " for Location Violation");

            String message = String.format(
                "Dear %s,\n\nYou have received WARNING #%d for a location violation.\n\n" +
                "Violation Details:\n" +
                "- Type: %s\n" +
                "- Description: %s\n" +
                "- Reported At: %s\n" +
                "- Resolved By: Officer %s\n\n" +
                "%s\n\n" +
                "Please ensure you operate only at your registered location to avoid fines.\n\n" +
                "SMC Street Vendor Management System",
                vendor.getName(),
                warningNumber,
                violation.getViolationType(),
                violation.getDescription(),
                violation.getCapturedAt() != null ? violation.getCapturedAt() : violation.getCreatedAt(),
                officer.getUsername(),
                warningNumber >= 3 ? "⚠️ This is your FINAL WARNING. Next violation will result in automatic challan issuance." : ""
            );

            alert.setMessage(message);
            alert.setVendor(vendor);
            alert.setOfficer(officer);
            alert.setCreatedAt(LocalDateTime.now());
            alert.setStatus(com.smc.svms.enums.AlertStatus.PENDING);
            alert.setPriorityLevel(warningNumber >= 3 ? 80 : 50);

            alertRepository.save(alert);
            log.info("Warning alert created for vendor {} (warning #{})", vendor.getVendorId(), warningNumber);

        } catch (Exception e) {
            log.error("Failed to create warning alert for vendor {}: {}", vendor.getVendorId(), e.getMessage());
            // Don't throw - alert creation failure shouldn't block the warning issuance
        }
    }
}
