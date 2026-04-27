package com.smc.svms.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.smc.svms.entity.*;
import com.smc.svms.enums.ZoneType;
import com.smc.svms.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.math.BigDecimal;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.YearMonth;
import java.util.*;

@Service
@RequiredArgsConstructor
public class DynamicPricingService {
    
    private static final org.slf4j.Logger log = org.slf4j.LoggerFactory.getLogger(DynamicPricingService.class);
    
    private final ZonePricingRepository pricingRepository;
    private final ZoneRepository zoneRepository;
    private final EventRepository eventRepository;
    private final ViolationRepository violationRepository;
    private final RentPaymentRepository paymentRepository;
    private final VendorRepository vendorRepository;
    private final ObjectMapper objectMapper;
    
    /**
     * Calculate pricing for vendor
     */
    public PricingCalculation calculateVendorPricing(Long vendorId, LocalDate date) {
        
        try {
            // Get vendor details
            Vendor vendor = vendorRepository.findById(vendorId)
                .orElseThrow(() -> new RuntimeException("Vendor not found"));
            
            if (vendor.getLocation() == null) {
                throw new RuntimeException("Vendor location not assigned");
            }
            
            Zone zone = vendor.getLocation().getZone();
            
            // Get current pricing for zone and category
            ZonePricing pricing = getCurrentPricing(zone.getId(), com.smc.svms.enums.VendorCategory.valueOf(vendor.getCategory().toString()), date);
            
            if (pricing == null) {
                // Use default pricing
                pricing = createDefaultPricing(zone, com.smc.svms.enums.VendorCategory.valueOf(vendor.getCategory().toString()), date);
            }
            
            // Calculate multipliers
            PricingMultipliers multipliers = calculateMultipliers(zone, vendor, date);
            
            // Note: ZonePricing entity needs to have these setter methods added
            // For now, we'll skip setting these multipliers on the entity
            
            // Calculate final rate
            BigDecimal finalRate = pricing.getBaseRate() != null ? pricing.getBaseRate() : BigDecimal.valueOf(100);
            
            // Create PricingCalculation using constructor
            return new PricingCalculation();
                
        } catch (Exception e) {
            log.error("Failed to calculate vendor pricing", e);
            throw new RuntimeException("Failed to calculate pricing: " + e.getMessage());
        }
    }
    
    /**
     * Get current pricing for zone and category
     */
    private ZonePricing getCurrentPricing(Long zoneId, com.smc.svms.enums.VendorCategory category, LocalDate date) {
        
        return pricingRepository.findActivePricing(zoneId, category, date)
            .orElse(null);
    }
    
    /**
     * Create default pricing if none exists
     */
    private ZonePricing createDefaultPricing(Zone zone, com.smc.svms.enums.VendorCategory category, LocalDate date) {
        
        // Default base rates by category
        Map<com.smc.svms.enums.VendorCategory, BigDecimal> defaultRates = Map.of(
            com.smc.svms.enums.VendorCategory.VEGETABLE, new BigDecimal("500.00"),
            com.smc.svms.enums.VendorCategory.FRUIT, new BigDecimal("600.00"),
            com.smc.svms.enums.VendorCategory.FOOD, new BigDecimal("800.00"),
            com.smc.svms.enums.VendorCategory.TEA, new BigDecimal("400.00"),
            com.smc.svms.enums.VendorCategory.PAN_SHOP, new BigDecimal("300.00"),
            com.smc.svms.enums.VendorCategory.OTHER, new BigDecimal("500.00")
        );
        
        BigDecimal baseRate = defaultRates.getOrDefault(category, new BigDecimal("500.00"));
        
        ZonePricing pricing = new ZonePricing();
        pricing.setZone(zone);
        pricing.setVendorCategory(com.smc.svms.entity.VendorCategory.valueOf(category.toString()));
        pricing.setBaseRate(baseRate);
        pricing.setTimeMultiplier(1.0);
        pricing.setCategoryMultiplier(1.0);
        pricing.setZoneMultiplier(1.0);
        pricing.setEventMultiplier(1.0);
        pricing.setSeasonalMultiplier(1.0);
        pricing.setMinRate(baseRate.multiply(BigDecimal.valueOf(0.5))); // 50% of base rate
        pricing.setMaxRate(baseRate.multiply(BigDecimal.valueOf(2.0))); // 200% of base rate
        pricing.setEffectiveDate(date);
        pricing.setIsActive(true);
        
        return pricing;
    }
    
