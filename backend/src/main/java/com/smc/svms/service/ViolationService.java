package com.smc.svms.service;

import com.smc.svms.dto.ViolationRequest;
import com.smc.svms.entity.Violation;
import org.springframework.web.multipart.MultipartFile;
import java.util.List;

public interface ViolationService {
    Violation reportViolation(ViolationRequest request, MultipartFile image);
    List<Violation> getAllViolations();
    List<Violation> getViolationsByVendorId(String vendorId);
}
