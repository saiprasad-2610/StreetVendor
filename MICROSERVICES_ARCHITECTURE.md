# ⚙️ Scalable Microservices Architecture

## 🏗️ Cloud-Native Distributed System Design

### 1. API Gateway Service

```java
// Gateway Service Configuration
@SpringBootApplication
@EnableEurekaClient
@EnableZuulProxy
public class ApiGatewayApplication {
    
    public static void main(String[] args) {
        SpringApplication.run(ApiGatewayApplication.class, args);
    }
    
    @Bean
    public CorsFilter corsFilter() {
        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        CorsConfiguration config = new CorsConfiguration();
        config.setAllowCredentials(true);
        config.addAllowedOriginPattern("*");
        config.addAllowedHeader("*");
        config.addAllowedMethod("*");
        source.registerCorsConfiguration("/**", config);
        return new CorsFilter(source);
    }
}

@Configuration
public class GatewayConfig {
    
    @Bean
    public PreFilter preFilter() {
        return new PreFilter();
    }
    
    @Bean
    public PostFilter postFilter() {
        return new PostFilter();
    }
    
    @Bean
    public ErrorFilter errorFilter() {
        return new ErrorFilter();
    }
    
    @Bean
    public RateLimitFilter rateLimitFilter() {
        return new RateLimitFilter();
    }
}

@Component
public class PreFilter extends ZuulFilter {
    
    @Autowired
    private JwtTokenUtil jwtTokenUtil;
    
    @Autowired
    private SecurityAuditService auditService;
    
    @Override
    public String filterType() {
        return "pre";
    }
    
    @Override
    public int filterOrder() {
        return 1;
    }
    
    @Override
    public boolean shouldFilter() {
        return true;
    }
    
    @Override
    public Object run() throws ZuulException {
        
        RequestContext ctx = RequestContext.getCurrentContext();
        HttpServletRequest request = ctx.getRequest();
        
        // Log incoming request
        String requestId = UUID.randomUUID().toString();
        ctx.set("requestId", requestId);
        
        auditService.logIncomingRequest(requestId, request);
        
        // Validate JWT token for protected routes
        String path = request.getRequestURI();
        if (isProtectedRoute(path)) {
            String token = extractToken(request);
            
            if (token == null || !jwtTokenUtil.validateToken(token)) {
                ctx.setResponseStatusCode(HttpStatus.UNAUTHORIZED.value());
                ctx.setSendZuulResponse(false);
                return null;
            }
            
            // Add user context to headers
            ctx.addZuulRequestHeader("X-User-ID", jwtTokenUtil.getUserIdFromToken(token));
            ctx.addZuulRequestHeader("X-User-Role", jwtTokenUtil.getRoleFromToken(token));
        }
        
        // Add correlation ID
        ctx.addZuulRequestHeader("X-Correlation-ID", requestId);
        
        return null;
    }
    
    private boolean isProtectedRoute(String path) {
        return !path.startsWith("/api/public/") && 
               !path.equals("/api/auth/login") && 
               !path.equals("/api/auth/register");
    }
}

// application.yml
server:
  port: 8080

spring:
  application:
    name: api-gateway
  cloud:
    consul:
      host: 10.62.25.31
      port: 8500
      discovery:
        service-name: ${spring.application.name}
        health-check-interval: 15s
        health-check-path: /actuator/health
    loadbalancer:
      ribbon:
        enabled: false

zuul:
  routes:
    auth-service:
      path: /api/auth/**
      service-id: auth-service
      strip-prefix: true
      sensitive-headers: Cookie,Set-Cookie
    
    vendor-service:
      path: /api/vendors/**
      service-id: vendor-service
      strip-prefix: true
    
    location-service:
      path: /api/locations/**
      service-id: location-service
      strip-prefix: true
    
    violation-service:
      path: /api/violations/**
      service-id: violation-service
      strip-prefix: true
    
    payment-service:
      path: /api/payments/**
      service-id: payment-service
      strip-prefix: true
    
    analytics-service:
      path: /api/analytics/**
      service-id: analytics-service
      strip-prefix: true
    
    notification-service:
      path: /api/notifications/**
      service-id: notification-service
      strip-prefix: true
    
    ai-service:
      path: /api/ai/**
      service-id: ai-service
      strip-prefix: true

management:
  endpoints:
    web:
      exposure:
        include: health,info,metrics,prometheus
  endpoint:
    health:
      show-details: always

logging:
  level:
    com.netflix.zuul: DEBUG
    org.springframework.cloud.gateway: DEBUG
```