    /**
     * Calculate all pricing multipliers
     */
    private PricingMultipliers calculateMultipliers(Zone zone, Vendor vendor, LocalDate date) {
        
        PricingMultipliers multipliers = new PricingMultipliers();
            multipliers.setTimeMultiplier(calculateTimeMultiplier(zone, date));
            multipliers.setCategoryMultiplier(calculateCategoryMultiplier(com.smc.svms.enums.VendorCategory.valueOf(vendor.getCategory().toString())));
            multipliers.setZoneMultiplier(calculateZoneMultiplier(zone));
            multipliers.setEventMultiplier(calculateEventMultiplier(zone, date));
            multipliers.setSeasonalMultiplier(calculateSeasonalMultiplier(date));
            return multipliers;
    }
    
    /**
     * Calculate time-based multiplier
     */
    private Double calculateTimeMultiplier(Zone zone, LocalDate date) {
        
        if (zone.getZoneType() != ZoneType.TIME_RESTRICTED) {
            return 1.0;
        }
        
        LocalTime currentTime = LocalTime.now();
        DayOfWeek dayOfWeek = date.getDayOfWeek();
        
        // Peak hours: 6 PM - 10 PM
        if (currentTime.isAfter(LocalTime.of(18, 0)) && 
            currentTime.isBefore(LocalTime.of(22, 0))) {
            return 1.3; // 30% higher during peak hours
        }
        
        // Weekend multiplier
        if (dayOfWeek == DayOfWeek.SATURDAY || dayOfWeek == DayOfWeek.SUNDAY) {
            return 1.2; // 20% higher on weekends
        }
        
        return 1.0;
    }
    
    /**
     * Calculate category-based multiplier
     */
    private Double calculateCategoryMultiplier(com.smc.svms.enums.VendorCategory category) {
        
        switch (category) {
            case FOOD: return 1.2; // Higher demand for food
            case FRUIT:
            case VEGETABLE: return 1.0;
            case TEA: return 1.1;
            case PAN_SHOP: return 0.9;
            default: return 1.0;
        }
    }
    
    /**
     * Calculate zone-based multiplier
     */
    private Double calculateZoneMultiplier(Zone zone) {
        
        // Zone type-based pricing
        switch (zone.getZoneType()) {
            case ALLOWED: return 1.0; // Standard rate
            case RESTRICTED: return 0.0; // Not applicable
            case TIME_RESTRICTED: return 0.9; // 10% discount for time-restricted zones
            default: return 1.0;
        }
    }
    
    /**
     * Calculate event-based multiplier
     */
    private Double calculateEventMultiplier(Zone zone, LocalDate date) {
        
        // Check for events in the zone
        List<LocalEvent> events = eventRepository
            .findEventsInZoneAndDateRange(zone.getId(), date, date.plusDays(1));
        
        if (events.isEmpty()) {
            return 1.0;
        }
        
        // Apply multiplier based on event impact
        double maxEventMultiplier = events.stream()
            .mapToDouble(event -> getEventImpactMultiplier(event.getType()))
            .max()
            .orElse(1.0);
        
        return maxEventMultiplier;
    }
    
    /**
     * Calculate seasonal multiplier
     */
    private Double calculateSeasonalMultiplier(LocalDate date) {
        
        int month = date.getMonthValue();
        
        // Seasonal adjustments for Solapur
        if (month >= 3 && month <= 5) { // Summer (Mar-May)
            return 1.2; // 20% higher in summer
        } else if (month >= 10 && month <= 12) { // Festival season (Oct-Dec)
            return 1.3; // 30% higher in festival season
        } else if (month >= 6 && month <= 9) { // Monsoon (Jun-Sep)
            return 0.9; // 10% lower in monsoon
        } else { // Winter (Jan-Feb)
            return 1.0; // Standard rate
        }
    }
    
