# 💰 Smart Revenue System Architecture

## 📈 Dynamic Pricing & Intelligent Revenue Management

### 1. Dynamic Pricing Engine

```java
@Service
public class DynamicPricingService {
    
    @Autowired
    private ZonePricingRepository pricingRepository;
    
    @Autowired
    private DemandPatternRepository demandRepository;
    
    @Autowired
    private ExternalDataService externalDataService;
    
    @Autowired
    private AIModelService aiModelService;
    
    /**
     * Calculate dynamic pricing for vendor in specific zone
     */
    public PricingCalculation calculateDynamicPricing(Long vendorId, Long zoneId, 
            VendorCategory category, LocalDate date) {
        
        // Get base pricing
        ZonePricing basePricing = getBasePricing(zoneId, category);
        if (basePricing == null) {
            basePricing = createDefaultPricing(zoneId, category);
        }
        
        // Calculate multipliers
        DemandMultiplier demandMultiplier = calculateDemandMultiplier(zoneId, category, date);
        TimeMultiplier timeMultiplier = calculateTimeMultiplier(zoneId, date);
        EventMultiplier eventMultiplier = calculateEventMultiplier(zoneId, date);
        WeatherMultiplier weatherMultiplier = calculateWeatherMultiplier(date);
        CompetitionMultiplier competitionMultiplier = calculateCompetitionMultiplier(zoneId, category);
        
        // Apply AI-based pricing optimization
        AIPricingOptimization aiOptimization = aiModelService.optimizePricing(
            PricingOptimizationRequest.builder()
                .vendorId(vendorId)
                .zoneId(zoneId)
                .category(category)
                .date(date)
                .basePrice(basePricing.getBasePrice())
                .demandMultiplier(demandMultiplier.getMultiplier())
                .timeMultiplier(timeMultiplier.getMultiplier())
                .eventMultiplier(eventMultiplier.getMultiplier())
                .weatherMultiplier(weatherMultiplier.getMultiplier())
                .competitionMultiplier(competitionMultiplier.getMultiplier())
                .build()
        );
        
        // Calculate final price
        BigDecimal finalPrice = calculateFinalPrice(
            basePricing.getBasePrice(),
            demandMultiplier,
            timeMultiplier,
            eventMultiplier,
            weatherMultiplier,
            competitionMultiplier,
            aiOptimization
        );
        
        return PricingCalculation.builder()
            .vendorId(vendorId)
            .zoneId(zoneId)
            .category(category)
            .date(date)
            .basePrice(basePricing.getBasePrice())
            .finalPrice(finalPrice)
            .demandMultiplier(demandMultiplier)
            .timeMultiplier(timeMultiplier)
            .eventMultiplier(eventMultiplier)
            .weatherMultiplier(weatherMultiplier)
            .competitionMultiplier(competitionMultiplier)
            .aiOptimization(aiOptimization)
            .pricingBreakdown(createPricingBreakdown(
                basePricing, demandMultiplier, timeMultiplier, 
                eventMultiplier, weatherMultiplier, competitionMultiplier
            ))
            .effectiveFrom(date.atStartOfDay())
            .effectiveTo(date.atTime(23, 59, 59))
            .build();
    }
    
    private DemandMultiplier calculateDemandMultiplier(Long zoneId, VendorCategory category, LocalDate date) {
        
        // Get historical demand data
        List<DemandPattern> historicalDemand = demandRepository
            .findByZoneAndCategoryAndDateRange(
                zoneId, category, 
                date.minusDays(90), date.minusDays(1)
            );
        
        // Calculate demand trend
        double demandTrend = calculateDemandTrend(historicalDemand);
        
        // Get current demand indicators
        double currentDemandScore = getCurrentDemandScore(zoneId, category);
        
        // Calculate multiplier (0.5x to 3.0x)
        double multiplier = 1.0 + (demandTrend * 0.5) + (currentDemandScore * 0.3);
        multiplier = Math.max(0.5, Math.min(3.0, multiplier));
        
        return DemandMultiplier.builder()
            .multiplier(BigDecimal.valueOf(multiplier))
            .demandTrend(demandTrend)
            .currentDemandScore(currentDemandScore)
            .historicalAverage(calculateHistoricalAverage(historicalDemand))
            .confidence(calculateDemandConfidence(historicalDemand))
            .build();
    }
    
    private TimeMultiplier calculateTimeMultiplier(Long zoneId, LocalDate date) {
        
        LocalTime currentTime = LocalTime.now();
        DayOfWeek dayOfWeek = date.getDayOfWeek();
        
        // Peak hour pricing
        double peakMultiplier = getPeakHourMultiplier(currentTime, dayOfWeek);
        
        // Weekend pricing
        double weekendMultiplier = isWeekend(dayOfWeek) ? 1.2 : 1.0;
        
        // Seasonal pricing
        double seasonalMultiplier = getSeasonalMultiplier(date);
        
        double finalMultiplier = peakMultiplier * weekendMultiplier * seasonalMultiplier;
        finalMultiplier = Math.max(0.8, Math.min(2.0, finalMultiplier));
        
        return TimeMultiplier.builder()
            .multiplier(BigDecimal.valueOf(finalMultiplier))
            .isPeakHours(isPeakHours(currentTime))
            .isWeekend(isWeekend(dayOfWeek))
            .season(seasonMultiplier > 1.2 ? "HIGH" : seasonalMultiplier < 0.8 ? "LOW" : "NORMAL")
            .build();
    }
    
    private EventMultiplier calculateEventMultiplier(Long zoneId, LocalDate date) {
        
        // Get local events
        List<LocalEvent> events = externalDataService
            .getLocalEvents(zoneId, date, date.plusDays(1));
        
        if (events.isEmpty()) {
            return EventMultiplier.builder()
                .multiplier(BigDecimal.ONE)
                .hasEvents(false)
                .build();
        }
        
        // Calculate event impact
        double eventImpact = events.stream()
            .mapToDouble(event -> calculateEventImpact(event, zoneId))
            .sum();
        
        double multiplier = 1.0 + (eventImpact * 0.5);
        multiplier = Math.max(1.0, Math.min(2.5, multiplier));
        
        return EventMultiplier.builder()
            .multiplier(BigDecimal.valueOf(multiplier))
            .hasEvents(true)
            .events(events)
            .totalImpact(eventImpact)
            .build();
    }
    
    private CompetitionMultiplier calculateCompetitionMultiplier(Long zoneId, VendorCategory category) {
        
        // Get vendor count in zone
        int vendorCount = vendorRepository
            .countActiveVendorsByZoneAndCategory(zoneId, category);
        
        // Get zone capacity
        Zone zone = zoneRepository.findById(zoneId).orElse(null);
        if (zone == null) {
            return CompetitionMultiplier.builder()
                .multiplier(BigDecimal.ONE)
                .vendorCount(0)
                .build();
        }
        
        double occupancyRate = (double) vendorCount / zone.getMaxVendors();
        
        // High competition = lower prices, Low competition = higher prices
        double multiplier = 1.0 - (occupancyRate * 0.3);
        multiplier = Math.max(0.7, Math.min(1.3, multiplier));
        
        return CompetitionMultiplier.builder()
            .multiplier(BigDecimal.valueOf(multiplier))
            .vendorCount(vendorCount)
            .maxVendors(zone.getMaxVendors())
            .occupancyRate(occupancyRate)
            .competitionLevel(occupancyRate > 0.8 ? "HIGH" : occupancyRate > 0.5 ? "MEDIUM" : "LOW")
            .build();
    }
}
```

