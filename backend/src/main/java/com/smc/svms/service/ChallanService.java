package com.smc.svms.service;

import com.smc.svms.dto.ChallanRequest;
import com.smc.svms.entity.Challan;
import com.smc.svms.entity.Vendor;
import java.util.List;

public interface ChallanService {
    Challan issueChallan(ChallanRequest request);
    Challan issueAutomaticChallan(Vendor vendor, String reason, String location, String imageUrl);
    List<Challan> getAllChallans();
    List<Challan> getMyChallans();
    List<Challan> getChallansByVendorId(String vendorId);
    Challan markPaid(Long id);
}