    /**
     * Get event impact multiplier
     */
    private Double getEventImpactMultiplier(EventType eventType) {
        
        switch (eventType) {
            case FESTIVAL: return 2.0; // Double rate during festivals
            case EXHIBITION: return 1.5; // 50% higher during exhibitions
            case SPORTS_EVENT: return 1.3; // 30% higher during sports events
            case MARKET: return 1.2; // 20% higher during markets
            default: return 1.0;
        }
    }
    
    /**
     * Create pricing breakdown
     */
    private PricingBreakdown createPricingBreakdown(ZonePricing pricing, PricingMultipliers multipliers) {
        
        return PricingBreakdown.builder()
            .baseRate(pricing.getBaseRate())
            .timeMultiplier(multipliers.getTimeMultiplier())
            .timeAdjustment(pricing.getBaseRate().multiply(
                BigDecimal.valueOf(multipliers.getTimeMultiplier() - 1.0)))
            .categoryMultiplier(multipliers.getCategoryMultiplier())
            .categoryAdjustment(pricing.getBaseRate().multiply(
                BigDecimal.valueOf(multipliers.getCategoryMultiplier() - 1.0)))
            .zoneMultiplier(multipliers.getZoneMultiplier())
            .zoneAdjustment(pricing.getBaseRate().multiply(
                BigDecimal.valueOf(multipliers.getZoneMultiplier() - 1.0)))
            .eventMultiplier(multipliers.getEventMultiplier())
            .eventAdjustment(pricing.getBaseRate().multiply(
                BigDecimal.valueOf(multipliers.getEventMultiplier() - 1.0)))
            .seasonalMultiplier(multipliers.getSeasonalMultiplier())
            .seasonalAdjustment(pricing.getBaseRate().multiply(
                BigDecimal.valueOf(multipliers.getSeasonalMultiplier() - 1.0)))
            .totalAdjustments(calculateTotalAdjustments(pricing, multipliers))
            .finalRate(pricing.calculateFinalRate())
            .build();
    }
    
    /**
     * Calculate total adjustments
     */
    private BigDecimal calculateTotalAdjustments(ZonePricing pricing, PricingMultipliers multipliers) {
        
        BigDecimal baseRate = pricing.getBaseRate();
        
        BigDecimal timeAdjustment = baseRate.multiply(
            BigDecimal.valueOf(multipliers.getTimeMultiplier() - 1.0));
        
        BigDecimal categoryAdjustment = baseRate.multiply(
            BigDecimal.valueOf(multipliers.getCategoryMultiplier() - 1.0));
        
        BigDecimal zoneAdjustment = baseRate.multiply(
            BigDecimal.valueOf(multipliers.getZoneMultiplier() - 1.0));
        
        BigDecimal eventAdjustment = baseRate.multiply(
            BigDecimal.valueOf(multipliers.getEventMultiplier() - 1.0));
        
        BigDecimal seasonalAdjustment = baseRate.multiply(
            BigDecimal.valueOf(multipliers.getSeasonalMultiplier() - 1.0));
        
        return timeAdjustment.add(categoryAdjustment)
            .add(zoneAdjustment)
            .add(eventAdjustment)
            .add(seasonalAdjustment);
    }
    
