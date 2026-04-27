package com.smc.svms.repository;

import com.smc.svms.entity.ViolationPattern;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface ViolationPatternRepository extends JpaRepository<ViolationPattern, Long> {
    
    List<ViolationPattern> findByVendorIdOrderByValidationTimeDesc(Long vendorId);
    
    List<ViolationPattern> findByVendorIdAndValidationTimeAfterOrderByValidationTimeDesc(
            Long vendorId, LocalDateTime after);
    
    List<ViolationPattern> findByVendorIdAndIsValidOrderByValidationTimeDesc(
            Long vendorId, Boolean isValid);
    
    List<ViolationPattern> findByDeviceIdOrderByValidationTimeDesc(String deviceId);
    
    @Query("SELECT vp FROM ViolationPattern vp WHERE vp.vendorId = :vendorId " +
           "AND vp.validationTime >= :startDate AND vp.validationTime <= :endDate " +
           "ORDER BY vp.validationTime DESC")
    List<ViolationPattern> findByVendorIdAndDateRange(
            @Param("vendorId") Long vendorId,
            @Param("startDate") LocalDateTime startDate,
            @Param("endDate") LocalDateTime endDate);
    
    @Query("SELECT COUNT(vp) FROM ViolationPattern vp WHERE vp.vendorId = :vendorId " +
           "AND vp.isValid = false AND vp.validationTime >= :since")
    Long countViolationsSince(@Param("vendorId") Long vendorId, @Param("since") LocalDateTime since);
    
    @Query("SELECT vp FROM ViolationPattern vp WHERE vp.validationTime >= :since " +
           "ORDER BY vp.validationTime DESC")
    List<ViolationPattern> findRecentPatterns(@Param("since") LocalDateTime since);
    
    @Query("SELECT DISTINCT vp.vendorId FROM ViolationPattern vp " +
           "WHERE vp.validationTime >= :since AND vp.isValid = false")
    List<Long> findVendorsWithRecentViolations(@Param("since") LocalDateTime since);
    
    @Query("SELECT vp FROM ViolationPattern vp WHERE vp.latitude BETWEEN :latMin AND :latMax " +
           "AND vp.longitude BETWEEN :lonMin AND :lonMax " +
           "AND vp.validationTime >= :since ORDER BY vp.validationTime DESC")
    List<ViolationPattern> findPatternsInLocationRange(
            @Param("latMin") Double latMin, @Param("latMax") Double latMax,
            @Param("lonMin") Double lonMin, @Param("lonMax") Double lonMax,
            @Param("since") LocalDateTime since);
    
    Optional<ViolationPattern> findTopByVendorIdOrderByValidationTimeDesc(Long vendorId);
    
    @Query("SELECT COUNT(vp) FROM ViolationPattern vp WHERE vp.vendorId = :vendorId " +
           "AND vp.validationTime >= :since")
    Long countPatternsSince(@Param("vendorId") Long vendorId, @Param("since") LocalDateTime since);
}