### 2. Service Discovery & Configuration

```java
// Service Registry Configuration
@SpringBootApplication
@EnableEurekaServer
public class ServiceRegistryApplication {
    
    public static void main(String[] args) {
        SpringApplication.run(ServiceRegistryApplication.class, args);
    }
}

// application.yml
server:
  port: 8761

spring:
  application:
    name: service-registry

eureka:
  client:
    register-with-eureka: false
    fetch-registry: false
    service-url:
      defaultZone: http://10.62.25.31:8761/eureka/
  server:
    enable-self-preservation: false
    eviction-interval-timer-in-ms: 5000
    renewal-percent-threshold: 0.85
    response-cache-update-interval-ms: 30000

management:
  endpoints:
    web:
      exposure:
        include: "*"

// Configuration Server
@SpringBootApplication
@EnableConfigServer
public class ConfigServerApplication {
    
    public static void main(String[] args) {
        SpringApplication.run(ConfigServerApplication.class, args);
    }
}

// application.yml
server:
  port: 8888

spring:
  application:
    name: config-server
  cloud:
    config:
      server:
        git:
          uri: https://github.com/solapur-municipal/svms-config
          search-paths: '{application}'
          clone-on-start: true
          default-label: main
        health:
          repositories:
            svms-config:
              label: main
              name: svms-config
              profiles: development,production

management:
  endpoints:
    web:
      exposure:
        include: health,info,env,refresh
```

### 3. Vendor Microservice

```java
// Vendor Service Application
@SpringBootApplication
@EnableEurekaClient
@EnableJpaRepositories
@EnableTransactionManagement
public class VendorServiceApplication {
    
    public static void main(String[] args) {
        SpringApplication.run(VendorServiceApplication.class, args);
    }
    
    @Bean
    public ModelMapper modelMapper() {
        ModelMapper modelMapper = new ModelMapper();
        modelMapper.getConfiguration().setMatchingStrategy(MatchingStrategies.STRICT);
        return modelMapper;
    }
}

// Vendor Service Controller
@RestController
@RequestMapping("/api/vendors")
@Validated
public class VendorServiceController {
    
    @Autowired
    private VendorService vendorService;
    
    @Autowired
    private LocationServiceClient locationServiceClient;
    
    @Autowired
    private NotificationServiceClient notificationServiceClient;
    
    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<VendorDTO>> createVendor(
            @Valid @RequestBody VendorRequest request,
            @RequestHeader("X-User-ID") Long userId) {
        
        VendorDTO vendor = vendorService.createVendor(request, userId);
        
        // Notify other services
        notificationServiceClient.sendVendorCreatedNotification(vendor);
        
        return ResponseEntity.status(HttpStatus.CREATED)
            .body(ApiResponse.success(vendor));
    }
    
    @GetMapping("/{vendorId}")
    @PreAuthorize("hasAnyRole('ADMIN', 'OFFICER')")
    public ResponseEntity<ApiResponse<VendorDTO>> getVendor(
            @PathVariable Long vendorId) {
        
        VendorDTO vendor = vendorService.getVendorById(vendorId);
        
        // Enrich with location data
        if (vendor.getLocationId() != null) {
            LocationDTO location = locationServiceClient.getLocationById(vendor.getLocationId());
            vendor.setLocation(location);
        }
        
        return ResponseEntity.ok(ApiResponse.success(vendor));
    }
    
    @GetMapping("/search")
    @PreAuthorize("hasAnyRole('ADMIN', 'OFFICER', 'PUBLIC')")
    public ResponseEntity<ApiResponse<List<VendorDTO>>> searchVendors(
            @RequestParam(required = false) String name,
            @RequestParam(required = false) VendorCategory category,
            @RequestParam(required = false) VendorStatus status,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        
        VendorSearchCriteria criteria = VendorSearchCriteria.builder()
            .name(name)
            .category(category)
            .status(status)
            .page(page)
            .size(size)
            .build();
        
        Page<VendorDTO> vendors = vendorService.searchVendors(criteria);
        
        return ResponseEntity.ok(ApiResponse.success(vendors.getContent()));
    }
}

// Service Integration
@FeignClient(name = "location-service", configuration = FeignConfig.class)
public interface LocationServiceClient {
    
    @GetMapping("/api/locations/{locationId}")
    LocationDTO getLocationById(@PathVariable Long locationId);
    
    @GetMapping("/api/locations/vendor/{vendorId}")
    LocationDTO getVendorLocation(@PathVariable Long vendorId);
    
    @PostMapping("/api/locations")
    LocationDTO createLocation(@RequestBody LocationRequest request);
}

@FeignClient(name = "notification-service", configuration = FeignConfig.class)
public interface NotificationServiceClient {
    
    @PostMapping("/api/notifications/vendor-created")
    void sendVendorCreatedNotification(@RequestBody VendorDTO vendor);
    
    @PostMapping("/api/notifications/vendor-updated")
    void sendVendorUpdatedNotification(@RequestBody VendorDTO vendor);
    
    @PostMapping("/api/notifications/bulk")
    void sendBulkNotifications(@RequestBody List<NotificationRequest> notifications);
}

@Configuration
public class FeignConfig {
    
    @Bean
    public RequestInterceptor requestInterceptor() {
        return new RequestInterceptor() {
            @Override
            public void apply(RequestTemplate template) {
                
                // Add correlation ID
                String correlationId = MDC.get("correlationId");
                if (correlationId != null) {
                    template.header("X-Correlation-ID", correlationId);
                }
                
                // Add authentication
                String token = SecurityContextHolder.getContext()
                    .getAuthentication().getCredentials().toString();
                template.header("Authorization", "Bearer " + token);
            }
        };
    }
    
    @Bean
    public Logger.Level feignLoggerLevel() {
        return Logger.Level.FULL;
    }
}
```

