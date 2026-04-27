# 🚨 Smart Enforcement System Architecture

## 🎯 Automated Violation Detection & Enforcement

### 1. AI-Powered Violation Detection Engine

```java
@Service
public class SmartViolationDetectionService {
    
    @Autowired
    private VendorTrackingRepository trackingRepository;
    
    @Autowired
    private ZoneRepository zoneRepository;
    
    @Autowired
    private ViolationRepository violationRepository;
    
    @Autowired
    private AIModelService aiModelService;
    
    @Autowired
    private AlertService alertService;
    
    /**
     * Real-time violation detection using AI
     */
    @Scheduled(fixedRate = 30000) // Every 30 seconds
    public void detectViolations() {
        
        List<Vendor> activeVendors = vendorRepository.findActiveVendors();
        
        for (Vendor vendor : activeVendors) {
            
            // Get recent tracking data
            List<VendorTrackingLog> recentTracking = trackingRepository
                .findRecentTracking(vendor.getId(), Duration.ofMinutes(5));
            
            if (recentTracking.isEmpty()) continue;
            
            // Detect various violation types
            detectLocationViolations(vendor, recentTracking);
            detectTimeViolations(vendor, recentTracking);
            detectOvercrowdingViolations(vendor);
            detectUnauthorizedVendorViolations(vendor, recentTracking);
            detectAnomalousBehavior(vendor, recentTracking);
        }
    }
    
    /**
     * Location-based violation detection
     */
    private void detectLocationViolations(Vendor vendor, List<VendorTrackingLog> tracking) {
        
        if (vendor.getLocation() == null) return;
        
        VendorLocation registeredLocation = vendor.getLocation();
        Zone zone = registeredLocation.getZone();
        
        for (VendorTrackingLog log : tracking) {
            
            // Check if vendor is outside geofence
            boolean isWithinZone = isPointInPolygon(
                log.getLatitude(), 
                log.getLongitude(), 
                zone.getPolygonCoordinates()
            );
            
            if (!isWithinZone) {
                
                // Calculate violation severity
                double distance = calculateDistanceFromZone(
                    log.getLatitude(), 
                    log.getLongitude(), 
                    zone
                );
                
                ViolationSeverity severity = calculateViolationSeverity(distance, zone);
                
                // Create violation record
                Violation violation = Violation.builder()
                    .vendorId(vendor.getId())
                    .violationType(ViolationType.LOCATION)
                    .severity(severity)
                    .aiDetected(true)
                    .detectionConfidence(0.95)
                    .locationLatitude(log.getLatitude())
                    .locationLongitude(log.getLongitude())
                    .description(String.format(
                        "Vendor detected %.2f meters outside assigned zone", 
                        distance
                    ))
                    .violationData(Map.of(
                        "distance", distance,
                        "zone_id", zone.getId(),
                        "tracking_source", log.getTrackingSource()
                    ))
                    .automatedActionTaken(false)
                    .priorityLevel(calculatePriorityLevel(severity, distance))
                    .createdAt(LocalDateTime.now())
                    .build();
                
                processViolation(violation);
            }
        }
    }
    
    /**
     * Time-based violation detection
     */
    private void detectTimeViolations(Vendor vendor, List<VendorTrackingLog> tracking) {
        
        Zone zone = vendor.getLocation().getZone();
        List<ZoneRule> timeRules = zoneRepository
            .findTimeRestrictionRules(zone.getId());
        
        for (ZoneRule rule : timeRules) {
            
            if (isTimeRuleViolation(tracking, rule)) {
                
                Violation violation = Violation.builder()
                    .vendorId(vendor.getId())
                    .violationType(ViolationType.TIME)
                    .severity(ViolationSeverity.MEDIUM)
                    .aiDetected(true)
                    .detectionConfidence(0.90)
                    .description("Vendor operating during restricted hours")
                    .violationData(Map.of(
                        "rule_id", rule.getId(),
                        "rule_value", rule.getRuleValue(),
                        "tracking_count", tracking.size()
                    ))
                    .automatedActionTaken(false)
                    .priorityLevel(PriorityLevel.MEDIUM)
                    .createdAt(LocalDateTime.now())
                    .build();
                
                processViolation(violation);
            }
        }
    }
    
    /**
     * Overcrowding violation detection
     */
    private void detectOvercrowdingViolations(Vendor vendor) {
        
        Zone zone = vendor.getLocation().getZone();
        
        // Get current vendor count in zone
        int currentVendors = trackingRepository
            .countActiveVendorsInZone(zone.getId(), LocalDateTime.now().minusMinutes(5));
        
        // Check if zone is overcrowded
        if (currentVendors > zone.getMaxVendors()) {
            
            double congestionRate = (double) currentVendors / zone.getMaxVendors();
            
            if (congestionRate >= zone.getCongestionThreshold()) {
                
                Violation violation = Violation.builder()
                    .vendorId(vendor.getId())
                    .violationType(ViolationType.OVERCROWDING)
                    .severity(ViolationSeverity.HIGH)
                    .aiDetected(true)
                    .detectionConfidence(0.85)
                    .description(String.format(
                        "Zone overcrowded: %d vendors (max: %d)", 
                        currentVendors, zone.getMaxVendors()
                    ))
                    .violationData(Map.of(
                        "current_vendors", currentVendors,
                        "max_vendors", zone.getMaxVendors(),
                        "congestion_rate", congestionRate
                    ))
                    .automatedActionTaken(false)
                    .priorityLevel(PriorityLevel.HIGH)
                    .createdAt(LocalDateTime.now())
                    .build();
                
                processViolation(violation);
            }
        }
    }
    
    /**
     * Unauthorized vendor detection
     */
    private void detectUnauthorizedVendorViolations(Vendor vendor, List<VendorTrackingLog> tracking) {
        
        for (VendorTrackingLog log : tracking) {
            
            // Check if vendor is in unauthorized zone
            List<Zone> unauthorizedZones = zoneRepository
                .findUnauthorizedZonesForVendor(vendor.getId(), log.getLatitude(), log.getLongitude());
            
            for (Zone unauthorizedZone : unauthorizedZones) {
                
                Violation violation = Violation.builder()
                    .vendorId(vendor.getId())
                    .violationType(ViolationType.UNAUTHORIZED_VENDOR)
                    .severity(ViolationSeverity.CRITICAL)
                    .aiDetected(true)
                    .detectionConfidence(0.95)
                    .description(String.format(
                        "Vendor detected in unauthorized zone: %s", 
                        unauthorizedZone.getName()
                    ))
                    .violationData(Map.of(
                        "unauthorized_zone_id", unauthorizedZone.getId(),
                        "unauthorized_zone_name", unauthorizedZone.getName()
                    ))
                    .automatedActionTaken(false)
                    .priorityLevel(PriorityLevel.CRITICAL)
                    .createdAt(LocalDateTime.now())
                    .build();
                
                processViolation(violation);
            }
        }
    }
    
    /**
     * Anomalous behavior detection
     */
    private void detectAnomalousBehavior(Vendor vendor, List<VendorTrackingLog> tracking) {
        
        // Use ML model to detect anomalous patterns
        AnomalyDetectionRequest request = AnomalyDetectionRequest.builder()
            .vendorId(vendor.getId())
            .trackingData(tracking)
            .historicalData(getHistoricalPatterns(vendor.getId()))
            .build();
        
        AnomalyDetectionResult result = aiModelService.detectAnomalies(request);
        
        if (result.isAnomalyDetected()) {
            
            Violation violation = Violation.builder()
                .vendorId(vendor.getId())
                .violationType(ViolationType.ANOMALOUS_BEHAVIOR)
                .severity(ViolationSeverity.MEDIUM)
                .aiDetected(true)
                .detectionConfidence(result.getConfidence())
                .description("Anomalous behavior detected: " + result.getAnomalyType())
                .violationData(Map.of(
                    "anomaly_type", result.getAnomalyType(),
                    "anomaly_score", result.getAnomalyScore(),
                    "pattern_description", result.getPatternDescription()
                ))
                .automatedActionTaken(false)
                .priorityLevel(PriorityLevel.MEDIUM)
                .createdAt(LocalDateTime.now())
                .build();
            
            processViolation(violation);
        }
    }
    
    /**
     * Process detected violation
     */
    private void processViolation(Violation violation) {
        
        // Check for duplicate violations
        boolean isDuplicate = violationRepository
            .isDuplicateViolation(violation.getVendorId(), violation.getViolationType(), LocalDateTime.now().minusMinutes(10));
        
        if (isDuplicate) return;
        
        // Save violation
        violation = violationRepository.save(violation);
        
        // Trigger automated actions
        triggerAutomatedActions(violation);
        
        // Send alerts
        alertService.sendViolationAlert(violation);
        
        // Update vendor risk score
        updateVendorRiskScore(violation.getVendorId(), violation);
    }
    
    /**
     * Trigger automated enforcement actions
     */
    private void triggerAutomatedActions(Violation violation) {
        
        switch (violation.getViolationType()) {
            case LOCATION:
                if (violation.getSeverity() == ViolationSeverity.CRITICAL) {
                    // Send immediate alert to nearby officers
                    alertService.sendImmediateOfficerAlert(violation);
                }
                break;
                
            case UNAUTHORIZED_VENDOR:
                // Auto-issue challan
                challanService.autoIssueChallan(violation);
                break;
                
            case OVERCROWDING:
                // Suggest zone redistribution
                zoneOptimizationService.suggestRedistribution(violation);
                break;
                
            case TIME:
                // Send warning to vendor
                notificationService.sendViolationWarning(violation);
                break;
        }
        
        violation.setAutomatedActionTaken(true);
        violationRepository.save(violation);
    }
}
```

