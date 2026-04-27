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

    public ViolationServiceImpl(ViolationRepository violationRepository, VendorRepository vendorRepository, UserRepository userRepository, ChallanService challanService, FileStorageService fileStorageService) {
        this.violationRepository = violationRepository;
        this.vendorRepository = vendorRepository;
        this.userRepository = userRepository;
        this.challanService = challanService;
        this.fileStorageService = fileStorageService;
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
}
