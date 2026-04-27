# 📊 Analytics & Reporting System Architecture

## 📈 Comprehensive Business Intelligence Platform

### 1. Analytics Data Warehouse Service

```java
@Service
public class AnalyticsDataWarehouseService {
    
    @Autowired
    private DataWarehouseRepository warehouseRepository;
    
    @Autowired
    private DataAggregationService aggregationService;
    
    @Autowired
    private ReportGenerationService reportService;
    
    /**
     * ETL process for daily data aggregation
     */
    @Scheduled(cron = "0 30 1 * * ?") // Daily at 1:30 AM
    public void performDailyETL() {
        
        LocalDate processDate = LocalDate.now().minusDays(1);
        
        try {
            // Extract data from operational databases
            DailyExtractionData extractionData = extractDailyData(processDate);
            
            // Transform and aggregate
            List<AggregatedData> aggregatedData = transformAndAggregate(extractionData);
            
            // Load to data warehouse
            loadDataToWarehouse(aggregatedData);
            
            // Update materialized views
            updateMaterializedViews();
            
            log.info("Daily ETL completed for date: {}", processDate);
            
        } catch (Exception e) {
            log.error("Daily ETL failed for date: {}", processDate, e);
            alertService.sendETLFailureAlert(processDate, e);
        }
    }
    
    /**
     * Extract data from various sources
     */
    private DailyExtractionData extractDailyData(LocalDate date) {
        
        return DailyExtractionData.builder()
            .date(date)
            .vendorData(extractVendorData(date))
            .transactionData(extractTransactionData(date))
            .violationData(extractViolationData(date))
            .locationData(extractLocationData(date))
            .ratingData(extractRatingData(date))
            .complaintData(extractComplaintData(date))
            .paymentData(extractPaymentData(date))
            .alertData(extractAlertData(date))
            .build();
    }
    
    /**
     * Transform and aggregate data
     */
    private List<AggregatedData> transformAndAggregate(DailyExtractionData extractionData) {
        
        List<AggregatedData> aggregatedData = new ArrayList<>();
        
        // Vendor metrics aggregation
        aggregatedData.addAll(aggregateVendorMetrics(extractionData));
        
        // Revenue metrics aggregation
        aggregatedData.addAll(aggregateRevenueMetrics(extractionData));
        
        // Compliance metrics aggregation
        aggregatedData.addAll(aggregateComplianceMetrics(extractionData));
        
        // Performance metrics aggregation
        aggregatedData.addAll(aggregatePerformanceMetrics(extractionData));
        
        // Geographic metrics aggregation
        aggregatedData.addAll(aggregateGeographicMetrics(extractionData));
        
        return aggregatedData;
    }
    
    /**
     * Aggregate vendor metrics
     */
    private List<AggregatedData> aggregateVendorMetrics(DailyExtractionData data) {
        
        List<AggregatedData> metrics = new ArrayList<>();
        LocalDate date = data.getDate();
        
        // Total vendors by status
        Map<VendorStatus, Long> vendorStatusCounts = data.getVendorData().stream()
            .collect(Collectors.groupingBy(Vendor::getStatus, Collectors.counting()));
        
        for (Map.Entry<VendorStatus, Long> entry : vendorStatusCounts.entrySet()) {
            metrics.add(AggregatedData.builder()
                .metricDate(date)
                .metricType(MetricType.VENDOR_COUNT)
                .metricSubType(entry.getKey().name())
                .value(entry.getValue().doubleValue())
                .dimension("status")
                .build());
        }
        
        // Vendors by category
        Map<VendorCategory, Long> vendorCategoryCounts = data.getVendorData().stream()
            .collect(Collectors.groupingBy(Vendor::getCategory, Collectors.counting()));
        
        for (Map.Entry<VendorCategory, Long> entry : vendorCategoryCounts.entrySet()) {
            metrics.add(AggregatedData.builder()
                .metricDate(date)
                .metricType(MetricType.VENDOR_COUNT)
                .metricSubType(entry.getKey().name())
                .value(entry.getValue().doubleValue())
                .dimension("category")
                .build());
        }
        
        // New vendors per day
        long newVendors = data.getVendorData().stream()
            .mapToLong(v -> v.getCreatedAt().toLocalDate().equals(date) ? 1 : 0)
            .sum();
        
        metrics.add(AggregatedData.builder()
            .metricDate(date)
            .metricType(MetricType.NEW_VENDORS)
            .value((double) newVendors)
            .build());
        
        return metrics;
    }
    
    /**
     * Aggregate revenue metrics
     */
    private List<AggregatedData> aggregateRevenueMetrics(DailyExtractionData data) {
        
        List<AggregatedData> metrics = new ArrayList<>();
        LocalDate date = data.getDate();
        
        // Total revenue
        BigDecimal totalRevenue = data.getPaymentData().stream()
            .filter(p -> p.getStatus() == PaymentStatus.COMPLETED)
            .map(Payment::getAmount)
            .reduce(BigDecimal.ZERO, BigDecimal::add);
        
        metrics.add(AggregatedData.builder()
            .metricDate(date)
            .metricType(MetricType.TOTAL_REVENUE)
            .value(totalRevenue.doubleValue())
            .build());
        
        // Revenue by payment type
        Map<PaymentType, BigDecimal> revenueByType = data.getPaymentData().stream()
            .filter(p -> p.getStatus() == PaymentStatus.COMPLETED)
            .collect(Collectors.groupingBy(
                Payment::getPaymentType,
                Collectors.mapping(Payment::getAmount, Collectors.reducing(BigDecimal.ZERO, BigDecimal::add))
            ));
        
        for (Map.Entry<PaymentType, BigDecimal> entry : revenueByType.entrySet()) {
            metrics.add(AggregatedData.builder()
                .metricDate(date)
                .metricType(MetricType.REVENUE_BY_TYPE)
                .metricSubType(entry.getKey().name())
                .value(entry.getValue().doubleValue())
                .dimension("payment_type")
                .build());
        }
        
        // Average transaction value
        double avgTransactionValue = data.getPaymentData().stream()
            .filter(p -> p.getStatus() == PaymentStatus.COMPLETED)
            .mapToDouble(p -> p.getAmount().doubleValue())
            .average()
            .orElse(0.0);
        
        metrics.add(AggregatedData.builder()
            .metricDate(date)
            .metricType(MetricType.AVERAGE_TRANSACTION_VALUE)
            .value(avgTransactionValue)
            .build());
        
        return metrics;
    }
    
    /**
     * Load aggregated data to warehouse
     */
    private void loadDataToWarehouse(List<AggregatedData> aggregatedData) {
        
        for (AggregatedData data : aggregatedData) {
            try {
                warehouseRepository.save(data);
            } catch (Exception e) {
                log.error("Failed to load aggregated data to warehouse: {}", data, e);
            }
        }
    }
}
```