### 2. Fake Complaint Detection System

```java
@Service
public class FakeComplaintDetectionService {
    
    @Autowired
    private ComplaintRepository complaintRepository;
    
    @Autowired
    private AIModelService aiModelService;
    
    @Autowired
    private UserRepository userRepository;
    
    /**
     * Analyze complaint for authenticity
     */
    public ComplaintAnalysisResult analyzeComplaint(Complaint complaint) {
        
        // 1. Analyze user behavior patterns
        UserBehaviorAnalysis userAnalysis = analyzeUserBehavior(complaint.getReportedBy());
        
        // 2. Analyze complaint content
        ContentAnalysis contentAnalysis = analyzeComplaintContent(complaint);
        
        // 3. Analyze location and timing patterns
        SpatioTemporalAnalysis spatioAnalysis = analyzeSpatioTemporalPatterns(complaint);
        
        // 4. Check for duplicate/similar complaints
        SimilarityAnalysis similarityAnalysis = checkSimilarComplaints(complaint);
        
        // 5. Calculate authenticity score
        double authenticityScore = calculateAuthenticityScore(
            userAnalysis, contentAnalysis, spatioAnalysis, similarityAnalysis);
        
        boolean isAuthentic = authenticityScore >= 0.6;
        
        // Update complaint with analysis results
        complaint.setAuthenticityScore(authenticityScore);
        complaint.setIsAuthentic(isAuthentic);
        complaint.setAnalysisData(Map.of(
            "user_analysis", userAnalysis,
            "content_analysis", contentAnalysis,
            "spatio_analysis", spatioAnalysis,
            "similarity_analysis", similarityAnalysis
        ));
        
        complaintRepository.save(complaint);
        
        return ComplaintAnalysisResult.builder()
            .authentic(isAuthentic)
            .authenticityScore(authenticityScore)
            .confidence(authenticityScore >= 0.8 ? HIGH : authenticityScore >= 0.6 ? MEDIUM : LOW)
            .riskFactors(identifyRiskFactors(userAnalysis, contentAnalysis, spatioAnalysis))
            .recommendation(getRecommendation(authenticityScore))
            .build();
    }
    
    private UserBehaviorAnalysis analyzeUserBehavior(Long userId) {
        
        User user = userRepository.findById(userId).orElse(null);
        if (user == null) {
            return UserBehaviorAnalysis.builder()
                .riskLevel(HIGH)
                .issues(List.of("User not found"))
                .build();
        }
        
        // Get user's complaint history
        List<Complaint> userComplaints = complaintRepository
            .findByReportedByOrderByCreatedAtDesc(userId);
        
        // Analyze patterns
        double complaintFrequency = calculateComplaintFrequency(userComplaints);
        double falseReportRate = calculateFalseReportRate(userComplaints);
        double patternRegularity = calculatePatternRegularity(userComplaints);
        
        // Identify suspicious patterns
        List<String> suspiciousPatterns = new ArrayList<>();
        if (complaintFrequency > 5.0) suspiciousPatterns.add("High complaint frequency");
        if (falseReportRate > 0.3) suspiciousPatterns.add("High false report rate");
        if (patternRegularity > 0.8) suspiciousPatterns.add("Overly regular complaint pattern");
        
        return UserBehaviorAnalysis.builder()
            .complaintFrequency(complaintFrequency)
            .falseReportRate(falseReportRate)
            .patternRegularity(patternRegularity)
            .suspiciousPatterns(suspiciousPatterns)
            .riskLevel(calculateUserRiskLevel(complaintFrequency, falseReportRate, suspiciousPatterns.size()))
            .build();
    }
    
    private ContentAnalysis analyzeComplaintContent(Complaint complaint) {
        
        String content = complaint.getDescription();
        
        // Use NLP to analyze content
        NLPAnalysisResult nlpResult = aiModelService.analyzeText(content);
        
        // Check for emotional language
        double emotionalIntensity = nlpResult.getEmotionalIntensity();
        double profanityScore = nlpResult.getProfanityScore();
        double grammarScore = nlpResult.getGrammarScore();
        
        // Check for generic/template language
        double templateSimilarity = calculateTemplateSimilarity(content);
        
        List<String> contentIssues = new ArrayList<>();
        if (emotionalIntensity > 0.8) contentIssues.add("Excessive emotional language");
        if (profanityScore > 0.3) contentIssues.add("Inappropriate language");
        if (grammarScore < 0.5) contentIssues.add("Poor grammar/structure");
        if (templateSimilarity > 0.7) contentIssues.add("Template-like content");
        
        return ContentAnalysis.builder()
            .emotionalIntensity(emotionalIntensity)
            .profanityScore(profanityScore)
            .grammarScore(grammarScore)
            .templateSimilarity(templateSimilarity)
            .contentIssues(contentIssues)
            .authenticityScore(calculateContentAuthenticity(emotionalIntensity, profanityScore, templateSimilarity))
            .build();
    }
    
    private SpatioTemporalAnalysis analyzeSpatioTemporalPatterns(Complaint complaint) {
        
        // Analyze location patterns
        List<Complaint> locationComplaints = complaintRepository
            .findByLocationWithinRadius(
                complaint.getLocationLatitude(), 
                complaint.getLocationLongitude(), 
                100.0 // 100 meters
            );
        
        // Analyze time patterns
        List<Complaint> timeComplaints = complaintRepository
            .findByTimeRange(
                complaint.getCreatedAt().minusHours(2),
                complaint.getCreatedAt().plusHours(2)
            );
        
        // Calculate clustering scores
        double locationClustering = calculateLocationClustering(complaint, locationComplaints);
        double timeClustering = calculateTimeClustering(complaint, timeComplaints);
        
        // Check for suspicious patterns
        boolean isLocationClustered = locationClustering > 0.7;
        boolean isTimeClustered = timeClustering > 0.6;
        
        return SpatioTemporalAnalysis.builder()
            .locationClustering(locationClustering)
            .timeClustering(timeClustering)
            .nearbyComplaints(locationComplaints.size())
            .timeWindowComplaints(timeComplaints.size())
            .suspiciousLocation(isLocationClustered)
            .suspiciousTiming(isTimeClustered)
            .build();
    }
    
    private SimilarityAnalysis checkSimilarComplaints(Complaint complaint) {
        
        // Find similar complaints using text similarity
        List<Complaint> similarComplaints = complaintRepository
            .findSimilarComplaints(complaint.getDescription(), 0.8);
        
        // Analyze similarity patterns
        double averageSimilarity = similarComplaints.stream()
            .mapToDouble(c -> calculateTextSimilarity(complaint.getDescription(), c.getDescription()))
            .average()
            .orElse(0.0);
        
        boolean isHighlySimilar = similarComplaints.size() > 3 && averageSimilarity > 0.85;
        
        return SimilarityAnalysis.builder()
            .similarComplaints(similarComplaints)
            .similarityCount(similarComplaints.size())
            .averageSimilarity(averageSimilarity)
            .isHighlySimilar(isHighlySimilar)
            .build();
    }
    
    private double calculateAuthenticityScore(
            UserBehaviorAnalysis userAnalysis,
            ContentAnalysis contentAnalysis,
            SpatioTemporalAnalysis spatioAnalysis,
            SimilarityAnalysis similarityAnalysis) {
        
        double userScore = userAnalysis.getRiskLevel() == LOW ? 0.8 : 
                          userAnalysis.getRiskLevel() == MEDIUM ? 0.6 : 0.3;
        
        double contentScore = contentAnalysis.getAuthenticityScore();
        
        double spatioScore = (spatioAnalysis.isSuspiciousLocation() || spatioAnalysis.isSuspiciousTiming()) ? 0.5 : 0.8;
        
        double similarityScore = similarityAnalysis.isHighlySimilar() ? 0.3 : 0.9;
        
        // Weighted average
        return (userScore * 0.3) + (contentScore * 0.3) + (spatioScore * 0.2) + (similarityScore * 0.2);
    }
}
```

