package com.smc.svms.service;

import com.smc.svms.dto.VendorDTO;
import com.smc.svms.dto.VendorRequest;
import com.smc.svms.dto.VendorSelfRegisterRequest;
import com.smc.svms.entity.Vendor;
import java.util.List;

public interface VendorService {
    VendorDTO createVendor(VendorRequest request);
    VendorDTO registerVendor(VendorSelfRegisterRequest request);
    VendorDTO getMyProfile();
    List<VendorDTO> getAllVendors();
    VendorDTO getVendorById(Long id);
    VendorDTO getVendorByVendorId(String vendorId);
    VendorDTO approveVendor(Long id);
    VendorDTO rejectVendor(Long id);
    VendorDTO suspendVendor(Long id);
    void deleteVendor(Long id);
    List<VendorDTO> getVendorsByZone(Long zoneId);
}