### 4. Event-Driven Architecture

```java
// Event Publisher Configuration
@Configuration
@EnableKafka
public class KafkaConfig {
    
    @Value("${spring.kafka.bootstrap-servers}")
    private String bootstrapServers;
    
    @Bean
    public ProducerFactory<String, Object> producerFactory() {
        Map<String, Object> configProps = new HashMap<>();
        configProps.put(ProducerConfig.BOOTSTRAP_SERVERS_CONFIG, bootstrapServers);
        configProps.put(ProducerConfig.KEY_SERIALIZER_CLASS_CONFIG, StringSerializer.class);
        configProps.put(ProducerConfig.VALUE_SERIALIZER_CLASS_CONFIG, JsonSerializer.class);
        configProps.put(ProducerConfig.ACKS_CONFIG, "all");
        configProps.put(ProducerConfig.RETRIES_CONFIG, 3);
        configProps.put(ProducerConfig.ENABLE_IDEMPOTENCE_CONFIG, true);
        
        return new DefaultKafkaProducerFactory<>(configProps);
    }
    
    @Bean
    public KafkaTemplate<String, Object> kafkaTemplate() {
        return new KafkaTemplate<>(producerFactory());
    }
    
    @Bean
    public ConsumerFactory<String, Object> consumerFactory() {
        Map<String, Object> configProps = new HashMap<>();
        configProps.put(ConsumerConfig.BOOTSTRAP_SERVERS_CONFIG, bootstrapServers);
        configProps.put(ConsumerConfig.GROUP_ID_CONFIG, "svms-group");
        configProps.put(ConsumerConfig.KEY_DESERIALIZER_CLASS_CONFIG, StringDeserializer.class);
        configProps.put(ConsumerConfig.VALUE_DESERIALIZER_CLASS_CONFIG, JsonDeserializer.class);
        configProps.put(ConsumerConfig.AUTO_OFFSET_RESET_CONFIG, "earliest");
        configProps.put(ConsumerConfig.ENABLE_AUTO_COMMIT_CONFIG, false);
        
        return new DefaultKafkaConsumerFactory<>(configProps);
    }
    
    @Bean
    public ConcurrentKafkaListenerContainerFactory<String, Object> kafkaListenerContainerFactory() {
        ConcurrentKafkaListenerContainerFactory<String, Object> factory = 
            new ConcurrentKafkaListenerContainerFactory<>();
        factory.setConsumerFactory(consumerFactory());
        factory.getContainerProperties().setAckMode(ContainerProperties.AckMode.MANUAL_IMMEDIATE);
        return factory;
    }
}

// Event Publisher Service
@Service
public class EventPublisherService {
    
    @Autowired
    private KafkaTemplate<String, Object> kafkaTemplate;
    
    @Autowired
    private EventRepository eventRepository;
    
    public void publishVendorEvent(VendorEvent event) {
        
        try {
            // Save to event store
            EventEntity eventEntity = EventEntity.builder()
                .eventId(event.getEventId())
                .eventType(event.getEventType().name())
                .aggregateId(event.getVendorId())
                .aggregateType("VENDOR")
                .eventData(JsonUtils.toJson(event))
                .eventVersion("1.0")
                .createdAt(LocalDateTime.now())
                .build();
            
            eventRepository.save(eventEntity);
            
            // Publish to Kafka
            kafkaTemplate.send("vendor-events", event.getVendorId().toString(), event);
            
            log.info("Published vendor event: {}", event.getEventType());
            
        } catch (Exception e) {
            log.error("Failed to publish vendor event", e);
            throw new EventPublishingException("Failed to publish event", e);
        }
    }
    
    public void publishLocationEvent(LocationEvent event) {
        
        try {
            EventEntity eventEntity = EventEntity.builder()
                .eventId(event.getEventId())
                .eventType(event.getEventType().name())
                .aggregateId(event.getLocationId())
                .aggregateType("LOCATION")
                .eventData(JsonUtils.toJson(event))
                .eventVersion("1.0")
                .createdAt(LocalDateTime.now())
                .build();
            
            eventRepository.save(eventEntity);
            
            kafkaTemplate.send("location-events", event.getLocationId().toString(), event);
            
        } catch (Exception e) {
            log.error("Failed to publish location event", e);
            throw new EventPublishingException("Failed to publish event", e);
        }
    }
}

// Event Handler Service
@Service
public class EventHandlerService {
    
    @Autowired
    private VendorService vendorService;
    
    @Autowired
    private LocationService locationService;
    
    @Autowired
    private NotificationService notificationService;
    
    @KafkaListener(topics = "vendor-events", groupId = "vendor-service")
    public void handleVendorEvent(VendorEvent event, Acknowledgment acknowledgment) {
        
        try {
            log.info("Handling vendor event: {} for vendor: {}", 
                event.getEventType(), event.getVendorId());
            
            switch (event.getEventType()) {
                case VENDOR_CREATED:
                    handleVendorCreated(event);
                    break;
                case VENDOR_UPDATED:
                    handleVendorUpdated(event);
                    break;
                case VENDOR_APPROVED:
                    handleVendorApproved(event);
                    break;
                case VENDOR_SUSPENDED:
                    handleVendorSuspended(event);
                    break;
                default:
                    log.warn("Unknown vendor event type: {}", event.getEventType());
            }
            
            acknowledgment.acknowledge();
            
        } catch (Exception e) {
            log.error("Failed to handle vendor event", e);
            // Don't acknowledge - will be retried
        }
    }
    
    @KafkaListener(topics = "location-events", groupId = "location-service")
    public void handleLocationEvent(LocationEvent event, Acknowledgment acknowledgment) {
        
        try {
            log.info("Handling location event: {} for location: {}", 
                event.getEventType(), event.getLocationId());
            
            switch (event.getEventType()) {
                case LOCATION_UPDATED:
                    handleLocationUpdated(event);
                    break;
                case ZONE_BOUNDARY_CHANGED:
                    handleZoneBoundaryChanged(event);
                    break;
                default:
                    log.warn("Unknown location event type: {}", event.getEventType());
            }
            
            acknowledgment.acknowledge();
            
        } catch (Exception e) {
            log.error("Failed to handle location event", e);
        }
    }
    
    private void handleVendorCreated(VendorEvent event) {
        
        // Send welcome notification
        notificationService.sendWelcomeNotification(event.getVendorId());
        
        // Initialize vendor analytics
        analyticsService.initializeVendorAnalytics(event.getVendorId());
        
        // Create default location if needed
        if (event.getLocationData() != null) {
            locationService.createVendorLocation(event.getVendorId(), event.getLocationData());
        }
    }
    
    private void handleVendorApproved(VendorEvent event) {
        
        // Generate QR code
        qrCodeService.generateVendorQRCode(event.getVendorId());
        
        // Send approval notification
        notificationService.sendApprovalNotification(event.getVendorId());
        
        // Update analytics
        analyticsService.recordVendorApproval(event.getVendorId());
    }
}
```

