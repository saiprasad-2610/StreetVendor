package com.smc.svms.repository;

import com.smc.svms.entity.CitizenReport;
import com.smc.svms.entity.ReportType;
import com.smc.svms.entity.ReportStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface CitizenReportRepository extends JpaRepository<CitizenReport, Long> {

    List<CitizenReport> findByCreatedAtAfter(LocalDateTime dateTime);
    
    Page<CitizenReport> findByReporterPhoneOrderByCreatedAtDesc(String reporterPhone, Pageable pageable);
    
    @Query("""
        SELECT r FROM CitizenReport r
        WHERE r.vendor.id = :vendorId
          AND r.reportType = :reportType
          AND r.createdAt >= :since
          AND (:latitude IS NULL OR r.locationLatitude IS NULL OR ABS(r.locationLatitude - :latitude) < 0.001)
          AND (:longitude IS NULL OR r.locationLongitude IS NULL OR ABS(r.locationLongitude - :longitude) < 0.001)
        """)
    List<CitizenReport> findSimilarReports(@Param("vendorId") Long vendorId,
                                          @Param("latitude") Double latitude,
                                          @Param("longitude") Double longitude,
                                          @Param("reportType") ReportType reportType,
                                          @Param("since") LocalDateTime since);
    
    long countByReporterPhoneAndCreatedAtAfter(String reporterPhone, LocalDateTime dateTime);
    
    long countByIpAddressAndCreatedAtAfter(String ipAddress, LocalDateTime dateTime);
    
    Page<CitizenReport> findByStatusOrderByCreatedAtDesc(ReportStatus status, org.springframework.data.domain.Pageable pageable);
    
    Page<CitizenReport> findByReportTypeOrderByCreatedAtDesc(com.smc.svms.entity.ReportType reportType, org.springframework.data.domain.Pageable pageable);
    
    @org.springframework.data.jpa.repository.Query("SELECT r FROM CitizenReport r WHERE r.validationScore >= :minScore ORDER BY r.validationScore DESC")
    List<CitizenReport> findByValidationScoreGreaterThanEqualOrderByValidationScoreDesc(@org.springframework.data.repository.query.Param("minScore") double minScore);
    
    @org.springframework.data.jpa.repository.Query("SELECT r FROM CitizenReport r WHERE " +
           "LOWER(r.description) LIKE LOWER(CONCAT('%', :searchTerm, '%')) OR " +
           "LOWER(r.reporterName) LIKE LOWER(CONCAT('%', :searchTerm, '%'))")
    Page<CitizenReport> searchReports(@org.springframework.data.repository.query.Param("searchTerm") String searchTerm, org.springframework.data.domain.Pageable pageable);
    
    Page<CitizenReport> findByCreatedAtBetweenOrderByCreatedAtDesc(java.time.LocalDateTime start, java.time.LocalDateTime end, org.springframework.data.domain.Pageable pageable);
    
    List<CitizenReport> findByCreatedAtBetweenOrderByCreatedAtDesc(java.time.LocalDateTime start, java.time.LocalDateTime end);
    
    @Query("SELECT COUNT(c) FROM CitizenReport c WHERE c.createdAt >= :startDate")
    long countByCreatedAtAfter(@Param("startDate") LocalDateTime startDate);
    
    long countByStatus(ReportStatus status);
    
    List<CitizenReport> findByVendorVendorId(String vendorId);
}
