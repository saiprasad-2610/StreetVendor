# 🚨 Smart Alert System Architecture

## 📡 Intelligent Real-Time Alert Management

### 1. Alert Engine Service

```java
@Service
public class SmartAlertService {
    
    @Autowired
    private AlertRepository alertRepository;
    
    @Autowired
    private NotificationService notificationService;
    
    @Autowired
    private AlertRuleEngine ruleEngine;
    
    @Autowired
    private EscalationService escalationService;
    
    @Autowired
    private KafkaTemplate<String, Object> kafkaTemplate;
    
    /**
     * Process real-time events and generate alerts
     */
    @KafkaListener(topics = "vendor-events", groupId = "alert-service")
    public void processVendorEvent(VendorEvent event) {
        
        try {
            // Apply alert rules
            List<AlertRule> triggeredRules = ruleEngine.evaluateEvent(event);
            
            for (AlertRule rule : triggeredRules) {
                
                // Generate alert
                SmartAlert alert = createAlertFromRule(event, rule);
                
                // Check for deduplication
                if (!isDuplicateAlert(alert)) {
                    
                    // Save alert
                    alert = alertRepository.save(alert);
                    
                    // Process alert
                    processAlert(alert);
                    
                    // Publish alert event
                    publishAlertEvent(alert);
                }
            }
            
        } catch (Exception e) {
            log.error("Failed to process vendor event: {}", event, e);
        }
    }
    
    /**
     * Create alert from triggered rule
     */
    private SmartAlert createAlertFromRule(VendorEvent event, AlertRule rule) {
        
        return SmartAlert.builder()
            .alertId(UUID.randomUUID().toString())
            .alertType(rule.getAlertType())
            .severity(rule.getSeverity())
            .vendorId(event.getVendorId())
            .zoneId(event.getZoneId())
            .alertTitle(generateAlertTitle(rule, event))
            .alertMessage(generateAlertMessage(rule, event))
            .alertData(Map.of(
                "event", event,
                "rule", rule,
                "triggeredAt", LocalDateTime.now()
            ))
            .locationLatitude(event.getLatitude())
            .locationLongitude(event.getLongitude())
            .isResolved(false)
            .autoEscalation(rule.isAutoEscalation())
            .escalationLevel(0)
            .priorityLevel(calculatePriorityLevel(rule, event))
            .ruleId(rule.getId())
            .createdAt(LocalDateTime.now())
            .build();
    }
    
    /**
     * Process alert based on severity and priority
     */
    private void processAlert(SmartAlert alert) {
        
        // Route to appropriate recipients
        routeAlert(alert);
        
        // Schedule escalation if needed
        if (alert.isAutoEscalation()) {
            scheduleEscalation(alert);
        }
        
        // Trigger automated actions
        triggerAutomatedActions(alert);
        
        // Update metrics
        updateAlertMetrics(alert);
    }
    
    /**
     * Route alert to appropriate recipients
     */
    private void routeAlert(SmartAlert alert) {
        
        List<AlertRecipient> recipients = determineRecipients(alert);
        
        for (AlertRecipient recipient : recipients) {
            
            switch (recipient.getType()) {
                case OFFICER:
                    notifyOfficer(recipient.getUserId(), alert);
                    break;
                case ADMIN:
                    notifyAdmin(recipient.getUserId(), alert);
                    break;
                case VENDOR:
                    notifyVendor(recipient.getUserId(), alert);
                    break;
                case SYSTEM:
                    notifySystem(alert);
                    break;
            }
        }
    }
    
    /**
     * Determine alert recipients based on type and severity
     */
    private List<AlertRecipient> determineRecipients(SmartAlert alert) {
        
        List<AlertRecipient> recipients = new ArrayList<>();
        
        switch (alert.getAlertType()) {
            case VENDOR_OUT_OF_ZONE:
                // Notify nearby officers and vendor
                recipients.addAll(getNearbyOfficers(alert));
                recipients.add(createVendorRecipient(alert.getVendorId()));
                break;
                
            case OVERCROWDING:
                // Notify zone manager and nearby officers
                recipients.addAll(getZoneManagers(alert.getZoneId()));
                recipients.addAll(getNearbyOfficers(alert));
                break;
                
            case SUSPICIOUS_ACTIVITY:
                // Notify security team and admin
                recipients.addAll(getSecurityTeam());
                recipients.addAll(getAdmins());
                break;
                
            case SYSTEM_ANOMALY:
                // Notify IT team and admin
                recipients.addAll(getITTeam());
                recipients.addAll(getAdmins());
                break;
                
            case PAYMENT_DEFAULT:
                // Notify finance team and vendor
                recipients.addAll(getFinanceTeam());
                recipients.add(createVendorRecipient(alert.getVendorId()));
                break;
        }
        
        return recipients;
    }
    
    /**
     * Schedule automatic escalation
     */
    private void scheduleEscalation(SmartAlert alert) {
        
        long delayMinutes = getEscalationDelay(alert.getSeverity(), alert.getEscalationLevel());
        
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
        
        // Increase severity if needed
        if (alert.getEscalationLevel() >= 2) {
            alert.setSeverity(Severity.CRITICAL);
        }
        
        // Route to higher authority
        List<AlertRecipient> escalatedRecipients = getEscalatedRecipients(alert);
        
        for (AlertRecipient recipient : escalatedRecipients) {
            notifyEscalatedAlert(recipient, alert);
        }
        
        alertRepository.save(alert);
        
        // Log escalation
        logAlertEscalation(alert);
    }
    
    /**
     * Trigger automated actions based on alert
     */
    private void triggerAutomatedActions(SmartAlert alert) {
        
        switch (alert.getAlertType()) {
            case VENDOR_OUT_OF_ZONE:
                if (alert.getSeverity() == Severity.CRITICAL) {
                    // Auto-issue violation
                    violationService.autoIssueViolation(alert.getVendorId(), alert);
                }
                break;
                
            case OVERCROWDING:
                // Suggest zone redistribution
                zoneOptimizationService.suggestRedistribution(alert.getZoneId());
                break;
                
            case PAYMENT_DEFAULT:
                // Suspend vendor if severe
                if (alert.getSeverity() == Severity.CRITICAL) {
                    vendorService.suspendVendor(alert.getVendorId(), "Payment default");
                }
                break;
        }
    }
}
```