### 5. Distributed Tracing & Monitoring

```java
// Tracing Configuration
@Configuration
public class TracingConfig {
    
    @Bean
    public Sender sender() {
        return OkHttpSender.create("http://10.62.25.31:9411/api/v2/spans");
    }
    
    @Bean
    public AsyncReporter<Span> spanReporter() {
        return AsyncReporter.create(sender());
    }
    
    @Bean
    public Tracing tracing() {
        return Tracing.newBuilder()
            .localServiceName("vendor-service")
            .spanReporter(spanReporter())
            .traceId128Bit(true)
            .sampler(Sampler.ALWAYS_SAMPLE)
            .build();
    }
    
    @Bean
    public HttpTracing httpTracing(Tracing tracing) {
        return HttpTracing.create(tracing);
    }
}

// Metrics Configuration
@Configuration
public class MetricsConfig {
    
    @Bean
    public MeterRegistryCustomizer<MeterRegistry> metricsCommonTags() {
        return registry -> registry.config().commonTags(
            "application", "vendor-service",
            "region", System.getenv().getOrDefault("REGION", "default"),
            "environment", System.getenv().getOrDefault("ENVIRONMENT", "development")
        );
    }
    
    @Bean
    public TimedAspect timedAspect(MeterRegistry registry) {
        return new TimedAspect(registry);
    }
    
    @Bean
    public CountedAspect countedAspect(MeterRegistry registry) {
        return new CountedAspect(registry);
    }
}

// Health Check Configuration
@Component
public class VendorServiceHealthIndicator implements HealthIndicator {
    
    @Autowired
    private VendorRepository vendorRepository;
    
    @Autowired
    private DatabaseHealthChecker dbHealthChecker;
    
    @Override
    public Health health() {
        
        try {
            // Check database connectivity
            boolean dbHealthy = dbHealthChecker.isDatabaseHealthy();
            
            // Check vendor count
            long vendorCount = vendorRepository.count();
            
            // Check service dependencies
            boolean dependenciesHealthy = checkDependencies();
            
            if (dbHealthy && dependenciesHealthy) {
                return Health.up()
                    .withDetail("database", "UP")
                    .withDetail("vendorCount", vendorCount)
                    .withDetail("dependencies", "UP")
                    .withDetail("timestamp", LocalDateTime.now())
                    .build();
            } else {
                return Health.down()
                    .withDetail("database", dbHealthy ? "UP" : "DOWN")
                    .withDetail("dependencies", dependenciesHealthy ? "UP" : "DOWN")
                    .withDetail("timestamp", LocalDateTime.now())
                    .build();
            }
            
        } catch (Exception e) {
            return Health.down()
                .withDetail("error", e.getMessage())
                .withDetail("timestamp", LocalDateTime.now())
                .build();
        }
    }
    
    private boolean checkDependencies() {
        // Check connectivity to other microservices
        return locationServiceClient.healthCheck() && 
               notificationServiceClient.healthCheck();
    }
}
```