### 2. Advanced Analytics Service

```java
@Service
public class AdvancedAnalyticsService {
    
    @Autowired
    private AnalyticsDataWarehouseService warehouseService;
    
    @Autowired
    private MachineLearningService mlService;
    
    @Autowired
    private StatisticalAnalysisService statsService;
    
    /**
     * Generate comprehensive analytics dashboard
     */
    public AnalyticsDashboard generateDashboard(LocalDate startDate, LocalDate endDate) {
        
        // Get aggregated data
        List<AggregatedData> data = warehouseService.getAggregatedData(startDate, endDate);
        
        // Generate analytics components
        RevenueAnalytics revenueAnalytics = generateRevenueAnalytics(data);
        VendorAnalytics vendorAnalytics = generateVendorAnalytics(data);
        ComplianceAnalytics complianceAnalytics = generateComplianceAnalytics(data);
        GeographicAnalytics geographicAnalytics = generateGeographicAnalytics(data);
        PerformanceAnalytics performanceAnalytics = generatePerformanceAnalytics(data);
        
        // Generate insights and recommendations
        List<AnalyticsInsight> insights = generateInsights(data);
        List<Recommendation> recommendations = generateRecommendations(insights);
        
        return AnalyticsDashboard.builder()
            .period(Period.between(startDate, endDate))
            .revenueAnalytics(revenueAnalytics)
            .vendorAnalytics(vendorAnalytics)
            .complianceAnalytics(complianceAnalytics)
            .geographicAnalytics(geographicAnalytics)
            .performanceAnalytics(performanceAnalytics)
            .insights(insights)
            .recommendations(recommendations)
            .generatedAt(LocalDateTime.now())
            .build();
    }
    
    /**
     * Generate revenue analytics
     */
    private RevenueAnalytics generateRevenueAnalytics(List<AggregatedData> data) {
        
        // Filter revenue metrics
        List<AggregatedData> revenueData = data.stream()
            .filter(d -> d.getMetricType().name().contains("REVENUE"))
            .collect(Collectors.toList());
        
        // Calculate KPIs
        double totalRevenue = revenueData.stream()
            .filter(d -> d.getMetricType() == MetricType.TOTAL_REVENUE)
            .mapToDouble(AggregatedData::getValue)
            .sum();
        
        double averageDailyRevenue = revenueData.stream()
            .filter(d -> d.getMetricType() == MetricType.TOTAL_REVENUE)
            .mapToDouble(AggregatedData::getValue)
            .average()
            .orElse(0.0);
        
        // Revenue trend analysis
        RevenueTrend revenueTrend = analyzeRevenueTrend(revenueData);
        
        // Revenue breakdown
        RevenueBreakdown breakdown = analyzeRevenueBreakdown(revenueData);
        
        // Forecasting
        RevenueForecast forecast = mlService.forecastRevenue(revenueData, 30);
        
        return RevenueAnalytics.builder()
            .totalRevenue(totalRevenue)
            .averageDailyRevenue(averageDailyRevenue)
            .trend(revenueTrend)
            .breakdown(breakdown)
            .forecast(forecast)
            .build();
    }
    
    /**
     * Generate vendor analytics
     */
    private VendorAnalytics generateVendorAnalytics(List<AggregatedData> data) {
        
        // Filter vendor metrics
        List<AggregatedData> vendorData = data.stream()
            .filter(d -> d.getMetricType().name().contains("VENDOR"))
            .collect(Collectors.toList());
        
        // Vendor growth analysis
        VendorGrowthAnalysis growthAnalysis = analyzeVendorGrowth(vendorData);
        
        // Vendor distribution
        VendorDistribution distribution = analyzeVendorDistribution(vendorData);
        
        // Vendor performance
        VendorPerformanceMetrics performance = analyzeVendorPerformance(vendorData);
        
        // Churn prediction
        VendorChurnPrediction churnPrediction = mlService.predictVendorChurn(vendorData);
        
        return VendorAnalytics.builder()
            .growthAnalysis(growthAnalysis)
            .distribution(distribution)
            .performance(performance)
            .churnPrediction(churnPrediction)
            .build();
    }
    
    /**
     * Generate compliance analytics
     */
    private ComplianceAnalytics generateComplianceAnalytics(List<AggregatedData> data) {
        
        // Filter compliance metrics
        List<AggregatedData> complianceData = data.stream()
            .filter(d -> d.getMetricType().name().contains("COMPLIANCE") || 
                         d.getMetricType().name().contains("VIOLATION"))
            .collect(Collectors.toList());
        
        // Compliance rate
        double complianceRate = calculateComplianceRate(complianceData);
        
        // Violation trends
        ViolationTrends violationTrends = analyzeViolationTrends(complianceData);
        
        // Risk assessment
        ComplianceRiskAssessment riskAssessment = assessComplianceRisk(complianceData);
        
        return ComplianceAnalytics.builder()
            .complianceRate(complianceRate)
            .violationTrends(violationTrends)
            .riskAssessment(riskAssessment)
            .build();
    }
    
    /**
     * Generate analytics insights
     */
    private List<AnalyticsInsight> generateInsights(List<AggregatedData> data) {
        
        List<AnalyticsInsight> insights = new ArrayList<>();
        
        // Revenue insights
        insights.addAll(generateRevenueInsights(data));
        
        // Vendor insights
        insights.addAll(generateVendorInsights(data));
        
        // Compliance insights
        insights.addAll(generateComplianceInsights(data));
        
        // Geographic insights
        insights.addAll(generateGeographicInsights(data));
        
        // Sort by impact score
        insights.sort((i1, i2) -> Double.compare(i2.getImpactScore(), i1.getImpactScore()));
        
        return insights;
    }
    
    /**
     * Generate revenue insights
     */
    private List<AnalyticsInsight> generateRevenueInsights(List<AggregatedData> data) {
        
        List<AnalyticsInsight> insights = new ArrayList<>();
        
        // Revenue growth analysis
        double revenueGrowth = calculateRevenueGrowth(data);
        if (revenueGrowth > 0.1) { // 10% growth
            insights.add(AnalyticsInsight.builder()
                .insightType(InsightType.REVENUE_GROWTH)
                .title("Strong Revenue Growth")
                .description(String.format("Revenue has grown by %.1f%% compared to previous period", revenueGrowth * 100))
                .impactScore(8.5)
                .confidence(0.9)
                .recommendations(List.of("Consider expanding successful zones", "Monitor capacity constraints"))
                .build());
        }
        
        // Revenue concentration analysis
        Map<String, Double> revenueByZone = calculateRevenueByZone(data);
        double concentration = calculateConcentrationIndex(revenueByZone.values());
        
        if (concentration > 0.7) {
            insights.add(AnalyticsInsight.builder()
                .insightType(InsightType.REVENUE_CONCENTRATION)
                .title("High Revenue Concentration")
                .description(String.format("Revenue is highly concentrated with concentration index of %.2f", concentration))
                .impactScore(7.0)
                .confidence(0.85)
                .recommendations(List.of("Diversify revenue sources", "Develop underperforming zones"))
                .build());
        }
        
        return insights;
    }
}
```