### 2. Automated Billing System

```java
@Service
public class AutomatedBillingService {
    
    @Autowired
    private PaymentRepository paymentRepository;
    
    @Autowired
    private VendorRepository vendorRepository;
    
    @Autowired
    private DynamicPricingService pricingService;
    
    @Autowired
    private NotificationService notificationService;
    
    @Autowired
    private PaymentGatewayService paymentGateway;
    
    /**
     * Generate monthly bills for all vendors
     */
    @Scheduled(cron = "0 0 2 1 * ?") // First day of every month at 2 AM
    public void generateMonthlyBills() {
        
        LocalDate billingDate = LocalDate.now().minusMonths(1);
        YearMonth billingPeriod = YearMonth.from(billingDate);
        
        List<Vendor> activeVendors = vendorRepository.findActiveVendors();
        
        for (Vendor vendor : activeVendors) {
            try {
                generateVendorMonthlyBill(vendor, billingPeriod);
            } catch (Exception e) {
                log.error("Failed to generate bill for vendor: {}", vendor.getId(), e);
            }
        }
    }
    
    /**
     * Generate bill for individual vendor
     */
    public Payment generateVendorMonthlyBill(Vendor vendor, YearMonth billingPeriod) {
        
        // Check if bill already generated
        boolean billExists = paymentRepository
            .existsByVendorIdAndPaymentTypeAndBillingPeriod(
                vendor.getId(), 
                PaymentType.MONTHLY_RENT, 
                billingPeriod
            );
        
        if (billExists) {
            return null;
        }
        
        // Get vendor's zone
        Zone zone = vendor.getLocation().getZone();
        
        // Calculate daily pricing for each day in billing period
        List<DailyPricing> dailyPricing = calculateDailyPricing(
            vendor, zone, billingPeriod);
        
        // Calculate total amount
        BigDecimal totalAmount = dailyPricing.stream()
            .map(DailyPricing::getPrice)
            .reduce(BigDecimal.ZERO, BigDecimal::add);
        
        // Apply discounts and penalties
        BillingAdjustments adjustments = calculateBillingAdjustments(
            vendor, totalAmount, billingPeriod);
        
        BigDecimal finalAmount = totalAmount
            .subtract(adjustments.getTotalDiscounts())
            .add(adjustments.getTotalPenalties());
        
        // Create payment record
        Payment payment = Payment.builder()
            .paymentId(generatePaymentId())
            .vendorId(vendor.getId())
            .paymentType(PaymentType.MONTHLY_RENT)
            .amount(finalAmount)
            .baseAmount(totalAmount)
            .discountAmount(adjustments.getTotalDiscounts())
            .penaltyAmount(adjustments.getTotalPenalties())
            .paymentStatus(PaymentStatus.PENDING)
            .dueDate(billingPeriod.atEndOfMonth().atTime(23, 59, 59))
            .billingPeriodStart(billingPeriod.atDay(1).atStartOfDay())
            .billingPeriodEnd(billingPeriod.atEndOfMonth().atTime(23, 59, 59))
            .zoneId(zone.getId())
            .billingData(Map.of(
                "daily_pricing", dailyPricing,
                "adjustments", adjustments,
                "billing_period", billingPeriod.toString()
            ))
            .createdAt(LocalDateTime.now())
            .build();
        
        payment = paymentRepository.save(payment);
        
        // Send bill notification
        notificationService.sendBillNotification(vendor, payment);
        
        // Schedule payment reminders
        schedulePaymentReminders(payment);
        
        return payment;
    }
    
    private List<DailyPricing> calculateDailyPricing(Vendor vendor, Zone zone, YearMonth billingPeriod) {
        
        List<DailyPricing> dailyPricing = new ArrayList<>();
        
        for (LocalDate date = billingPeriod.atDay(1); 
             !date.isAfter(billingPeriod.atEndOfMonth()); 
             date = date.plusDays(1)) {
            
            PricingCalculation pricing = pricingService.calculateDynamicPricing(
                vendor.getId(), zone.getId(), vendor.getCategory(), date);
            
            dailyPricing.add(DailyPricing.builder()
                .date(date)
                .basePrice(pricing.getBasePrice())
                .finalPrice(pricing.getFinalPrice())
                .multipliers(pricing.getPricingBreakdown())
                .build());
        }
        
        return dailyPricing;
    }
    
    private BillingAdjustments calculateBillingAdjustments(Vendor vendor, BigDecimal totalAmount, YearMonth billingPeriod) {
        
        // Performance discount
        BigDecimal performanceDiscount = calculatePerformanceDiscount(vendor, billingPeriod);
        
        // Early payment discount
        BigDecimal earlyPaymentDiscount = totalAmount.multiply(BigDecimal.valueOf(0.05)); // 5% for early payment
        
        // Violation penalties
        BigDecimal violationPenalties = calculateViolationPenalties(vendor, billingPeriod);
        
        // Late payment penalties (if any)
        BigDecimal latePaymentPenalties = calculateLatePaymentPenalties(vendor, billingPeriod);
        
        return BillingAdjustments.builder()
            .performanceDiscount(performanceDiscount)
            .earlyPaymentDiscount(earlyPaymentDiscount)
            .violationPenalties(violationPenalties)
            .latePaymentPenalties(latePaymentPenalties)
            .totalDiscounts(performanceDiscount.add(earlyPaymentDiscount))
            .totalPenalties(violationPenalties.add(latePaymentPenalties))
            .build();
    }
    
    /**
     * Process automatic payment collection
     */
    @Scheduled(fixedRate = 300000) // Every 5 minutes
    public void processAutomaticPayments() {
        
        List<Payment> duePayments = paymentRepository
            .findDuePendingPayments(LocalDateTime.now());
        
        for (Payment payment : duePayments) {
            try {
                processAutomaticPayment(payment);
            } catch (Exception e) {
                log.error("Failed to process automatic payment: {}", payment.getId(), e);
            }
        }
    }
    
    private void processAutomaticPayment(Payment payment) {
        
        Vendor vendor = vendorRepository.findById(payment.getVendorId()).orElse(null);
        if (vendor == null) {
            return;
        }
        
        // Check if vendor has auto-payment enabled
        if (!vendor.isAutoPaymentEnabled()) {
            return;
        }
        
        // Process payment through gateway
        PaymentResult result = paymentGateway.processPayment(
            PaymentRequest.builder()
                .paymentId(payment.getPaymentId())
                .amount(payment.getAmount())
                .vendorId(vendor.getId())
                .paymentMethod(vendor.getDefaultPaymentMethod())
                .build()
        );
        
        if (result.isSuccess()) {
            // Update payment status
            payment.setPaymentStatus(PaymentStatus.COMPLETED);
            payment.setPaidAt(LocalDateTime.now());
            payment.setGatewayTransactionId(result.getTransactionId());
            payment.setGatewayResponse(result.getResponseData());
            
            paymentRepository.save(payment);
            
            // Send confirmation
            notificationService.sendPaymentConfirmation(vendor, payment);
            
        } else {
            // Handle payment failure
            payment.setPaymentStatus(PaymentStatus.FAILED);
            payment.setGatewayResponse(result.getErrorResponse());
            
            paymentRepository.save(payment);
            
            // Send failure notification
            notificationService.sendPaymentFailureNotification(vendor, payment, result.getErrorMessage());
        }
    }
}
```