### 6. Container Configuration

```dockerfile
# Dockerfile for Vendor Service
FROM openjdk:17-jdk-slim

# Install required packages
RUN apt-get update && apt-get install -y \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy jar file
COPY target/vendor-service-*.jar app.jar

# Create non-root user
RUN groupadd -r vendor && useradd -r -g vendor vendor

# Change ownership
RUN chown -R vendor:vendor /app

# Switch to non-root user
USER vendor

# Expose port
EXPOSE 8081

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=60s --retries=3 \
    CMD curl -f http://10.62.25.31:8081/actuator/health || exit 1

# JVM options
ENV JAVA_OPTS="-Xmx512m -Xms256m -XX:+UseG1GC -XX:+UseContainerSupport -XX:MaxRAMPercentage=75.0"

# Run application
ENTRYPOINT ["sh", "-c", "java $JAVA_OPTS -jar app.jar"]
```

```yaml
# docker-compose.yml for microservices
version: '3.8'

services:
  # Service Registry
  service-registry:
    build: ./service-registry
    ports:
      - "8761:8761"
    environment:
      - SPRING_PROFILES_ACTIVE=docker
    healthcheck:
      test: ["CMD", "curl", "-f", "http://10.62.25.31:8761/actuator/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  # API Gateway
  api-gateway:
    build: ./api-gateway
    ports:
      - "8080:8080"
    depends_on:
      - service-registry
    environment:
      - SPRING_PROFILES_ACTIVE=docker
      - EUREKA_CLIENT_SERVICE_URL_DEFAULTZONE=http://service-registry:8761/eureka
    healthcheck:
      test: ["CMD", "curl", "-f", "http://10.62.25.31:8080/actuator/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  # Vendor Service
  vendor-service:
    build: ./vendor-service
    ports:
      - "8081:8081"
    depends_on:
      - service-registry
      - mysql
      - kafka
    environment:
      - SPRING_PROFILES_ACTIVE=docker
      - EUREKA_CLIENT_SERVICE_URL_DEFAULTZONE=http://service-registry:8761/eureka
      - SPRING_DATASOURCE_URL=jdbc:mysql://mysql:3306/svms_vendor
      - SPRING_KAFKA_BOOTSTRAP_SERVERS=kafka:9092
    healthcheck:
      test: ["CMD", "curl", "-f", "http://10.62.25.31:8081/actuator/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  # Location Service
  location-service:
    build: ./location-service
    ports:
      - "8082:8082"
    depends_on:
      - service-registry
      - mysql
      - kafka
    environment:
      - SPRING_PROFILES_ACTIVE=docker
      - EUREKA_CLIENT_SERVICE_URL_DEFAULTZONE=http://service-registry:8761/eureka
      - SPRING_DATASOURCE_URL=jdbc:mysql://mysql:3306/svms_location
      - SPRING_KAFKA_BOOTSTRAP_SERVERS=kafka:9092

  # Notification Service
  notification-service:
    build: ./notification-service
    ports:
      - "8083:8083"
    depends_on:
      - service-registry
      - redis
      - kafka
    environment:
      - SPRING_PROFILES_ACTIVE=docker
      - EUREKA_CLIENT_SERVICE_URL_DEFAULTZONE=http://service-registry:8761/eureka
      - SPRING_REDIS_HOST=redis
      - SPRING_KAFKA_BOOTSTRAP_SERVERS=kafka:9092

  # Infrastructure Services
  mysql:
    image: mysql:8.0
    ports:
      - "3306:3306"
    environment:
      - MYSQL_ROOT_PASSWORD=rootpassword
      - MYSQL_DATABASE=svms
    volumes:
      - mysql_data:/var/lib/mysql
    healthcheck:
      test: ["CMD", "mysqladmin", "ping", "-h", "10.62.25.31"]
      interval: 30s
      timeout: 10s
      retries: 3

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 30s
      timeout: 10s
      retries: 3

  zookeeper:
    image: confluentinc/cp-zookeeper:latest
    ports:
      - "2181:2181"
    environment:
      ZOOKEEPER_CLIENT_PORT: 2181
      ZOOKEEPER_TICK_TIME: 2000

  kafka:
    image: confluentinc/cp-kafka:latest
    ports:
      - "9092:9092"
    depends_on:
      - zookeeper
    environment:
      KAFKA_BROKER_ID: 1
      KAFKA_ZOOKEEPER_CONNECT: zookeeper:2181
      KAFKA_ADVERTISED_LISTENERS: PLAINTEXT://10.62.25.31:9092
      KAFKA_OFFSETS_TOPIC_REPLICATION_FACTOR: 1
    healthcheck:
      test: ["CMD", "kafka-broker-api-versions", "--bootstrap-server", "10.62.25.31:9092"]
      interval: 30s
      timeout: 10s
      retries: 3

volumes:
  mysql_data:
  redis_data:

networks:
  default:
    driver: bridge
```

This microservices architecture provides a scalable, resilient, and maintainable system that can handle the complex requirements of a smart city vendor management platform while supporting future growth and expansion.