### 3. Automated Report Generation

```java
@Service
public class AutomatedReportService {
    
    @Autowired
    private ReportTemplateService templateService;
    
    @Autowired
    private PDFGenerationService pdfService;
    
    @Autowired
    private EmailService emailService;
    
    @Autowired
    private AdvancedAnalyticsService analyticsService;
    
    /**
     * Generate daily reports
     */
    @Scheduled(cron = "0 0 6 * * ?") // Daily at 6 AM
    public void generateDailyReports() {
        
        LocalDate reportDate = LocalDate.now().minusDays(1);
        
        try {
            // Generate daily operations report
            Report dailyOperationsReport = generateDailyOperationsReport(reportDate);
            
            // Generate daily revenue report
            Report dailyRevenueReport = generateDailyRevenueReport(reportDate);
            
            // Generate daily compliance report
            Report dailyComplianceReport = generateDailyComplianceReport(reportDate);
            
            // Send reports to stakeholders
            sendDailyReports(List.of(dailyOperationsReport, dailyRevenueReport, dailyComplianceReport));
            
            log.info("Daily reports generated for date: {}", reportDate);
            
        } catch (Exception e) {
            log.error("Failed to generate daily reports for date: {}", reportDate, e);
        }
    }
    
    /**
     * Generate weekly reports
     */
    @Scheduled(cron = "0 0 7 * * MON") // Weekly on Monday at 7 AM
    public void generateWeeklyReports() {
        
        LocalDate endDate = LocalDate.now().minusDays(1);
        LocalDate startDate = endDate.minusDays(6);
        
        try {
            // Generate weekly performance report
            Report weeklyPerformanceReport = generateWeeklyPerformanceReport(startDate, endDate);
            
            // Generate weekly analytics report
            Report weeklyAnalyticsReport = generateWeeklyAnalyticsReport(startDate, endDate);
            
            // Send reports
            sendWeeklyReports(List.of(weeklyPerformanceReport, weeklyAnalyticsReport));
            
            log.info("Weekly reports generated for period: {} to {}", startDate, endDate);
            
        } catch (Exception e) {
            log.error("Failed to generate weekly reports", e);
        }
    }
    
    /**
     * Generate monthly reports
     */
    @Scheduled(cron = "0 0 8 1 * ?") // Monthly on 1st at 8 AM
    public void generateMonthlyReports() {
        
        YearMonth reportMonth = YearMonth.now().minusMonths(1);
        LocalDate startDate = reportMonth.atDay(1);
        LocalDate endDate = reportMonth.atEndOfMonth();
        
        try {
            // Generate monthly comprehensive report
            Report monthlyComprehensiveReport = generateMonthlyComprehensiveReport(startDate, endDate);
            
            // Generate monthly financial report
            Report monthlyFinancialReport = generateMonthlyFinancialReport(startDate, endDate);
            
            // Generate monthly compliance report
            Report monthlyComplianceReport = generateMonthlyComplianceReport(startDate, endDate);
            
            // Send reports
            sendMonthlyReports(List.of(
                monthlyComprehensiveReport, 
                monthlyFinancialReport, 
                monthlyComplianceReport
            ));
            
            log.info("Monthly reports generated for period: {} to {}", startDate, endDate);
            
        } catch (Exception e) {
            log.error("Failed to generate monthly reports", e);
        }
    }
    
    /**
     * Generate daily operations report
     */
    private Report generateDailyOperationsReport(LocalDate date) {
        
        // Get analytics data
        AnalyticsDashboard analytics = analyticsService.generateDashboard(date, date);
        
        // Get report template
        ReportTemplate template = templateService.getTemplate("DAILY_OPERATIONS");
        
        // Generate report content
        Map<String, Object> templateData = Map.of(
            "reportDate", date,
            "analytics", analytics,
            "generatedAt", LocalDateTime.now()
        );
        
        String reportContent = templateService.renderTemplate(template, templateData);
        
        // Generate PDF
        byte[] pdfContent = pdfService.generatePDF(reportContent, template.getLayout());
        
        return Report.builder()
            .reportId(UUID.randomUUID().toString())
            .reportType(ReportType.DAILY_OPERATIONS)
            .reportDate(date)
            .title(String.format("Daily Operations Report - %s", date))
            .content(reportContent)
            .pdfContent(pdfContent)
            .recipients(getDailyOperationsRecipients())
            .generatedAt(LocalDateTime.now())
            .build();
    }
    
    /**
     * Generate monthly comprehensive report
     */
    private Report generateMonthlyComprehensiveReport(LocalDate startDate, LocalDate endDate) {
        
        // Get comprehensive analytics
        AnalyticsDashboard analytics = analyticsService.generateDashboard(startDate, endDate);
        
        // Get additional monthly data
        MonthlyMetrics monthlyMetrics = getMonthlyMetrics(startDate, endDate);
        
        // Get report template
        ReportTemplate template = templateService.getTemplate("MONTHLY_COMPREHENSIVE");
        
        // Generate report content
        Map<String, Object> templateData = Map.of(
            "startDate", startDate,
            "endDate", endDate,
            "analytics", analytics,
            "monthlyMetrics", monthlyMetrics,
            "generatedAt", LocalDateTime.now()
        );
        
        String reportContent = templateService.renderTemplate(template, templateData);
        
        // Generate PDF
        byte[] pdfContent = pdfService.generatePDF(reportContent, template.getLayout());
        
        return Report.builder()
            .reportId(UUID.randomUUID().toString())
            .reportType(ReportType.MONTHLY_COMPREHENSIVE)
            .reportPeriod(Period.between(startDate, endDate))
            .title(String.format("Monthly Comprehensive Report - %s", startDate.getMonth()))
            .content(reportContent)
            .pdfContent(pdfContent)
            .recipients(getMonthlyComprehensiveRecipients())
            .generatedAt(LocalDateTime.now())
            .build();
    }
    
    /**
     * Send daily reports via email
     */
    private void sendDailyReports(List<Report> reports) {
        
        for (Report report : reports) {
            for (String recipient : report.getRecipients()) {
                
                EmailMessage email = EmailMessage.builder()
                    .to(recipient)
                    .subject(report.getTitle())
                    .body("Please find attached daily report.")
                    .attachment(report.getPdfContent(), report.getTitle() + ".pdf")
                    .build();
                
                emailService.sendEmail(email);
            }
        }
    }
}
```