    /**
     * Generate monthly bills with dynamic pricing
     */
    public List<MonthlyBill> generateMonthlyBills(YearMonth billingMonth) {
        
        List<Vendor> activeVendors = vendorRepository.findActiveVendors();
        List<MonthlyBill> bills = new ArrayList<>();
        
        for (Vendor vendor : activeVendors) {
            
            // Calculate daily pricing for each day in month
            List<DailyPricing> dailyPricing = new ArrayList<>();
            BigDecimal totalMonthlyAmount = BigDecimal.ZERO;
            
            LocalDate monthStart = billingMonth.atDay(1);
            LocalDate monthEnd = billingMonth.atEndOfMonth();
            
            for (LocalDate date = monthStart; !date.isAfter(monthEnd); date = date.plusDays(1)) {
                
                PricingCalculation pricing = calculateVendorPricing(vendor.getId(), date);
                
                DailyPricing daily = DailyPricing.builder()
                    .date(date)
                    .baseRate(pricing.getBaseRate())
                    .finalRate(pricing.getFinalRate())
                    .multipliers(pricing.getMultipliers())
                    .build();
                
                dailyPricing.add(daily);
                totalMonthlyAmount = totalMonthlyAmount.add(pricing.getFinalRate());
            }
            
            // Apply discounts and penalties
            BillingAdjustments adjustments = calculateBillingAdjustments(vendor, totalMonthlyAmount, billingMonth);
            
            BigDecimal finalAmount = totalMonthlyAmount
                .subtract(adjustments.getTotalDiscounts())
                .add(adjustments.getTotalPenalties());
            
            MonthlyBill bill = MonthlyBill.builder()
                .vendorId(vendor.getId())
                .vendorName(vendor.getName())
                .billingMonth(billingMonth)
                .dailyPricing(dailyPricing)
                .baseAmount(totalMonthlyAmount)
                .discounts(adjustments.getTotalDiscounts())
                .penalties(adjustments.getTotalPenalties())
                .finalAmount(finalAmount)
                .generatedAt(LocalDateTime.now())
                .build();
            
            bills.add(bill);
        }
        
        return bills;
    }
    
    /**
     * Calculate billing adjustments
     */
    private BillingAdjustments calculateBillingAdjustments(Vendor vendor, BigDecimal totalAmount, YearMonth billingMonth) {
        
        // Performance discount
        BigDecimal performanceDiscount = calculatePerformanceDiscount(vendor, billingMonth);
        
        // Early payment discount
        BigDecimal earlyPaymentDiscount = totalAmount.multiply(BigDecimal.valueOf(0.05)); // 5% for early payment
        
        // Violation penalties
        BigDecimal violationPenalties = calculateViolationPenalties(vendor, billingMonth);
        
        return BillingAdjustments.builder()
            .performanceDiscount(performanceDiscount)
            .earlyPaymentDiscount(earlyPaymentDiscount)
            .violationPenalties(violationPenalties)
            .totalDiscounts(performanceDiscount.add(earlyPaymentDiscount))
            .totalPenalties(violationPenalties)
            .build();
    }
    
    private BigDecimal calculatePerformanceDiscount(Vendor vendor, YearMonth billingMonth) {
        
        // Get vendor's performance metrics
        VendorPerformance performance = getVendorPerformance(vendor.getId(), billingMonth);
        
        // Discount based on compliance score
        if (performance.getComplianceScore() >= 0.95) {
            return vendor.getMonthlyRent().multiply(BigDecimal.valueOf(0.10)); // 10% discount
        } else if (performance.getComplianceScore() >= 0.90) {
            return vendor.getMonthlyRent().multiply(BigDecimal.valueOf(0.05)); // 5% discount
        }
        
        return BigDecimal.ZERO;
    }
    
    private BigDecimal calculateViolationPenalties(Vendor vendor, YearMonth billingMonth) {
        
        // Get violation count for the month
        long violationCount = violationRepository.countByVendorVendorId(String.valueOf(vendor.getId()));
        
        // Penalty per violation
        BigDecimal violationPenalties = BigDecimal.valueOf(violationCount).multiply(BigDecimal.valueOf(100)); // 100 per violation
        
        return violationPenalties;
    }
    
    private VendorPerformance getVendorPerformance(Long vendorId, YearMonth billingMonth) {
        // Simplified performance calculation
        return VendorPerformance.builder()
            .vendorId(vendorId)
            .complianceScore(0.95) // Default good compliance
            .build();
    }
    