### 2. Alert Rule Engine

```java
@Service
public class AlertRuleEngine {
    
    @Autowired
    private AlertRuleRepository ruleRepository;
    
    @Autowired
    private ConditionEvaluator conditionEvaluator;
    
    /**
     * Evaluate event against all active rules
     */
    public List<AlertRule> evaluateEvent(VendorEvent event) {
        
        List<AlertRule> allRules = ruleRepository.findByIsActiveTrue();
        List<AlertRule> triggeredRules = new ArrayList<>();
        
        for (AlertRule rule : allRules) {
            
            if (isRuleApplicable(rule, event)) {
                
                boolean conditionMet = conditionEvaluator.evaluate(
                    rule.getCondition(), 
                    event
                );
                
                if (conditionMet) {
                    triggeredRules.add(rule);
                }
            }
        }
        
        return triggeredRules;
    }
    
    /**
     * Check if rule is applicable to event
     */
    private boolean isRuleApplicable(AlertRule rule, VendorEvent event) {
        
        // Check event type
        if (!rule.getApplicableEventTypes().contains(event.getEventType())) {
            return false;
        }
        
        // Check time constraints
        if (!isWithinTimeWindow(rule, event)) {
            return false;
        }
        
        // Check vendor category constraints
        if (rule.getApplicableCategories() != null && 
            !rule.getApplicableCategories().isEmpty() &&
            !rule.getApplicableCategories().contains(event.getVendorCategory())) {
            return false;
        }
        
        // Check zone constraints
        if (rule.getApplicableZones() != null && 
            !rule.getApplicableZones().isEmpty() &&
            !rule.getApplicableZones().contains(event.getZoneId())) {
            return false;
        }
        
        return true;
    }
    
    /**
     * Create default alert rules
     */
    @PostConstruct
    public void createDefaultRules() {
        
        // Rule: Vendor out of zone
        AlertRule outOfZoneRule = AlertRule.builder()
            .name("Vendor Out of Zone")
            .description("Alert when vendor is detected outside assigned zone")
            .alertType(AlertType.VENDOR_OUT_OF_ZONE)
            .severity(Severity.HIGH)
            .condition("event.distanceFromZone > 50")
            .applicableEventTypes(List.of(VendorEventType.LOCATION_UPDATE))
            .autoEscalation(true)
            .isActive(true)
            .build();
        
        // Rule: Zone overcrowding
        AlertRule overcrowdingRule = AlertRule.builder()
            .name("Zone Overcrowding")
            .description("Alert when zone vendor count exceeds threshold")
            .alertType(AlertType.OVERCROWDING)
            .severity(Severity.MEDIUM)
            .condition("event.zoneUtilization > 0.8")
            .applicableEventTypes(List.of(VendorEventType.VENDOR_COUNT_UPDATE))
            .autoEscalation(true)
            .isActive(true)
            .build();
        
        // Rule: Suspicious activity pattern
        AlertRule suspiciousActivityRule = AlertRule.builder()
            .name("Suspicious Activity Pattern")
            .description("Alert when unusual vendor behavior is detected")
            .alertType(AlertType.SUSPICIOUS_ACTIVITY)
            .severity(Severity.HIGH)
            .condition("event.anomalyScore > 0.7")
            .applicableEventTypes(List.of(VendorEventType.ANOMALY_DETECTED))
            .autoEscalation(true)
            .isActive(true)
            .build();
        
        // Save default rules
        ruleRepository.saveAll(List.of(outOfZoneRule, overcrowdingRule, suspiciousActivityRule));
    }
}

@Component
public class ConditionEvaluator {
    
    /**
     * Evaluate condition expression against event data
     */
    public boolean evaluate(String condition, VendorEvent event) {
        
        try {
            // Create evaluation context
            Map<String, Object> context = createEvaluationContext(event);
            
            // Parse and evaluate condition
            return evaluateExpression(condition, context);
            
        } catch (Exception e) {
            log.error("Failed to evaluate condition: {}", condition, e);
            return false;
        }
    }
    
    /**
     * Create evaluation context from event
     */
    private Map<String, Object> createEvaluationContext(VendorEvent event) {
        
        Map<String, Object> context = new HashMap<>();
        
        // Event properties
        context.put("event", event);
        context.put("eventType", event.getEventType());
        context.put("vendorId", event.getVendorId());
        context.put("zoneId", event.getZoneId());
        context.put("vendorCategory", event.getVendorCategory());
        context.put("latitude", event.getLatitude());
        context.put("longitude", event.getLongitude());
        context.put("timestamp", event.getTimestamp());
        
        // Calculated properties
        context.put("distanceFromZone", calculateDistanceFromZone(event));
        context.put("zoneUtilization", calculateZoneUtilization(event));
        context.put("anomalyScore", calculateAnomalyScore(event));
        context.put("timeOfDay", LocalTime.now().getHour());
        context.put("isWeekend", isWeekend());
        context.put("isPeakHours", isPeakHours());
        
        return context;
    }
    
    /**
     * Evaluate expression using Spring Expression Language
     */
    private boolean evaluateExpression(String expression, Map<String, Object> context) {
        
        StandardEvaluationContext evalContext = new StandardEvaluationContext();
        evalContext.setVariables(context);
        
        ExpressionParser parser = new SpelExpressionParser();
        Expression expr = parser.parseExpression(expression);
        
        Boolean result = expr.getValue(evalContext, Boolean.class);
        return result != null && result;
    }
    
    private double calculateDistanceFromZone(VendorEvent event) {
        // Implementation to calculate distance from assigned zone
        return 0.0; // Placeholder
    }
    
    private double calculateZoneUtilization(VendorEvent event) {
        // Implementation to calculate zone utilization
        return 0.0; // Placeholder
    }
    
    private double calculateAnomalyScore(VendorEvent event) {
        // Implementation to calculate anomaly score
        return 0.0; // Placeholder
    }
}
```

