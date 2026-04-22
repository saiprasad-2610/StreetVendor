package com.smc.svms.repository;

import com.smc.svms.entity.Challan;
import com.smc.svms.entity.Vendor;
import com.smc.svms.enums.ChallanStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface ChallanRepository extends JpaRepository<Challan, Long> {
    Optional<Challan> findByChallanNumber(String challanNumber);
    
    @Query("SELECT c FROM Challan c WHERE c.vendor.id = :vendorId")
    List<Challan> findByVendorPrimaryKey(@Param("vendorId") Long vendorId);
    
    List<Challan> findByVendorVendorId(String vendorId);
    List<Challan> findByVendorId(Long id);
    List<Challan> findByVendor(Vendor vendor);
    @Query("SELECT c FROM Challan c WHERE c.vendor.createdBy.username = :username")
    List<Challan> findByVendorCreatedByUsername(@Param("username") String username);
    
    List<Challan> findByStatus(ChallanStatus status);
    List<Challan> findByVendorVendorIdAndReasonStartingWithAndIssuedAtAfter(String vendorId, String reason, LocalDateTime issuedAt);

    @Query("SELECT SUM(c.fineAmount) FROM Challan c WHERE c.vendor.id = :vendorId AND c.status = com.smc.svms.enums.ChallanStatus.UNPAID")
    java.math.BigDecimal sumUnpaidFinesByVendorId(@Param("vendorId") Long vendorId);
}
