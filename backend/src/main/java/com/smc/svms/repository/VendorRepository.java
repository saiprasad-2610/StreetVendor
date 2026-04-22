package com.smc.svms.repository;

import com.smc.svms.entity.Vendor;
import com.smc.svms.enums.VendorStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;

@Repository
public interface VendorRepository extends JpaRepository<Vendor, Long> {
    Optional<Vendor> findByVendorId(String vendorId);
    Optional<Vendor> findByCreatedByUsername(String username);
    List<Vendor> findByStatus(VendorStatus status);
    boolean existsByVendorId(String vendorId);
}