### 3. Multi-Channel Notification Service

```java
@Service
public class NotificationService {
    
    @Autowired
    private EmailService emailService;
    
    @Autowired
    private SMSService smsService;
    
    @Autowired
    private PushNotificationService pushService;
    
    @Autowired
    private WebSocketNotificationService webSocketService;
    
    @Autowired
    private WhatsAppService whatsappService;
    
    /**
     * Send alert through multiple channels
     */
    public void sendAlert(SmartAlert alert, AlertRecipient recipient) {
        
        List<NotificationChannel> channels = determineChannels(alert, recipient);
        
        for (NotificationChannel channel : channels) {
            
            try {
                sendNotificationThroughChannel(alert, recipient, channel);
            } catch (Exception e) {
                log.error("Failed to send alert via {}: {}", channel, e.getMessage());
            }
        }
    }
    
    /**
     * Determine appropriate notification channels
     */
    private List<NotificationChannel> determineChannels(SmartAlert alert, AlertRecipient recipient) {
        
        List<NotificationChannel> channels = new ArrayList<>();
        
        // Base channel: In-app notification
        channels.add(NotificationChannel.IN_APP);
        
        // Add channels based on severity
        switch (alert.getSeverity()) {
            case CRITICAL:
                channels.addAll(Arrays.asList(
                    NotificationChannel.SMS,
                    NotificationChannel.EMAIL,
                    NotificationChannel.PUSH,
                    NotificationChannel.WHATSAPP
                ));
                break;
                
            case HIGH:
                channels.addAll(Arrays.asList(
                    NotificationChannel.SMS,
                    NotificationChannel.EMAIL,
                    NotificationChannel.PUSH
                ));
                break;
                
            case MEDIUM:
                channels.addAll(Arrays.asList(
                    NotificationChannel.EMAIL,
                    NotificationChannel.PUSH
                ));
                break;
                
            case LOW:
                channels.add(NotificationChannel.EMAIL);
                break;
        }
        
        // Respect recipient preferences
        channels = filterByRecipientPreferences(channels, recipient);
        
        return channels;
    }
    
    /**
     * Send notification through specific channel
     */
    private void sendNotificationThroughChannel(SmartAlert alert, AlertRecipient recipient, 
                                           NotificationChannel channel) {
        
        NotificationMessage message = createNotificationMessage(alert, recipient, channel);
        
        switch (channel) {
            case EMAIL:
                emailService.sendEmail(recipient.getEmail(), message);
                break;
                
            case SMS:
                smsService.sendSMS(recipient.getPhoneNumber(), message);
                break;
                
            case PUSH:
                pushService.sendPushNotification(recipient.getUserId(), message);
                break;
                
            case IN_APP:
                webSocketService.sendInAppNotification(recipient.getUserId(), message);
                break;
                
            case WHATSAPP:
                whatsappService.sendWhatsAppMessage(recipient.getPhoneNumber(), message);
                break;
        }
        
        // Log notification
        logNotification(alert, recipient, channel, message);
    }
    
    /**
     * Create notification message for channel
     */
    private NotificationMessage createNotificationMessage(SmartAlert alert, AlertRecipient recipient, 
                                                  NotificationChannel channel) {
        
        return NotificationMessage.builder()
            .title(alert.getAlertTitle())
            .message(alert.getAlertMessage())
            .severity(alert.getSeverity())
            .priority(alert.getPriorityLevel())
            .alertId(alert.getId())
            .alertType(alert.getAlertType())
            .actionUrl(generateActionUrl(alert))
            .channel(channel)
            .recipientId(recipient.getUserId())
            .createdAt(LocalDateTime.now())
            .expiresAt(calculateExpiryTime(alert))
            .build();
    }
    
    /**
     * Send bulk notifications
     */
    public void sendBulkNotifications(List<BulkNotificationRequest> requests) {
        
        // Group by channel for efficient sending
        Map<NotificationChannel, List<BulkNotificationRequest>> channelGroups = 
            requests.stream()
                .collect(Collectors.groupingBy(BulkNotificationRequest::getChannel));
        
        for (Map.Entry<NotificationChannel, List<BulkNotificationRequest>> entry : channelGroups.entrySet()) {
            
            try {
                sendBulkNotificationsThroughChannel(entry.getKey(), entry.getValue());
            } catch (Exception e) {
                log.error("Failed to send bulk notifications via {}", entry.getKey(), e);
            }
        }
    }
    
    /**
     * Send bulk notifications through specific channel
     */
    private void sendBulkNotificationsThroughChannel(NotificationChannel channel, 
                                               List<BulkNotificationRequest> requests) {
        
        switch (channel) {
            case EMAIL:
                emailService.sendBulkEmails(requests);
                break;
            case SMS:
                smsService.sendBulkSMS(requests);
                break;
            case PUSH:
                pushService.sendBulkPushNotifications(requests);
                break;
            case WHATSAPP:
                whatsappService.sendBulkWhatsAppMessages(requests);
                break;
        }
    }
}
```

