package com.smc.svms.service;

import com.smc.svms.dto.RentHistoryDTO;
import com.smc.svms.entity.RentPayment;
import com.smc.svms.entity.Vendor;
import com.smc.svms.repository.RentPaymentRepository;
import com.smc.svms.repository.VendorRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.format.TextStyle;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Optional;

@Service
@RequiredArgsConstructor
@Slf4j
public class RentService {

    private final VendorRepository vendorRepository;
    private final RentPaymentRepository rentPaymentRepository;

    /**
     * Generate rent history from vendor registration date to current date
     * Shows all months with paid/pending status
     */
    public List<RentHistoryDTO> getRentHistory(String vendorId) {
        Vendor vendor = vendorRepository.findByVendorId(vendorId)
                .orElseThrow(() -> new RuntimeException("Vendor not found: " + vendorId));

        LocalDate registrationDate = vendor.getCreatedAt().toLocalDate();
        LocalDate currentDate = LocalDate.now();
        BigDecimal monthlyRent = vendor.getMonthlyRent() != null ? vendor.getMonthlyRent() : new BigDecimal("500.00");

        List<RentHistoryDTO> history = new ArrayList<>();
        
        // Generate entries for each month from registration to current
        LocalDate dateIterator = registrationDate.withDayOfMonth(1);
        
        while (!dateIterator.isAfter(currentDate)) {
            int month = dateIterator.getMonthValue();
            int year = dateIterator.getYear();
            
            // Check if rent is paid for this month
            Optional<RentPayment> payment = rentPaymentRepository
                    .findByVendorIdAndPaymentMonthAndPaymentYear(vendor.getId(), month, year)
                    .stream()
                    .findFirst();
            
            boolean isPaid = payment.isPresent();
            
            // Determine status
            String status;
            LocalDate dueDate = dateIterator.plusMonths(1).withDayOfMonth(5); // Due by 5th of next month
            
            if (isPaid) {
                status = "PAID";
            } else if (currentDate.isAfter(dueDate)) {
                status = "OVERDUE";
            } else {
                status = "PENDING";
            }
            
            RentHistoryDTO entry = RentHistoryDTO.builder()
                    .month(month)
                    .monthName(dateIterator.getMonth().getDisplayName(TextStyle.FULL, Locale.ENGLISH))
                    .year(year)
                    .amount(monthlyRent)
                    .isPaid(isPaid)
                    .dueDate(dueDate)
                    .paidDate(isPaid ? payment.get().getPaidAt().toLocalDate() : null)
                    .paymentId(isPaid ? payment.get().getRazorpayPaymentId() : null)
                    .status(status)
                    .build();
            
            history.add(0, entry); // Add to beginning so newest is first
            
            // Move to next month
            dateIterator = dateIterator.plusMonths(1);
        }
        
        return history;
    }

    /**
     * Get rent summary for vendor dashboard
     */
    public RentSummaryDTO getRentSummary(String vendorId) {
        Vendor vendor = vendorRepository.findByVendorId(vendorId)
                .orElseThrow(() -> new RuntimeException("Vendor not found: " + vendorId));

        List<RentHistoryDTO> history = getRentHistory(vendorId);
        
        BigDecimal totalPending = history.stream()
                .filter(h -> !h.isPaid())
                .map(RentHistoryDTO::getAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        
        BigDecimal totalPaid = history.stream()
                .filter(RentHistoryDTO::isPaid)
                .map(RentHistoryDTO::getAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        
        long pendingMonths = history.stream().filter(h -> !h.isPaid()).count();
        long paidMonths = history.stream().filter(RentHistoryDTO::isPaid).count();
        
        // Current month status
        LocalDate now = LocalDate.now();
        boolean currentMonthPaid = rentPaymentRepository
                .existsByVendorIdAndPaymentMonthAndPaymentYear(vendor.getId(), now.getMonthValue(), now.getYear());
        
        return RentSummaryDTO.builder()
                .vendorId(vendorId)
                .monthlyRent(vendor.getMonthlyRent())
                .totalPending(totalPending)
                .totalPaid(totalPaid)
                .pendingMonths(pendingMonths)
                .paidMonths(paidMonths)
                .currentMonthPaid(currentMonthPaid)
                .registrationDate(vendor.getCreatedAt().toLocalDate())
                .build();
    }

    @lombok.Data
    @lombok.Builder
    public static class RentSummaryDTO {
        private String vendorId;
        private BigDecimal monthlyRent;
        private BigDecimal totalPending;
        private BigDecimal totalPaid;
        private long pendingMonths;
        private long paidMonths;
        private boolean currentMonthPaid;
        private LocalDate registrationDate;
    }
}