### 3. Priority-Based Enforcement Alert System

```java
@Service
public class PriorityEnforcementService {
    
    @Autowired
    private AlertRepository alertRepository;
    
    @Autowired
    private NotificationService notificationService;
    
    @Autowired
    private OfficerLocationService officerLocationService;
    
    /**
     * Send priority-based enforcement alerts
     */
    public void sendEnforcementAlert(Violation violation) {
        
        AlertPriority priority = calculateAlertPriority(violation);
        
        SmartAlert alert = SmartAlert.builder()
            .alertType(mapViolationToAlertType(violation.getViolationType()))
            .severity(mapPriorityToSeverity(priority))
            .vendorId(violation.getVendorId())
            .zoneId(getVendorZoneId(violation.getVendorId()))
            .alertTitle(generateAlertTitle(violation))
            .alertMessage(generateAlertMessage(violation))
            .alertData(violation.getViolationData())
            .locationLatitude(violation.getLocationLatitude())
            .locationLongitude(violation.getLocationLongitude())
            .priorityLevel(priority)
            .autoEscalation(priority == PriorityLevel.CRITICAL)
            .escalationLevel(0)
            .createdAt(LocalDateTime.now())
            .build();
        
        alert = alertRepository.save(alert);
        
        // Route to appropriate officers
        routeToOfficers(alert, priority);
        
        // Schedule escalation if needed
        scheduleEscalation(alert);
    }
    
    /**
     * Calculate alert priority based on violation characteristics
     */
    private AlertPriority calculateAlertPriority(Violation violation) {
        
        double priorityScore = 0.0;
        
        // Base score from violation type
        switch (violation.getViolationType()) {
            case UNAUTHORIZED_VENDOR:
                priorityScore += 40;
                break;
            case LOCATION:
                priorityScore += 30;
                break;
            case OVERCROWDING:
                priorityScore += 25;
                break;
            case TIME:
                priorityScore += 15;
                break;
            default:
                priorityScore += 10;
        }
        
        // Add severity modifier
        switch (violation.getSeverity()) {
            case CRITICAL:
                priorityScore += 30;
                break;
            case HIGH:
                priorityScore += 20;
                break;
            case MEDIUM:
                priorityScore += 10;
                break;
            case LOW:
                priorityScore += 5;
                break;
        }
        
        // Add AI confidence modifier
        priorityScore += violation.getDetectionConfidence() * 20;
        
        // Add location modifier (high-traffic areas)
        if (isHighTrafficArea(violation.getLocationLatitude(), violation.getLocationLongitude())) {
            priorityScore += 15;
        }
        
        // Add time modifier (peak hours)
        if (isPeakHours(LocalDateTime.now())) {
            priorityScore += 10;
        }
        
        // Convert score to priority
        if (priorityScore >= 80) return AlertPriority.CRITICAL;
        if (priorityScore >= 60) return AlertPriority.HIGH;
        if (priorityScore >= 40) return AlertPriority.MEDIUM;
        return AlertPriority.LOW;
    }
    
    /**
     * Route alert to appropriate officers
     */
    private void routeToOfficers(SmartAlert alert, AlertPriority priority) {
        
        // Find nearby officers
        List<Officer> nearbyOfficers = officerLocationService
            .findNearbyOfficers(
                alert.getLocationLatitude(), 
                alert.getLocationLongitude(), 
                getAlertRadius(priority)
            );
        
        // Filter by availability and role
        List<Officer> availableOfficers = nearbyOfficers.stream()
            .filter(officer -> officer.isAvailable() && officer.canHandle(alert.getAlertType()))
            .collect(Collectors.toList());
        
        if (availableOfficers.isEmpty()) {
            // Escalate to all officers in zone
            availableOfficers = officerLocationService
                .findOfficersInZone(alert.getZoneId());
        }
        
        // Send notifications
        for (Officer officer : availableOfficers) {
            notificationService.sendAlertNotification(officer, alert);
        }
        
        // Log routing
        alertRoutingRepository.save(AlertRouting.builder()
            .alertId(alert.getId())
            .routedOfficers(availableOfficers.stream().map(Officer::getId).collect(Collectors.toList()))
            .routingMethod("PROXIMITY_BASED")
            .routedAt(LocalDateTime.now())
            .build());
    }
    
    /**
     * Schedule automatic escalation
     */
    private void scheduleEscalation(SmartAlert alert) {
        
        if (!alert.isAutoEscalation()) return;
        
        long delayMinutes = getEscalationDelay(alert.getPriorityLevel());
        
        ScheduledExecutorService scheduler = Executors.newSingleThreadScheduledExecutor();
        scheduler.schedule(() -> {
            
            SmartAlert currentAlert = alertRepository.findById(alert.getId()).orElse(null);
            if (currentAlert != null && !currentAlert.isResolved()) {
                
                escalateAlert(currentAlert);
            }
        }, delayMinutes, TimeUnit.MINUTES);
    }
    
    /**
     * Escalate alert to higher level
     */
    private void escalateAlert(SmartAlert alert) {
        
        alert.setEscalationLevel(alert.getEscalationLevel() + 1);
        
        // Increase severity
        if (alert.getEscalationLevel() == 1) {
            alert.setSeverity(Severity.WARNING);
        } else if (alert.getEscalationLevel() == 2) {
            alert.setSeverity(Severity.ERROR);
        } else {
            alert.setSeverity(Severity.CRITICAL);
        }
        
        // Route to higher authority
        if (alert.getEscalationLevel() >= 2) {
            // Route to supervisor
            routeToSupervisors(alert);
        } else {
            // Route to more officers
            routeToOfficers(alert, AlertPriority.HIGH);
        }
        
        alertRepository.save(alert);
        
        // Send escalation notification
        notificationService.sendEscalationNotification(alert);
    }
}
```

