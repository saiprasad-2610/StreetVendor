package com.smc.svms.service;

import com.smc.svms.dto.ScanRequest;
import com.smc.svms.dto.ScanValidationResponse;

public interface ScanService {
    ScanValidationResponse validateVendorLocation(ScanRequest request);
}
