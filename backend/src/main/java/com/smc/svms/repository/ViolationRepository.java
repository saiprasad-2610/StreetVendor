package com.smc.svms.repository;

import com.smc.svms.entity.Violation;
import com.smc.svms.entity.ViolationType;
import com.smc.svms.entity.DetectionMethod;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface ViolationRepository extends JpaRepository<Violation, Long> {
    List<Violation> findByVendorVendorId(String vendorId);
    long countByVendorVendorId(String vendorId);
    List<Violation> findByViolationType(ViolationType violationType);
    List<Violation> findByDetectionMethod(DetectionMethod detectionMethod);
    long countByAutoDetected(boolean autoDetected);
    List<Violation> findByCreatedAtBetween(java.time.LocalDateTime startDate, java.time.LocalDateTime endDate);
    List<Violation> findByCreatedAtBetweenOrderByCreatedAtDesc(java.time.LocalDateTime startDate, java.time.LocalDateTime endDate);
    long countByCreatedAtAfter(java.time.LocalDateTime dateTime);
}