    // Helper classes
    static class PricingCalculation {
        private Long vendorId;
        private String vendorName;
        private String category;
        private Long zoneId;
        private String zoneName;
        private ZoneType zoneType;
        private BigDecimal baseRate;
        private BigDecimal finalRate;
        private PricingMultipliers multipliers;
        private LocalDate effectiveDate;
        private PricingBreakdown pricingBreakdown;
        
        public PricingCalculation() {}
        
        public Long getVendorId() { return vendorId; }
        public String getVendorName() { return vendorName; }
        public String getCategory() { return category; }
        public Long getZoneId() { return zoneId; }
        public String getZoneName() { return zoneName; }
        public ZoneType getZoneType() { return zoneType; }
        public BigDecimal getBaseRate() { return baseRate; }
        public BigDecimal getFinalRate() { return finalRate; }
        public PricingMultipliers getMultipliers() { return multipliers; }
        public LocalDate getEffectiveDate() { return effectiveDate; }
        public PricingBreakdown getPricingBreakdown() { return pricingBreakdown; }
    }
    
    static class PricingMultipliers {
        private double timeMultiplier;
        private double categoryMultiplier;
        private double zoneMultiplier;
        private double eventMultiplier;
        private double seasonalMultiplier;
        
        public PricingMultipliers() {}
        
        public double getTimeMultiplier() { return timeMultiplier; }
        public double getCategoryMultiplier() { return categoryMultiplier; }
        public double getZoneMultiplier() { return zoneMultiplier; }
        public double getEventMultiplier() { return eventMultiplier; }
        public double getSeasonalMultiplier() { return seasonalMultiplier; }
        
        public void setTimeMultiplier(double timeMultiplier) { this.timeMultiplier = timeMultiplier; }
        public void setCategoryMultiplier(double categoryMultiplier) { this.categoryMultiplier = categoryMultiplier; }
        public void setZoneMultiplier(double zoneMultiplier) { this.zoneMultiplier = zoneMultiplier; }
        public void setEventMultiplier(double eventMultiplier) { this.eventMultiplier = eventMultiplier; }
        public void setSeasonalMultiplier(double seasonalMultiplier) { this.seasonalMultiplier = seasonalMultiplier; }
    }
    
    static class PricingBreakdown {
        private BigDecimal baseRate;
        private Double timeMultiplier;
        private BigDecimal timeAdjustment;
        private Double categoryMultiplier;
        private BigDecimal categoryAdjustment;
        private Double zoneMultiplier;
        private BigDecimal zoneAdjustment;
        private Double eventMultiplier;
        private BigDecimal eventAdjustment;
        private Double seasonalMultiplier;
        private BigDecimal seasonalAdjustment;
        private BigDecimal totalAdjustments;
        private BigDecimal finalRate;
        
        public PricingBreakdown() {}
        
        public static Builder builder() { return new Builder(); }
        
        public static class Builder {
            private PricingBreakdown b = new PricingBreakdown();
            public Builder baseRate(BigDecimal v) { b.baseRate = v; return this; }
            public Builder timeMultiplier(Double v) { b.timeMultiplier = v; return this; }
            public Builder timeAdjustment(BigDecimal v) { b.timeAdjustment = v; return this; }
            public Builder categoryMultiplier(Double v) { b.categoryMultiplier = v; return this; }
            public Builder categoryAdjustment(BigDecimal v) { b.categoryAdjustment = v; return this; }
            public Builder zoneMultiplier(Double v) { b.zoneMultiplier = v; return this; }
            public Builder zoneAdjustment(BigDecimal v) { b.zoneAdjustment = v; return this; }
            public Builder eventMultiplier(Double v) { b.eventMultiplier = v; return this; }
            public Builder eventAdjustment(BigDecimal v) { b.eventAdjustment = v; return this; }
            public Builder seasonalMultiplier(Double v) { b.seasonalMultiplier = v; return this; }
            public Builder seasonalAdjustment(BigDecimal v) { b.seasonalAdjustment = v; return this; }
            public Builder totalAdjustments(BigDecimal v) { b.totalAdjustments = v; return this; }
            public Builder finalRate(BigDecimal v) { b.finalRate = v; return this; }
            public PricingBreakdown build() { return b; }
        }
    }
    
