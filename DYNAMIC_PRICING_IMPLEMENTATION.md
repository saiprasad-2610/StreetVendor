# 💰 Dynamic Pricing Implementation

## 📋 Simple, Rule-Based Dynamic Pricing for SMC

### 1. Zone Pricing Entity

```java
@Entity
@Table(name = "zone_pricing")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ZonePricing {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "zone_id", nullable = false)
    private Zone zone;
    
    @Enumerated(EnumType.STRING)
    @Column(name = "vendor_category", nullable = false, length = 30)
    private VendorCategory vendorCategory;
    
    @Column(name = "base_rate", precision = 10, scale = 2, nullable = false)
    private BigDecimal baseRate;
    
    @Column(name = "time_multiplier", precision = 3, scale = 2)
    private Double timeMultiplier = 1.0;
    
    @Column(name = "category_multiplier", precision = 3, scale = 2)
    private Double categoryMultiplier = 1.0;
    
    @Column(name = "zone_multiplier", precision = 3, scale = 2)
    private Double zoneMultiplier = 1.0;
    
    @Column(name = "event_multiplier", precision = 3, scale = 2)
    private Double eventMultiplier = 1.0;
    
    @Column(name = "seasonal_multiplier", precision = 3, scale = 2)
    private Double seasonalMultiplier = 1.0;
    
    @Column(name = "min_rate", precision = 10, scale = 2)
    private BigDecimal minRate;
    
    @Column(name = "max_rate", precision = 10, scale = 2)
    private BigDecimal maxRate;
    
    @Column(name = "effective_date", nullable = false)
    private LocalDate effectiveDate;
    
    @Column(name = "expiry_date")
    private LocalDate expiryDate;
    
    @Column(name = "is_active", nullable = false)
    private Boolean isActive = true;
    
    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;
    
    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
    
    // Helper method to calculate final rate
    public BigDecimal calculateFinalRate() {
        
        BigDecimal finalRate = baseRate
            .multiply(BigDecimal.valueOf(timeMultiplier))
            .multiply(BigDecimal.valueOf(categoryMultiplier))
            .multiply(BigDecimal.valueOf(zoneMultiplier))
            .multiply(BigDecimal.valueOf(eventMultiplier))
            .multiply(BigDecimal.valueOf(seasonalMultiplier));
        
        // Apply min/max constraints
        if (minRate != null && finalRate.compareTo(minRate) < 0) {
            finalRate = minRate;
        }
        
        if (maxRate != null && finalRate.compareTo(maxRate) > 0) {
            finalRate = maxRate;
        }
        
        return finalRate.setScale(2, RoundingMode.HALF_UP);
    }
}
```

### 2. Dynamic Pricing Service

