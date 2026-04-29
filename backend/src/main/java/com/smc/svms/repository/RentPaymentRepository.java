package com.smc.svms.repository;

import com.smc.svms.entity.RentPayment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface RentPaymentRepository extends JpaRepository<RentPayment, Long> {
    List<RentPayment> findByVendorId(Long vendorId);
    List<RentPayment> findByVendorVendorId(String vendorId);
    List<RentPayment> findByPaymentMonthAndPaymentYear(Integer month, Integer year);
    boolean existsByVendorIdAndPaymentMonthAndPaymentYear(Long vendorId, Integer month, Integer year);
    List<RentPayment> findByVendorIdAndPaymentMonthAndPaymentYear(Long vendorId, Integer month, Integer year);
}
