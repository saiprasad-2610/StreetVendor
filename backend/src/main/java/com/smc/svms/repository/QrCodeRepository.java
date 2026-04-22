package com.smc.svms.repository;

import com.smc.svms.entity.QrCode;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.Optional;

@Repository
public interface QrCodeRepository extends JpaRepository<QrCode, Long> {
    Optional<QrCode> findByVendorVendorId(String vendorId);
}