### 4. Real-Time Analytics API

```java
@RestController
@RequestMapping("/api/analytics")
@Validated
public class AnalyticsController {
    
    @Autowired
    private AdvancedAnalyticsService analyticsService;
    
    @Autowired
    private AutomatedReportService reportService;
    
    @Autowired
    private CustomReportService customReportService;
    
    /**
     * Get analytics dashboard
     */
    @GetMapping("/dashboard")
    @PreAuthorize("hasRole('ADMIN') or hasRole('OFFICER')")
    public ResponseEntity<ApiResponse<AnalyticsDashboard>> getDashboard(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate) {
        
        AnalyticsDashboard dashboard = analyticsService.generateDashboard(startDate, endDate);
        
        return ResponseEntity.ok(ApiResponse.success(dashboard));
    }
    
    /**
     * Get real-time metrics
     */
    @GetMapping("/realtime-metrics")
    @PreAuthorize("hasRole('ADMIN') or hasRole('OFFICER')")
    public ResponseEntity<ApiResponse<RealTimeMetrics>> getRealTimeMetrics() {
        
        RealTimeMetrics metrics = analyticsService.getRealTimeMetrics();
        
        return ResponseEntity.ok(ApiResponse.success(metrics));
    }
    
    /**
     * Get revenue analytics
     */
    @GetMapping("/revenue")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<RevenueAnalytics>> getRevenueAnalytics(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate,
            @RequestParam(required = false) String granularity) {
        
        RevenueAnalytics analytics = analyticsService.getRevenueAnalytics(startDate, endDate, granularity);
        
        return ResponseEntity.ok(ApiResponse.success(analytics));
    }
    
    /**
     * Get vendor analytics
     */
    @GetMapping("/vendors")
    @PreAuthorize("hasRole('ADMIN') or hasRole('OFFICER')")
    public ResponseEntity<ApiResponse<VendorAnalytics>> getVendorAnalytics(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate,
            @RequestParam(required = false) Long vendorId) {
        
        VendorAnalytics analytics = analyticsService.getVendorAnalytics(startDate, endDate, vendorId);
        
        return ResponseEntity.ok(ApiResponse.success(analytics));
    }
    
    /**
     * Get compliance analytics
     */
    @GetMapping("/compliance")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<ComplianceAnalytics>> getComplianceAnalytics(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate) {
        
        ComplianceAnalytics analytics = analyticsService.getComplianceAnalytics(startDate, endDate);
        
        return ResponseEntity.ok(ApiResponse.success(analytics));
    }
    
    /**
     * Generate custom report
     */
    @PostMapping("/reports/custom")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<String>> generateCustomReport(
            @RequestBody @Valid CustomReportRequest request) {
        
        String reportId = customReportService.generateCustomReport(request);
        
        return ResponseEntity.ok(ApiResponse.success(reportId));
    }
    
    /**
     * Get report status
     */
    @GetMapping("/reports/{reportId}/status")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<ReportStatus>> getReportStatus(
            @PathVariable String reportId) {
        
        ReportStatus status = customReportService.getReportStatus(reportId);
        
        return ResponseEntity.ok(ApiResponse.success(status));
    }
    
    /**
     * Download report
     */
    @GetMapping("/reports/{reportId}/download")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Resource> downloadReport(
            @PathVariable String reportId) {
        
        Report report = customReportService.getReport(reportId);
        
        return ResponseEntity.ok()
            .header(HttpHeaders.CONTENT_DISPOSITION, 
                    "attachment; filename=\"" + report.getTitle() + ".pdf\"")
            .contentType(MediaType.APPLICATION_PDF)
            .body(new ByteArrayResource(report.getPdfContent()));
    }
    
    /**
     * Get analytics insights
     */
    @GetMapping("/insights")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<List<AnalyticsInsight>>> getInsights(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate,
            @RequestParam(required = false) InsightType insightType) {
        
        List<AnalyticsInsight> insights = analyticsService.getInsights(startDate, endDate, insightType);
        
        return ResponseEntity.ok(ApiResponse.success(insights));
    }
    
    /**
     * Stream real-time analytics data
     */
    @GetMapping(value = "/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter streamAnalyticsData() {
        
        SseEmitter emitter = new SseEmitter(Long.MAX_VALUE);
        
        // Subscribe to real-time analytics updates
        analyticsService.subscribeToUpdates(emitter);
        
        return emitter;
    }
}
```