### 3. Revenue Analytics Service

```java
@Service
public class RevenueAnalyticsService {
    
    @Autowired
    private PaymentRepository paymentRepository;
    
    @Autowired
    private ZoneRepository zoneRepository;
    
    @Autowired
    private VendorRepository vendorRepository;
    
    /**
     * Generate comprehensive revenue analytics
     */
    public RevenueAnalytics generateRevenueAnalytics(LocalDate startDate, LocalDate endDate) {
        
        // Revenue trends
        RevenueTrends trends = calculateRevenueTrends(startDate, endDate);
        
        // Zone-wise revenue
        List<ZoneRevenue> zoneRevenue = calculateZoneRevenue(startDate, endDate);
        
        // Category-wise revenue
        List<CategoryRevenue> categoryRevenue = calculateCategoryRevenue(startDate, endDate);
        
        // Payment method analytics
        PaymentMethodAnalytics paymentAnalytics = calculatePaymentMethodAnalytics(startDate, endDate);
        
        // Dynamic pricing effectiveness
        PricingEffectiveness pricingEffectiveness = calculatePricingEffectiveness(startDate, endDate);
        
        // Revenue predictions
        RevenuePredictions predictions = generateRevenuePredictions(endDate);
        
        return RevenueAnalytics.builder()
            .period(Period.between(startDate, endDate))
            .totalRevenue(trends.getTotalRevenue())
            .averageDailyRevenue(trends.getAverageDailyRevenue())
            .growthRate(trends.getGrowthRate())
            .revenueTrends(trends.getDailyBreakdown())
            .zoneRevenue(zoneRevenue)
            .categoryRevenue(categoryRevenue)
            .paymentAnalytics(paymentAnalytics)
            .pricingEffectiveness(pricingEffectiveness)
            .predictions(predictions)
            .generatedAt(LocalDateTime.now())
            .build();
    }
    
    private RevenueTrends calculateRevenueTrends(LocalDate startDate, LocalDate endDate) {
        
        List<Payment> completedPayments = paymentRepository
            .findCompletedPaymentsByDateRange(startDate, endDate);
        
        // Group by date
        Map<LocalDate, BigDecimal> dailyRevenue = completedPayments.stream()
            .collect(Collectors.groupingBy(
                payment -> payment.getPaidAt().toLocalDate(),
                Collectors.mapping(Payment::getAmount, Collectors.reducing(BigDecimal.ZERO, BigDecimal::add))
            ));
        
        // Calculate trends
        BigDecimal totalRevenue = completedPayments.stream()
            .map(Payment::getAmount)
            .reduce(BigDecimal.ZERO, BigDecimal::add);
        
        long daysBetween = ChronoUnit.DAYS.between(startDate, endDate) + 1;
        BigDecimal averageDailyRevenue = totalRevenue.divide(BigDecimal.valueOf(daysBetween), 2, RoundingMode.HALF_UP);
        
        // Calculate growth rate (compare with previous period)
        LocalDate previousStart = startDate.minusDays(daysBetween);
        LocalDate previousEnd = endDate.minusDays(daysBetween);
        
        BigDecimal previousRevenue = paymentRepository
            .findTotalRevenueByDateRange(previousStart, previousEnd);
        
        double growthRate = previousRevenue.compareTo(BigDecimal.ZERO) > 0 ?
            totalRevenue.subtract(previousRevenue).divide(previousRevenue, 4, RoundingMode.HALF_UP).doubleValue() : 0.0;
        
        return RevenueTrends.builder()
            .totalRevenue(totalRevenue)
            .averageDailyRevenue(averageDailyRevenue)
            .growthRate(growthRate)
            .dailyBreakdown(dailyRevenue.entrySet().stream()
                .map(entry -> DailyRevenue.builder()
                    .date(entry.getKey())
                    .revenue(entry.getValue())
                    .build())
                .sorted(Comparator.comparing(DailyRevenue::getDate))
                .collect(Collectors.toList()))
            .build();
    }
    
    private List<ZoneRevenue> calculateZoneRevenue(LocalDate startDate, LocalDate endDate) {
        
        List<Zone> zones = zoneRepository.findAllActiveZones();
        
        return zones.stream().map(zone -> {
            
            BigDecimal zoneRevenue = paymentRepository
                .findTotalRevenueByZoneAndDateRange(zone.getId(), startDate, endDate);
            
            int vendorCount = vendorRepository.countActiveVendorsByZone(zone.getId());
            
            // Calculate revenue per vendor
            BigDecimal revenuePerVendor = vendorCount > 0 ? 
                zoneRevenue.divide(BigDecimal.valueOf(vendorCount), 2, RoundingMode.HALF_UP) : BigDecimal.ZERO;
            
            return ZoneRevenue.builder()
                .zoneId(zone.getId())
                .zoneName(zone.getName())
                .zoneType(zone.getZoneType())
                .totalRevenue(zoneRevenue)
                .vendorCount(vendorCount)
                .revenuePerVendor(revenuePerVendor)
                .averagePricing(getAveragePricingForZone(zone.getId(), startDate, endDate))
                .build();
        }).sorted(Comparator.comparing(ZoneRevenue::getTotalRevenue).reversed())
        .collect(Collectors.toList());
    }
    
    private PricingEffectiveness calculatePricingEffectiveness(LocalDate startDate, LocalDate endDate) {
        
        // Get pricing data and corresponding revenue
        List<PricingEffectivenessData> pricingData = paymentRepository
            .findPricingEffectivenessData(startDate, endDate);
        
        // Calculate correlation between pricing and revenue
        double priceRevenueCorrelation = calculatePriceRevenueCorrelation(pricingData);
        
        // Calculate optimal price ranges
        Map<VendorCategory, PriceOptimalRange> optimalRanges = calculateOptimalPriceRanges(pricingData);
        
        // Measure revenue uplift from dynamic pricing
        BigDecimal staticPricingRevenue = calculateStaticPricingRevenue(pricingData);
        BigDecimal dynamicPricingRevenue = pricingData.stream()
            .map(PricingEffectivenessData::getActualRevenue)
            .reduce(BigDecimal.ZERO, BigDecimal::add);
        
        double revenueUplift = staticPricingRevenue.compareTo(BigDecimal.ZERO) > 0 ?
            dynamicPricingRevenue.subtract(staticPricingRevenue)
                .divide(staticPricingRevenue, 4, RoundingMode.HALF_UP).doubleValue() : 0.0;
        
        return PricingEffectiveness.builder()
            .priceRevenueCorrelation(priceRevenueCorrelation)
            .optimalPriceRanges(optimalRanges)
            .revenueUpliftPercentage(revenueUplift)
            .staticPricingRevenue(staticPricingRevenue)
            .dynamicPricingRevenue(dynamicPricingRevenue)
            .totalUplift(dynamicPricingRevenue.subtract(staticPricingRevenue))
            .build();
    }
    
    private RevenuePredictions generateRevenuePredictions(LocalDate fromDate) {
        
        // Use ML model to predict next 30 days
        List<DailyRevenuePrediction> predictions = new ArrayList<>();
        
        for (int i = 1; i <= 30; i++) {
            LocalDate predictionDate = fromDate.plusDays(i);
            
            RevenuePredictionRequest request = RevenuePredictionRequest.builder()
                .date(predictionDate)
                .historicalData(getHistoricalRevenueData(predictionDate.minusDays(90), fromDate))
                .externalFactors(getExternalFactors(predictionDate))
                .build();
            
            RevenuePredictionResult result = aiModelService.predictRevenue(request);
            
            predictions.add(DailyRevenuePrediction.builder()
                .date(predictionDate)
                .predictedRevenue(result.getPredictedRevenue())
                .confidenceInterval(result.getConfidenceInterval())
                .confidenceScore(result.getConfidenceScore())
                .keyFactors(result.getKeyFactors())
                .build());
        }
        
        // Calculate monthly prediction
        BigDecimal monthlyPrediction = predictions.stream()
            .map(DailyRevenuePrediction::getPredictedRevenue)
            .reduce(BigDecimal.ZERO, BigDecimal::add);
        
        return RevenuePredictions.builder()
            .dailyPredictions(predictions)
            .monthlyPrediction(monthlyPrediction)
            .predictionPeriod(fromDate.plusDays(1).atStartOfDay(), fromDate.plusDays(30).atTime(23, 59, 59))
            .averageConfidence(predictions.stream()
                .mapToDouble(DailyRevenuePrediction::getConfidenceScore)
                .average()
            )
            .build();
    }
}
```