```java
@Service
public class DynamicPricingService {
    
    @Autowired
    private ZonePricingRepository pricingRepository;
    
    @Autowired
    private ZoneRepository zoneRepository;
    
    @Autowired
    private EventRepository eventRepository;
    
    @Autowired
    private PaymentRepository paymentRepository;
    
    /**
     * Calculate pricing for vendor
     */
    public PricingCalculation calculateVendorPricing(Long vendorId, LocalDate date) {
        
        // Get vendor details
        Vendor vendor = vendorRepository.findById(vendorId)
            .orElseThrow(() -> new ResourceNotFoundException("Vendor not found"));
        
        if (vendor.getLocation() == null) {
            throw new ResourceNotFoundException("Vendor location not assigned");
        }
        
        Zone zone = vendor.getLocation().getZone();
        
        // Get current pricing for zone and category
        ZonePricing pricing = getCurrentPricing(zone.getId(), vendor.getCategory(), date);
        
        if (pricing == null) {
            // Use default pricing
            pricing = createDefaultPricing(zone, vendor.getCategory(), date);
        }
        
        // Calculate multipliers
        PricingMultipliers multipliers = calculateMultipliers(zone, vendor, date);
        
        // Update pricing with calculated multipliers
        pricing.setTimeMultiplier(multipliers.getTimeMultiplier());
        pricing.setCategoryMultiplier(multipliers.getCategoryMultiplier());
        pricing.setZoneMultiplier(multipliers.getZoneMultiplier());
        pricing.setEventMultiplier(multipliers.getEventMultiplier());
        pricing.setSeasonalMultiplier(multipliers.getSeasonalMultiplier());
        
        // Calculate final rate
        BigDecimal finalRate = pricing.calculateFinalRate();
        
        return PricingCalculation.builder()
            .vendorId(vendorId)
            .vendorName(vendor.getName())
            .category(vendor.getCategory())
            .zoneId(zone.getId())
            .zoneName(zone.getName())
            .zoneType(zone.getZoneType())
            .baseRate(pricing.getBaseRate())
            .finalRate(finalRate)
            .multipliers(multipliers)
            .effectiveDate(date)
            .pricingBreakdown(createPricingBreakdown(pricing, multipliers))
            .build();
    }
    
    /**
     * Get current pricing for zone and category
     */
    private ZonePricing getCurrentPricing(Long zoneId, VendorCategory category, LocalDate date) {
        
        return pricingRepository.findActivePricing(zoneId, category, date)
            .orElse(null);
    }
    
    /**
     * Create default pricing if none exists
     */
    private ZonePricing createDefaultPricing(Zone zone, VendorCategory category, LocalDate date) {
        
        // Default base rates by category
        Map<VendorCategory, BigDecimal> defaultRates = Map.of(
            VendorCategory.VEGETABLE, new BigDecimal("500.00"),
            VendorCategory.FRUIT, new BigDecimal("600.00"),
            VendorCategory.FOOD, new BigDecimal("800.00"),
            VendorCategory.TEA, new BigDecimal("400.00"),
            VendorCategory.PAN_SHOP, new BigDecimal("300.00"),
            VendorCategory.OTHER, new BigDecimal("500.00")
        );
        
        BigDecimal baseRate = defaultRates.getOrDefault(category, new BigDecimal("500.00"));
        
        return ZonePricing.builder()
            .zone(zone)
            .vendorCategory(category)
            .baseRate(baseRate)
            .timeMultiplier(1.0)
            .categoryMultiplier(1.0)
            .zoneMultiplier(1.0)
            .eventMultiplier(1.0)
            .seasonalMultiplier(1.0)
            .minRate(baseRate.multiply(BigDecimal.valueOf(0.5))) // 50% of base rate
            .maxRate(baseRate.multiply(BigDecimal.valueOf(2.0))) // 200% of base rate
            .effectiveDate(date)
            .isActive(true)
            .build();
    }
    
    /**
     * Calculate all pricing multipliers
     */
    private PricingMultipliers calculateMultipliers(Zone zone, Vendor vendor, LocalDate date) {
        
        return PricingMultipliers.builder()
            .timeMultiplier(calculateTimeMultiplier(zone, date))
            .categoryMultiplier(calculateCategoryMultiplier(vendor.getCategory()))
            .zoneMultiplier(calculateZoneMultiplier(zone))
            .eventMultiplier(calculateEventMultiplier(zone, date))
            .seasonalMultiplier(calculateSeasonalMultiplier(date))
            .build();
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
    private Double calculateCategoryMultiplier(VendorCategory category) {
        
        // Category-based pricing adjustments
        return switch (category) {
            case FOOD -> 1.5; // Food vendors pay 50% more
            case VEGETABLE -> 1.0; // Vegetables - standard rate
            case FRUIT -> 1.2; // Fruits - 20% more
            case TEA -> 0.8; // Tea shops - 20% less
            case PAN_SHOP -> 0.7; // Pan shops - 30% less
            case OTHER -> 1.0; // Other - standard rate
            default -> 1.0;
        };
    }
    
    /**
     * Calculate zone-based multiplier
     */
    private Double calculateZoneMultiplier(Zone zone) {
        
        // Zone type-based pricing
        return switch (zone.getZoneType()) {
            case ALLOWED -> 1.0; // Standard rate
            case RESTRICTED -> 0.0; // Not applicable
            case TIME_RESTRICTED -> 0.9; // 10% discount for time-restricted zones
            case EVENT_ONLY -> 1.5; // 50% premium for event zones
            default -> 1.0;
        };
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
            .mapToDouble(event -> getEventImpactMultiplier(event.getEventType()))
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
        
        return switch (eventType) {
            case FESTIVAL -> 2.0; // Double rate during festivals
            case EXHIBITION -> 1.5; // 50% higher during exhibitions
            case SPORTS_EVENT -> 1.3; // 30% higher during sports events
            case MARKET -> 1.2; // 20% higher during markets
            default -> 1.0;
        };
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
        long violationCount = violationRepository
            .countByVendorIdAndCreatedAtBetween(
                vendor.getId(),
                billingMonth.atDay(1).atStartOfDay(),
                billingMonth.atEndOfMonth().atTime(23, 59, 59)
            );
        
        // Penalty per violation
        BigDecimal penaltyPerViolation = vendor.getMonthlyRent().multiply(BigDecimal.valueOf(0.05)); // 5% per violation
        
        return vendor.getMonthlyRent().multiply(BigDecimal.valueOf(violationCount * 0.05));
    }
}
```