### 4. Automated Challan Generation

```java
@Service
public class AutomatedChallanService {
    
    @Autowired
    private ChallanRepository challanRepository;
    
    @Autowired
    private ViolationRepository violationRepository;
    
    @Autowired
    private PricingService pricingService;
    
    /**
     * Auto-generate challan for violation
     */
    public Challan autoGenerateChallan(Violation violation) {
        
        // Check if auto-challan is enabled for this violation type
        if (!isAutoChallanEnabled(violation.getViolationType())) {
            return null;
        }
        
        // Calculate fine amount
        BigDecimal fineAmount = calculateFineAmount(violation);
        
        // Generate challan
        Challan challan = Challan.builder()
            .challanNumber(generateChallanNumber())
            .vendorId(violation.getVendorId())
            .violationId(violation.getId())
            .fineAmount(fineAmount)
            .reason(generateChallanReason(violation))
            .location(formatLocation(violation.getLocationLatitude(), violation.getLocationLongitude()))
            .imageProofUrl(violation.getImageProofUrl())
            .status(ChallanStatus.UNPAID)
            .issuedAt(LocalDateTime.now())
            .dueDate(LocalDateTime.now().plusDays(30))
            .autoGenerated(true)
            .violationData(violation.getViolationData())
            .build();
        
        challan = challanRepository.save(challan);
        
        // Update violation
        violation.setChallanIssued(true);
        violation.setChallanId(challan.getId());
        violationRepository.save(violation);
        
        // Send notification to vendor
        notificationService.sendChallanNotification(challan);
        
        return challan;
    }
    
    private BigDecimal calculateFineAmount(Violation violation) {
        
        // Base fine for violation type
        BigDecimal baseFine = getBaseFine(violation.getViolationType());
        
        // Severity multiplier
        double severityMultiplier = getSeverityMultiplier(violation.getSeverity());
        
        // Repeat offense multiplier
        int repeatCount = violationRepository.countViolationsByVendorInPeriod(
            violation.getVendorId(), 
            violation.getViolationType(),
            LocalDateTime.now().minusMonths(6)
        );
        
        double repeatMultiplier = 1.0 + (repeatCount * 0.2);
        
        // Location-based multiplier
        double locationMultiplier = getLocationMultiplier(
            violation.getLocationLatitude(), 
            violation.getLocationLongitude()
        );
        
        // Calculate final amount
        BigDecimal finalAmount = baseFine
            .multiply(BigDecimal.valueOf(severityMultiplier))
            .multiply(BigDecimal.valueOf(repeatMultiplier))
            .multiply(BigDecimal.valueOf(locationMultiplier));
        
        return finalAmount.setScale(2, RoundingMode.HALF_UP);
    }
    
    private BigDecimal getBaseFine(ViolationType violationType) {
        switch (violationType) {
            case UNAUTHORIZED_VENDOR:
                return new BigDecimal("1000.00");
            case LOCATION:
                return new BigDecimal("500.00");
            case OVERCROWDING:
                return new BigDecimal("750.00");
            case TIME:
                return new BigDecimal("300.00");
            default:
                return new BigDecimal("200.00");
        }
    }
    
    private double getSeverityMultiplier(ViolationSeverity severity) {
        switch (severity) {
            case CRITICAL:
                return 2.0;
            case HIGH:
                return 1.5;
            case MEDIUM:
                return 1.0;
            case LOW:
                return 0.5;
            default:
                return 1.0;
        }
    }
}
```