### 4. Alert Analytics & Reporting

```java
@Service
public class AlertAnalyticsService {
    
    @Autowired
    private AlertRepository alertRepository;
    
    @Autowired
    private NotificationRepository notificationRepository;
    
    /**
     * Generate comprehensive alert analytics
     */
    public AlertAnalytics generateAlertAnalytics(LocalDate startDate, LocalDate endDate) {
        
        // Get alerts in period
        List<SmartAlert> alerts = alertRepository
            .findByCreatedAtBetween(startDate.atStartOfDay(), endDate.atTime(23, 59, 59));
        
        // Calculate metrics
        AlertMetrics metrics = calculateAlertMetrics(alerts);
        
        // Analyze trends
        AlertTrends trends = analyzeAlertTrends(alerts);
        
        // Performance analysis
        AlertPerformance performance = analyzeAlertPerformance(alerts);
        
        // Recipient analysis
        RecipientAnalysis recipientAnalysis = analyzeRecipients(alerts);
        
        return AlertAnalytics.builder()
            .period(Period.between(startDate, endDate))
            .totalAlerts(alerts.size())
            .metrics(metrics)
            .trends(trends)
            .performance(performance)
            .recipientAnalysis(recipientAnalysis)
            .generatedAt(LocalDateTime.now())
            .build();
    }
    
    /**
     * Calculate alert metrics
     */
    private AlertMetrics calculateAlertMetrics(List<SmartAlert> alerts) {
        
        // Count by severity
        Map<Severity, Long> severityCounts = alerts.stream()
            .collect(Collectors.groupingBy(SmartAlert::getSeverity, Collectors.counting()));
        
        // Count by type
        Map<AlertType, Long> typeCounts = alerts.stream()
            .collect(Collectors.groupingBy(SmartAlert::getAlertType, Collectors.counting()));
        
        // Resolution metrics
        long resolvedCount = alerts.stream()
            .mapToLong(alert -> alert.isResolved() ? 1 : 0)
            .sum();
        
        double resolutionRate = alerts.isEmpty() ? 0.0 : (double) resolvedCount / alerts.size();
        
        // Average resolution time
        double avgResolutionTime = alerts.stream()
            .filter(SmartAlert::isResolved)
            .mapToLong(alert -> Duration.between(alert.getCreatedAt(), alert.getResolvedAt()).toMinutes())
            .average()
            .orElse(0.0);
        
        // Escalation metrics
        long escalatedCount = alerts.stream()
            .mapToLong(alert -> alert.getEscalationLevel() > 0 ? 1 : 0)
            .sum();
        
        double escalationRate = alerts.isEmpty() ? 0.0 : (double) escalatedCount / alerts.size();
        
        return AlertMetrics.builder()
            .severityDistribution(severityCounts)
            .typeDistribution(typeCounts)
            .resolutionRate(resolutionRate)
            .averageResolutionTime(avgResolutionTime)
            .escalationRate(escalationRate)
            .build();
    }
    
    /**
     * Analyze alert trends
     */
    private AlertTrends analyzeAlertTrends(List<SmartAlert> alerts) {
        
        // Group by hour
        Map<Integer, Long> hourlyDistribution = alerts.stream()
            .collect(Collectors.groupingBy(
                alert -> alert.getCreatedAt().getHour(),
                Collectors.counting()
            ));
        
        // Group by day of week
        Map<DayOfWeek, Long> dayOfWeekDistribution = alerts.stream()
            .collect(Collectors.groupingBy(
                alert -> alert.getCreatedAt().getDayOfWeek(),
                Collectors.counting()
            ));
        
        // Calculate trend (last 7 days vs previous 7 days)
        LocalDate now = LocalDate.now();
        List<SmartAlert> last7Days = alerts.stream()
            .filter(alert -> !alert.getCreatedAt().toLocalDate().isBefore(now.minusDays(7)))
            .collect(Collectors.toList());
        
        List<SmartAlert> previous7Days = alerts.stream()
            .filter(alert -> {
                LocalDate date = alert.getCreatedAt().toLocalDate();
                return date.isBefore(now.minusDays(7)) && !date.isBefore(now.minusDays(14));
            })
            .collect(Collectors.toList());
        
        double trendPercentage = previous7Days.isEmpty() ? 0.0 :
            ((double) last7Days.size() - previous7Days.size()) / previous7Days.size() * 100;
        
        return AlertTrends.builder()
            .hourlyDistribution(hourlyDistribution)
            .dayOfWeekDistribution(dayOfWeekDistribution)
            .trendPercentage(trendPercentage)
            .recentAlerts(last7Days.size())
            .previousAlerts(previous7Days.size())
            .build();
    }
    
    /**
     * Analyze alert performance
     */
    private AlertPerformance analyzeAlertPerformance(List<SmartAlert> alerts) {
        
        // Channel performance
        Map<NotificationChannel, ChannelPerformance> channelPerformance = 
            calculateChannelPerformance(alerts);
        
        // Response time analysis
        List<Long> responseTimes = alerts.stream()
            .filter(alert -> alert.getFirstResponseAt() != null)
            .mapToLong(alert -> Duration.between(alert.getCreatedAt(), alert.getFirstResponseAt()).toMinutes())
            .boxed()
            .collect(Collectors.toList());
        
        double avgResponseTime = responseTimes.isEmpty() ? 0.0 :
            responseTimes.stream().mapToLong(Long::longValue).average().orElse(0.0);
        
        // False positive rate
        long falsePositiveCount = alerts.stream()
            .mapToLong(alert -> alert.isFalsePositive() ? 1 : 0)
            .sum();
        
        double falsePositiveRate = alerts.isEmpty() ? 0.0 : (double) falsePositiveCount / alerts.size();
        
        return AlertPerformance.builder()
            .channelPerformance(channelPerformance)
            .averageResponseTime(avgResponseTime)
            .falsePositiveRate(falsePositiveRate)
            .build();
    }
}
```