### 3. Pricing Controller

```java
@RestController
@RequestMapping("/api/pricing")
@PreAuthorize("hasRole('ADMIN') or hasRole('VENDOR')")
public class PricingController {
    
    @Autowired
    private DynamicPricingService pricingService;
    
    @Autowired
    private ZonePricingRepository pricingRepository;
    
    /**
     * Get pricing for vendor
     */
    @GetMapping("/vendor/{vendorId}")
    @PreAuthorize("hasRole('ADMIN') or (hasRole('VENDOR') and @vendorId == authentication.principal.id)")
    public ResponseEntity<ApiResponse<PricingCalculation>> getVendorPricing(
            @PathVariable Long vendorId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        
        if (date == null) {
            date = LocalDate.now();
        }
        
        PricingCalculation pricing = pricingService.calculateVendorPricing(vendorId, date);
        
        return ResponseEntity.ok(ApiResponse.success(pricing));
    }
    
    /**
     * Create or update zone pricing
     */
    @PostMapping("/zone")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<ZonePricing>> createZonePricing(
            @Valid @RequestBody ZonePricingRequest request) {
        
        ZonePricing pricing = ZonePricing.builder()
            .zone(zoneRepository.findById(request.getZoneId())
                .orElseThrow(() -> new ResourceNotFoundException("Zone not found")))
            .vendorCategory(request.getVendorCategory())
            .baseRate(request.getBaseRate())
            .timeMultiplier(request.getTimeMultiplier())
            .categoryMultiplier(request.getCategoryMultiplier())
            .zoneMultiplier(request.getZoneMultiplier())
            .eventMultiplier(request.getEventMultiplier())
            .seasonalMultiplier(request.getSeasonalMultiplier())
            .minRate(request.getMinRate())
            .maxRate(request.getMaxRate())
            .effectiveDate(request.getEffectiveDate())
            .expiryDate(request.getExpiryDate())
            .isActive(true)
            .build();
        
        pricing = pricingRepository.save(pricing);
        
        return ResponseEntity.status(HttpStatus.CREATED)
            .body(ApiResponse.success(pricing));
    }
    
    /**
     * Generate monthly bills
     */
    @PostMapping("/bills/generate")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<String>> generateMonthlyBills(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate month) {
        
        YearMonth billingMonth = YearMonth.from(month);
        List<MonthlyBill> bills = pricingService.generateMonthlyBills(billingMonth);
        
        // Save bills to database
        monthlyBillRepository.saveAll(bills);
        
        return ResponseEntity.ok(ApiResponse.success(
            String.format("Generated %d monthly bills for %s", bills.size(), billingMonth)));
    }
    
    /**
     * Get pricing analytics
     */
    @GetMapping("/analytics")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<PricingAnalytics>> getPricingAnalytics(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate) {
        
        PricingAnalytics analytics = pricingService.getPricingAnalytics(startDate, endDate);
        
        return ResponseEntity.ok(ApiResponse.success(analytics));
    }
}
```

