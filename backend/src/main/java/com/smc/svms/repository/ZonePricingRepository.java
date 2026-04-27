package com.smc.svms.repository;

import com.smc.svms.entity.ZonePricing;
import com.smc.svms.enums.VendorCategory;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Repository
public interface ZonePricingRepository extends JpaRepository<ZonePricing, Long> {

    @Query("SELECT zp FROM ZonePricing zp WHERE zp.zone.id = :zoneId " +
           "AND zp.vendorCategory = :category " +
           "AND zp.effectiveDate <= :date " +
           "AND (zp.expiryDate IS NULL OR zp.expiryDate >= :date) " +
           "AND zp.isActive = true")
    Optional<ZonePricing> findActivePricing(@Param("zoneId") Long zoneId, 
                                           @Param("category") VendorCategory category, 
                                           @Param("date") LocalDate date);

    List<ZonePricing> findByZoneIdAndIsActive(Long zoneId, Boolean isActive);
}