### 4. Smart Revenue API Controller

```java
@RestController
@RequestMapping("/api/revenue")
@Validated
public class RevenueController {
    
    @Autowired
    private DynamicPricingService pricingService;
    
    @Autowired
    private AutomatedBillingService billingService;
    
    @Autowired
    private RevenueAnalyticsService analyticsService;
    
    @Autowired
    private PaymentGatewayService paymentGateway;
    
    /**
     * Get dynamic pricing for vendor
     */
    @GetMapping("/pricing/{vendorId}")
    @PreAuthorize("hasRole('ADMIN') or hasRole('VENDOR')")
    public ResponseEntity<ApiResponse<PricingCalculation>> getDynamicPricing(
            @PathVariable Long vendorId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        
        if (date == null) {
            date = LocalDate.now();
        }
        
        Vendor vendor = vendorRepository.findById(vendorId)
            .orElseThrow(() -> new ResourceNotFoundException("Vendor not found"));
        
        Long zoneId = vendor.getLocation().getZone().getId();
        VendorCategory category = vendor.getCategory();
        
        PricingCalculation pricing = pricingService.calculateDynamicPricing(
            vendorId, zoneId, category, date);
        
        return ResponseEntity.ok(ApiResponse.success(pricing));
    }
    
    /**
     * Generate bill for vendor
     */
    @PostMapping("/billing/generate/{vendorId}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<Payment>> generateBill(
            @PathVariable Long vendorId,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate billingDate) {
        
        Vendor vendor = vendorRepository.findById(vendorId)
            .orElseThrow(() -> new ResourceNotFoundException("Vendor not found"));
        
        YearMonth billingPeriod = YearMonth.from(billingDate);
        Payment payment = billingService.generateVendorMonthlyBill(vendor, billingPeriod);
        
        return ResponseEntity.ok(ApiResponse.success(payment));
    }
    
    /**
     * Get revenue analytics
     */
    @GetMapping("/analytics")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<RevenueAnalytics>> getRevenueAnalytics(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate) {
        
        RevenueAnalytics analytics = analyticsService.generateRevenueAnalytics(startDate, endDate);
        
        return ResponseEntity.ok(ApiResponse.success(analytics));
    }
    
    /**
     * Process payment
     */
    @PostMapping("/payment/process")
    @PreAuthorize("hasRole('VENDOR') or hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<PaymentResult>> processPayment(
            @RequestBody @Valid PaymentRequest request) {
        
        PaymentResult result = paymentGateway.processPayment(request);
        
        return ResponseEntity.ok(ApiResponse.success(result));
    }
    
    /**
     * Get pricing effectiveness report
     */
    @GetMapping("/pricing/effectiveness")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<PricingEffectiveness>> getPricingEffectiveness(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate) {
        
        PricingEffectiveness effectiveness = analyticsService.calculatePricingEffectiveness(startDate, endDate);
        
        return ResponseEntity.ok(ApiResponse.success(effectiveness));
    }
    
    /**
     * Get revenue predictions
     */
    @GetMapping("/predictions")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<RevenuePredictions>> getRevenuePredictions(
            @RequestParam(defaultValue = "30") int daysAhead) {
        
        LocalDate fromDate = LocalDate.now();
        RevenuePredictions predictions = analyticsService.generateRevenuePredictions(fromDate);
        
        return ResponseEntity.ok(ApiResponse.success(predictions));
    }
}
```