### 4. Database Migration

```sql
-- Create zone pricing table
CREATE TABLE zone_pricing (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    zone_id BIGINT NOT NULL,
    vendor_category ENUM('VEGETABLE', 'FRUIT', 'FOOD', 'TEA', 'PAN_SHOP', 'OTHER') NOT NULL,
    base_rate DECIMAL(10,2) NOT NULL,
    time_multiplier DECIMAL(3,2) DEFAULT 1.00,
    category_multiplier DECIMAL(3,2) DEFAULT 1.00,
    zone_multiplier DECIMAL(3,2) DEFAULT 1.00,
    event_multiplier DECIMAL(3,2) DEFAULT 1.00,
    seasonal_multiplier DECIMAL(3,2) DEFAULT 1.00,
    min_rate DECIMAL(10,2),
    max_rate DECIMAL(10,2),
    effective_date DATE NOT NULL,
    expiry_date DATE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (zone_id) REFERENCES zones(id) ON DELETE CASCADE,
    INDEX idx_zone_pricing_zone_category_date (zone_id, vendor_category, effective_date),
    INDEX idx_zone_pricing_active (is_active, effective_date)
);

-- Create local events table for event-based pricing
CREATE TABLE local_events (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    zone_id BIGINT NOT NULL,
    event_name VARCHAR(200) NOT NULL,
    event_type ENUM('FESTIVAL', 'EXHIBITION', 'SPORTS_EVENT', 'MARKET', 'OTHER') NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    impact_multiplier DECIMAL(3,2) DEFAULT 1.00,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (zone_id) REFERENCES zones(id) ON DELETE CASCADE,
    INDEX idx_local_events_zone_date (zone_id, start_date, end_date)
);

-- Create monthly bills table
CREATE TABLE monthly_bills (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    vendor_id BIGINT NOT NULL,
    billing_month YEAR(4) MONTH(2) NOT NULL,
    base_amount DECIMAL(10,2) NOT NULL,
    discounts DECIMAL(10,2) DEFAULT 0.00,
    penalties DECIMAL(10,2) DEFAULT 0.00,
    final_amount DECIMAL(10,2) NOT NULL,
    billing_data JSON,
    status ENUM('PENDING', 'GENERATED', 'PAID', 'OVERDUE') DEFAULT 'PENDING',
    generated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (vendor_id) REFERENCES vendors(id) ON DELETE CASCADE,
    INDEX idx_monthly_bills_vendor_month (vendor_id, billing_month),
    INDEX idx_monthly_bills_status (status)
);

-- Insert default pricing data
INSERT INTO zone_pricing (zone_id, vendor_category, base_rate, effective_date)
SELECT 
    z.id,
    v.category,
    CASE v.category
        WHEN 'VEGETABLE' THEN 500.00
        WHEN 'FRUIT' THEN 600.00
        WHEN 'FOOD' THEN 800.00
        WHEN 'TEA' THEN 400.00
        WHEN 'PAN_SHOP' THEN 300.00
        ELSE 500.00
    END,
    CURDATE()
FROM zones z
CROSS JOIN (SELECT DISTINCT category FROM vendors) v
WHERE z.is_active = TRUE;
```

This dynamic pricing implementation provides **flexible, rule-based pricing** that can be easily managed and adjusted by SMC administrators without complex AI/ML systems.
