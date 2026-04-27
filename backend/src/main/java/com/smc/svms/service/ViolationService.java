package com.smc.svms.service;

import com.smc.svms.dto.ViolationRequest;
import com.smc.svms.entity.Violation;
import com.smc.svms.entity.ViolationType;
import com.smc.svms.entity.CitizenReport;
import org.springframework.web.multipart.MultipartFile;
import java.util.List;

public interface ViolationService {
    Violation reportViolation(ViolationRequest request, MultipartFile image);
    List<Violation> getAllViolations();
    List<Violation> getViolationsByVendorId(String vendorId);
    List<Violation> getViolationsByType(ViolationType violationType);
    List<Violation> getAutoDetectedViolations();
    Violation createManualViolation(ViolationRequest request);
    Violation createViolationFromCitizenReport(CitizenReport report);
    List<Violation> saveAll(List<Violation> violations);
}