### 5. Payment Gateway Integration

```java
@Service
public class PaymentGatewayService {
    
    @Autowired
    private RazorpayClient razorpayClient;
    
    @Autowired
    private PaymentRepository paymentRepository;
    
    /**
     * Process payment through multiple gateways
     */
    public PaymentResult processPayment(PaymentRequest request) {
        
        try {
            // Determine payment gateway based on amount and method
            PaymentGateway gateway = selectPaymentGateway(request);
            
            PaymentResult result = switch (gateway) {
                case RAZORPAY -> processRazorpayPayment(request);
                case UPI -> processUPIPayment(request);
                case BANK_TRANSFER -> processBankTransfer(request);
                case WALLET -> processWalletPayment(request);
            };
            
            // Log payment attempt
            logPaymentAttempt(request, result);
            
            return result;
            
        } catch (Exception e) {
            return PaymentResult.builder()
                .success(false)
                .errorMessage("Payment processing failed: " + e.getMessage())
                .build();
        }
    }
    
    private PaymentResult processRazorpayPayment(PaymentRequest request) {
        
        try {
            // Create Razorpay order
            JSONObject orderRequest = new JSONObject();
            orderRequest.put("amount", request.getAmount().multiply(BigDecimal.valueOf(100)).intValue()); // Convert to paise
            orderRequest.put("currency", "INR");
            orderRequest.put("receipt", request.getPaymentId());
            orderRequest.put("payment_capture", 1);
            
            Order order = razorpayClient.orders.create(orderRequest);
            
            // Process payment
            if (request.getPaymentMethod() == PaymentMethod.CARD || 
                request.getPaymentMethod() == PaymentMethod.NET_BANKING) {
                
                return processRazorpayCardPayment(order, request);
            } else {
                return PaymentResult.builder()
                    .success(false)
                    .errorMessage("Unsupported payment method for Razorpay")
                    .build();
            }
            
        } catch (RazorpayException e) {
            return PaymentResult.builder()
                .success(false)
                .errorMessage("Razorpay error: " + e.getMessage())
                .build();
        }
    }
    
    private PaymentResult processUPIPayment(PaymentRequest request) {
        
        // Generate UPI payment request
        String upiId = request.getUpiId();
        String transactionNote = "Vendor Payment - " + request.getPaymentId();
        
        // Create UPI intent
        String upiIntent = String.format(
            "upi://pay?pa=%s&pn=Solapur Municipal Corporation&am=%s&cu=INR&tn=%s",
            upiId,
            request.getAmount().toString(),
            transactionNote
        );
        
        // In a real implementation, this would integrate with UPI gateway
        // For now, simulate UPI payment
        return simulateUPIPayment(upiIntent, request);
    }
    
    /**
     * Verify payment status
     */
    public PaymentVerificationResult verifyPayment(String paymentId, String gatewayTransactionId) {
        
        Payment payment = paymentRepository.findByPaymentId(paymentId)
            .orElseThrow(() -> new ResourceNotFoundException("Payment not found"));
        
        try {
            // Verify with gateway
            boolean isValid = switch (payment.getPaymentMethod()) {
                case RAZORPAY -> verifyRazorpayPayment(gatewayTransactionId);
                case UPI -> verifyUPIPayment(gatewayTransactionId);
                case BANK_TRANSFER -> verifyBankTransfer(gatewayTransactionId);
                case WALLET -> verifyWalletPayment(gatewayTransactionId);
            };
            
            if (isValid && payment.getPaymentStatus() == PaymentStatus.PENDING) {
                // Update payment status
                payment.setPaymentStatus(PaymentStatus.COMPLETED);
                payment.setPaidAt(LocalDateTime.now());
                payment.setGatewayTransactionId(gatewayTransactionId);
                paymentRepository.save(payment);
                
                // Send confirmation
                notificationService.sendPaymentConfirmation(payment.getVendor(), payment);
            }
            
            return PaymentVerificationResult.builder()
                .valid(isValid)
                .paymentStatus(payment.getPaymentStatus())
                .paidAt(payment.getPaidAt())
                .build();
            
        } catch (Exception e) {
            return PaymentVerificationResult.builder()
                .valid(false)
                .errorMessage("Payment verification failed: " + e.getMessage())
                .build();
        }
    }
    
    private PaymentGateway selectPaymentGateway(PaymentRequest request) {
        
        // Gateway selection logic based on amount, method, and availability
        return switch (request.getPaymentMethod()) {
            case CARD, NET_BANKING, WALLET -> PaymentGateway.RAZORPAY;
            case UPI -> PaymentGateway.UPI;
            case BANK_TRANSFER -> PaymentGateway.BANK_TRANSFER;
            default -> PaymentGateway.RAZORPAY;
        };
    }
}
```

This smart revenue system provides intelligent dynamic pricing, automated billing, comprehensive revenue analytics, and multi-gateway payment processing, creating a sophisticated financial management platform that optimizes revenue while ensuring fair pricing for vendors.