### 5. Frontend Analytics Dashboard (React)

```javascript
// AnalyticsDashboard.jsx
import React, { useState, useEffect } from 'react';
import { Row, Col, Card, Select, DatePicker, Spin } from 'antd';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, AreaChart, Area } from 'recharts';
import { useSelector, useDispatch } from 'react-redux';
import { fetchAnalyticsData, fetchRealTimeMetrics } from '../store/actions/analyticsActions';

const { RangePicker } = DatePicker;
const { Option } = Select;

const AnalyticsDashboard = () => {
    const [dateRange, setDateRange] = useState([
        new Date().setDate(new Date().getDate() - 30),
        new Date()
    ]);
    const [analyticsData, setAnalyticsData] = useState(null);
    const [realTimeMetrics, setRealTimeMetrics] = useState(null);
    const [loading, setLoading] = useState(true);
    
    const dispatch = useDispatch();
    const { data, realTime, loading: analyticsLoading } = useSelector(state => state.analytics);

    useEffect(() => {
        loadAnalyticsData();
        loadRealTimeData();
        
        // Set up real-time updates
        const interval = setInterval(loadRealTimeData, 30000); // Update every 30 seconds
        
        return () => clearInterval(interval);
    }, [dateRange]);

    const loadAnalyticsData = async () => {
        setLoading(true);
        try {
            const result = await dispatch(fetchAnalyticsData({
                startDate: dateRange[0],
                endDate: dateRange[1]
            }));
            setAnalyticsData(result.data);
        } catch (error) {
            console.error('Failed to load analytics data:', error);
        } finally {
            setLoading(false);
        }
    };

    const loadRealTimeData = async () => {
        try {
            const result = await dispatch(fetchRealTimeMetrics());
            setRealTimeMetrics(result.data);
        } catch (error) {
            console.error('Failed to load real-time metrics:', error);
        }
    };

    if (loading || !analyticsData) {
        return (
            <div style={{ textAlign: 'center', padding: '50px' }}>
                <Spin size="large" />
                <p>Loading analytics...</p>
            </div>
        );
    }

    return (
        <div style={{ padding: '24px' }}>
            {/* Header with date range selector */}
            <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
                <Col span={24}>
                    <Card>
                        <Row justify="space-between" align="middle">
                            <Col>
                                <h2>Analytics Dashboard</h2>
                            </Col>
                            <Col>
                                <RangePicker
                                    value={dateRange}
                                    onChange={setDateRange}
                                    style={{ marginRight: '16px' }}
                                />
                                <Select defaultValue="daily" style={{ width: 120 }}>
                                    <Option value="daily">Daily</Option>
                                    <Option value="weekly">Weekly</Option>
                                    <Option value="monthly">Monthly</Option>
                                </Select>
                            </Col>
                        </Row>
                    </Card>
                </Col>
            </Row>

            {/* Real-time Metrics */}
            {realTimeMetrics && (
                <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
                    <Col span={6}>
                        <Card>
                            <h3>Active Vendors</h3>
                            <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#1890ff' }}>
                                {realTimeMetrics.activeVendors}
                            </div>
                            <div style={{ fontSize: '12px', color: '#666' }}>
                                Live now
                            </div>
                        </Card>
                    </Col>
                    <Col span={6}>
                        <Card>
                            <h3>Today's Revenue</h3>
                            <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#52c41a' }}>
                                ₹{realTimeMetrics.todayRevenue.toLocaleString()}
                            </div>
                            <div style={{ fontSize: '12px', color: '#666' }}>
                                {realTimeMetrics.revenueGrowth > 0 ? '+' : ''}{realTimeMetrics.revenueGrowth}%
                            </div>
                        </Card>
                    </Col>
                    <Col span={6}>
                        <Card>
                            <h3>Compliance Rate</h3>
                            <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#faad14' }}>
                                {(realTimeMetrics.complianceRate * 100).toFixed(1)}%
                            </div>
                            <div style={{ fontSize: '12px', color: '#666' }}>
                                Last 24 hours
                            </div>
                        </Card>
                    </Col>
                    <Col span={6}>
                        <Card>
                            <h3>Active Alerts</h3>
                            <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#ff4d4f' }}>
                                {realTimeMetrics.activeAlerts}
                            </div>
                            <div style={{ fontSize: '12px', color: '#666' }}>
                                Requiring attention
                            </div>
                        </Card>
                    </Col>
                </Row>
            )}

            {/* Revenue Analytics */}
            <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
                <Col span={16}>
                    <Card title="Revenue Trend" extra={
                        <Select defaultValue="revenue" style={{ width: 120 }}>
                            <Option value="revenue">Revenue</Option>
                            <Option value="transactions">Transactions</Option>
                            <Option value="vendors">Vendors</Option>
                        </Select>
                    }>
                        <LineChart
                            width={800}
                            height={300}
                            data={analyticsData.revenueAnalytics.trend.data}
                        >
                            <Line type="monotone" dataKey="revenue" stroke="#1890ff" strokeWidth={2} />
                            <Line type="monotone" dataKey="forecast" stroke="#52c41a" strokeDasharray="5 5" />
                            <XAxis dataKey="date" />
                            <YAxis />
                        </LineChart>
                    </Card>
                </Col>
                <Col span={8}>
                    <Card title="Revenue Breakdown">
                        <PieChart width={300} height={300}>
                            <Pie
                                data={analyticsData.revenueAnalytics.breakdown.data}
                                cx={150}
                                cy={150}
                                innerRadius={40}
                                outerRadius={100}
                                paddingAngle={5}
                                dataKey="value"
                            >
                                {analyticsData.revenueAnalytics.breakdown.data.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                            </Pie>
                            <Tooltip />
                        </PieChart>
                    </Card>
                </Col>
            </Row>

            {/* Vendor Analytics */}
            <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
                <Col span={12}>
                    <Card title="Vendor Growth">
                        <AreaChart
                            width={500}
                            height={250}
                            data={analyticsData.vendorAnalytics.growthAnalysis.data}
                        >
                            <Area type="monotone" dataKey="active" stackId="1" stroke="#8884d8" fill="#8884d8" />
                            <Area type="monotone" dataKey="new" stackId="1" stroke="#82ca9d" fill="#82ca9d" />
                            <XAxis dataKey="date" />
                            <YAxis />
                        </AreaChart>
                    </Card>
                </Col>
                <Col span={12}>
                    <Card title="Vendor Distribution">
                        <BarChart
                            width={500}
                            height={250}
                            data={analyticsData.vendorAnalytics.distribution.data}
                        >
                            <Bar dataKey="count" fill="#1890ff" />
                            <XAxis dataKey="category" />
                            <YAxis />
                        </BarChart>
                    </Card>
                </Col>
            </Row>

            {/* Compliance Analytics */}
            <Row gutter={[16, 16]}>
                <Col span={24}>
                    <Card title="Compliance Analytics">
                        <Row gutter={[16, 16]}>
                            <Col span={8}>
                                <h4>Compliance Rate Trend</h4>
                                <LineChart
                                    width={350}
                                    height={200}
                                    data={analyticsData.complianceAnalytics.complianceTrend.data}
                                >
                                    <Line type="monotone" dataKey="rate" stroke="#52c41a" strokeWidth={2} />
                                    <XAxis dataKey="date" />
                                    <YAxis domain={[0, 100]} />
                                </LineChart>
                            </Col>
                            <Col span={8}>
                                <h4>Violation Types</h4>
                                <PieChart width={350} height={200}>
                                    <Pie
                                        data={analyticsData.complianceAnalytics.violationTypes.data}
                                        cx={175}
                                        cy={100}
                                        outerRadius={80}
                                        dataKey="count"
                                    >
                                        {analyticsData.complianceAnalytics.violationTypes.data.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={VIOLATION_COLORS[index % VIOLATION_COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip />
                                </PieChart>
                            </Col>
                            <Col span={8}>
                                <h4>Risk Assessment</h4>
                                <div style={{ padding: '20px' }}>
                                    <div style={{ marginBottom: '10px' }}>
                                        <span>Low Risk: </span>
                                        <span style={{ fontWeight: 'bold', color: '#52c41a' }}>
                                            {analyticsData.complianceAnalytics.riskAssessment.lowRisk}%
                                        </span>
                                    </div>
                                    <div style={{ marginBottom: '10px' }}>
                                        <span>Medium Risk: </span>
                                        <span style={{ fontWeight: 'bold', color: '#faad14' }}>
                                            {analyticsData.complianceAnalytics.riskAssessment.mediumRisk}%
                                        </span>
                                    </div>
                                    <div>
                                        <span>High Risk: </span>
                                        <span style={{ fontWeight: 'bold', color: '#ff4d4f' }}>
                                            {analyticsData.complianceAnalytics.riskAssessment.highRisk}%
                                        </span>
                                    </div>
                                </div>
                            </Col>
                        </Row>
                    </Card>
                </Col>
            </Row>
        </div>
    );
};

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];
const VIOLATION_COLORS = ['#ff4d4f', '#faad14', '#52c41a', '#1890ff'];

export default AnalyticsDashboard;
```

This comprehensive analytics and reporting system provides real-time insights, automated report generation, and business intelligence capabilities that enable data-driven decision making for the smart city vendor management platform.