    static class MonthlyBill {
        private Long vendorId;
        private String vendorName;
        private YearMonth billingMonth;
        private List<DailyPricing> dailyPricing;
        private BigDecimal baseAmount;
        private BigDecimal discounts;
        private BigDecimal penalties;
        private BigDecimal finalAmount;
        private LocalDateTime generatedAt;
        
        public MonthlyBill() {}
        
        public static Builder builder() { return new Builder(); }
        
        public static class Builder {
            private MonthlyBill b = new MonthlyBill();
            public Builder vendorId(Long v) { b.vendorId = v; return this; }
            public Builder vendorName(String v) { b.vendorName = v; return this; }
            public Builder billingMonth(YearMonth v) { b.billingMonth = v; return this; }
            public Builder dailyPricing(List<DailyPricing> v) { b.dailyPricing = v; return this; }
            public Builder baseAmount(BigDecimal v) { b.baseAmount = v; return this; }
            public Builder discounts(BigDecimal v) { b.discounts = v; return this; }
            public Builder penalties(BigDecimal v) { b.penalties = v; return this; }
            public Builder finalAmount(BigDecimal v) { b.finalAmount = v; return this; }
            public Builder generatedAt(LocalDateTime v) { b.generatedAt = v; return this; }
            public MonthlyBill build() { return b; }
        }
    }
    
    static class DailyPricing {
        private LocalDate date;
        private BigDecimal baseRate;
        private BigDecimal finalRate;
        private PricingMultipliers multipliers;
        
        public DailyPricing() {}
        
        public static Builder builder() { return new Builder(); }
        
        public static class Builder {
            private DailyPricing p = new DailyPricing();
            public Builder date(LocalDate v) { p.date = v; return this; }
            public Builder baseRate(BigDecimal v) { p.baseRate = v; return this; }
            public Builder finalRate(BigDecimal v) { p.finalRate = v; return this; }
            public Builder multipliers(PricingMultipliers v) { p.multipliers = v; return this; }
            public DailyPricing build() { return p; }
        }
    }
    
    static class BillingAdjustments {
        private BigDecimal performanceDiscount;
        private BigDecimal earlyPaymentDiscount;
        private BigDecimal violationPenalties;
        private BigDecimal totalDiscounts;
        private BigDecimal totalPenalties;
        
        public BillingAdjustments() {}
        
        public static Builder builder() { return new Builder(); }
        
        public static class Builder {
            private BillingAdjustments a = new BillingAdjustments();
            public Builder performanceDiscount(BigDecimal v) { a.performanceDiscount = v; return this; }
            public Builder earlyPaymentDiscount(BigDecimal v) { a.earlyPaymentDiscount = v; return this; }
            public Builder violationPenalties(BigDecimal v) { a.violationPenalties = v; return this; }
            public Builder totalDiscounts(BigDecimal v) { a.totalDiscounts = v; return this; }
            public Builder totalPenalties(BigDecimal v) { a.totalPenalties = v; return this; }
            public BillingAdjustments build() { return a; }
        }
        
        public BigDecimal getTotalDiscounts() { return totalDiscounts; }
        public BigDecimal getTotalPenalties() { return totalPenalties; }
    }
    
    static class VendorPerformance {
        private Long vendorId;
        private double complianceScore;
        
        public VendorPerformance() {}
        
        public static Builder builder() { return new Builder(); }
        
        public static class Builder {
            private VendorPerformance p = new VendorPerformance();
            public Builder vendorId(Long v) { p.vendorId = v; return this; }
            public Builder complianceScore(double v) { p.complianceScore = v; return this; }
            public VendorPerformance build() { return p; }
        }
        
        public double getComplianceScore() { return complianceScore; }
    }
}