### 5. Smart Enforcement API Controller

```java
@RestController
@RequestMapping("/api/smart-enforcement")
@Validated
public class SmartEnforcementController {
    
    @Autowired
    private SmartViolationDetectionService violationDetectionService;
    
    @Autowired
    private FakeComplaintDetectionService complaintAnalysisService;
    
    @Autowired
    private AutomatedChallanService challanService;
    
    @Autowired
    private PriorityEnforcementService alertService;
    
    /**
     * Get real-time violation alerts
     */
    @GetMapping("/alerts")
    @PreAuthorize("hasRole('OFFICER') or hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<List<SmartAlert>>> getActiveAlerts(
            @RequestParam(required = false) Long zoneId,
            @RequestParam(required = false) AlertPriority priority,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        
        List<SmartAlert> alerts = alertService.getActiveAlerts(zoneId, priority, page, size);
        
        return ResponseEntity.ok(ApiResponse.success(alerts));
    }
    
    /**
     * Analyze complaint for authenticity
     */
    @PostMapping("/analyze-complaint/{complaintId}")
    @PreAuthorize("hasRole('ADMIN') or hasRole('OFFICER')")
    public ResponseEntity<ApiResponse<ComplaintAnalysisResult>> analyzeComplaint(
            @PathVariable Long complaintId) {
        
        Complaint complaint = complaintRepository.findById(complaintId)
            .orElseThrow(() -> new ResourceNotFoundException("Complaint not found"));
        
        ComplaintAnalysisResult result = complaintAnalysisService.analyzeComplaint(complaint);
        
        return ResponseEntity.ok(ApiResponse.success(result));
    }
    
    /**
     * Trigger manual violation detection
     */
    @PostMapping("/detect-violations")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<String>> triggerViolationDetection() {
        
        violationDetectionService.detectViolations();
        
        return ResponseEntity.ok(ApiResponse.success("Violation detection triggered"));
    }
    
    /**
     * Get violation statistics
     */
    @GetMapping("/statistics")
    @PreAuthorize("hasRole('ADMIN') or hasRole('OFFICER')")
    public ResponseEntity<ApiResponse<ViolationStatistics>> getViolationStatistics(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime startDate,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime endDate) {
        
        ViolationStatistics stats = violationService.getStatistics(startDate, endDate);
        
        return ResponseEntity.ok(ApiResponse.success(stats));
    }
    
    /**
     * Update alert status
     */
    @PutMapping("/alerts/{alertId}/resolve")
    @PreAuthorize("hasRole('OFFICER') or hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<String>> resolveAlert(
            @PathVariable Long alertId,
            @RequestBody @Valid ResolveAlertRequest request) {
        
        alertService.resolveAlert(alertId, request.getResolution(), request.getNotes());
        
        return ResponseEntity.ok(ApiResponse.success("Alert resolved successfully"));
    }
}
```

This smart enforcement system provides automated violation detection, fake complaint filtering, priority-based alerting, and automated challan generation, creating an intelligent and efficient enforcement mechanism for the smart city vendor management platform.