### 5. Alert API Controller

```java
@RestController
@RequestMapping("/api/alerts")
@Validated
public class AlertController {
    
    @Autowired
    private SmartAlertService alertService;
    
    @Autowired
    private AlertAnalyticsService analyticsService;
    
    /**
     * Get active alerts
     */
    @GetMapping("/active")
    @PreAuthorize("hasRole('ADMIN') or hasRole('OFFICER')")
    public ResponseEntity<ApiResponse<List<SmartAlert>>> getActiveAlerts(
            @RequestParam(required = false) AlertType alertType,
            @RequestParam(required = false) Severity severity,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        
        List<SmartAlert> alerts = alertService.getActiveAlerts(alertType, severity, page, size);
        
        return ResponseEntity.ok(ApiResponse.success(alerts));
    }
    
    /**
     * Resolve alert
     */
    @PutMapping("/{alertId}/resolve")
    @PreAuthorize("hasRole('ADMIN') or hasRole('OFFICER')")
    public ResponseEntity<ApiResponse<String>> resolveAlert(
            @PathVariable String alertId,
            @RequestBody @Valid ResolveAlertRequest request) {
        
        alertService.resolveAlert(alertId, request.getResolution(), request.getNotes());
        
        return ResponseEntity.ok(ApiResponse.success("Alert resolved successfully"));
    }
    
    /**
     * Get alert analytics
     */
    @GetMapping("/analytics")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<AlertAnalytics>> getAlertAnalytics(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate) {
        
        AlertAnalytics analytics = analyticsService.generateAlertAnalytics(startDate, endDate);
        
        return ResponseEntity.ok(ApiResponse.success(analytics));
    }
    
    /**
     * Create custom alert rule
     */
    @PostMapping("/rules")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<AlertRule>> createAlertRule(
            @RequestBody @Valid AlertRuleRequest request) {
        
        AlertRule rule = alertService.createAlertRule(request);
        
        return ResponseEntity.status(HttpStatus.CREATED)
            .body(ApiResponse.success(rule));
    }
    
    /**
     * Test alert rule
     */
    @PostMapping("/rules/{ruleId}/test")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<RuleTestResult>> testAlertRule(
            @PathVariable Long ruleId,
            @RequestBody @RequestBody VendorEvent testEvent) {
        
        RuleTestResult result = alertService.testAlertRule(ruleId, testEvent);
        
        return ResponseEntity.ok(ApiResponse.success(result));
    }
}
```

This smart alert system provides intelligent, multi-channel alert management with rule-based automation, escalation workflows, and comprehensive analytics - ensuring timely and appropriate responses to all critical events in the smart city vendor management platform.
