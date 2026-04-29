package com.smc.svms.service;

import com.smc.svms.dto.ViolationRequest;
import com.smc.svms.entity.Violation;
import com.smc.svms.entity.ViolationType;
import com.smc.svms.entity.CitizenReport;
import org.springframework.web.multipart.MultipartFile;
import java.util.List;

public interface ViolationService {
    Violation reportViolation(ViolationRequest request, MultipartFile image);
    
    /**
     * Report a violation with multiple images for fraud prevention
     * @param request the violation request
     * @param images list of uploaded images
     * @return list of saved image URLs
     */
    List<String> reportViolationWithImages(ViolationRequest request, List<MultipartFile> images);
    
    List<Violation> getAllViolations();
    List<Violation> getViolationsByVendorId(String vendorId);
    List<Violation> getViolationsByType(ViolationType violationType);
    List<Violation> getAutoDetectedViolations();
    Violation createManualViolation(ViolationRequest request);
    Violation createViolationFromCitizenReport(CitizenReport report);
    List<Violation> saveAll(List<Violation> violations);

    /**
     * Resolve a violation with one of three actions:
     * - ISSUE_CHALLAN: Issue a fine/challan to the vendor
     * - ISSUE_WARNING: Send a warning notification (tracks up to 3 warnings)
     * - NO_ACTION: Dismiss as fake/invalid violation
     *
     * @param violationId the violation to resolve
     * @param action the action to take
     * @param notes optional notes about the resolution
     * @param officerId the officer resolving the violation
     * @return the resolved violation
     */
    Violation resolveViolation(Long violationId, com.smc.svms.enums.ViolationAction action, String notes, Long officerId);
}
