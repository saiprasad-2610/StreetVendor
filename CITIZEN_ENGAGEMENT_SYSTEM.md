# 📱 Citizen Engagement System Architecture

## 🌟 Community-Powered Smart City Platform

### 1. Citizen Mobile App Service

```java
@Service
public class CitizenEngagementService {
    
    @Autowired
    private UserRepository userRepository;
    
    @Autowired
    private VendorRepository vendorRepository;
    
    @Autowired
    private RatingRepository ratingRepository;
    
    @Autowired
    private CitizenRewardsService rewardsService;
    
    @Autowired
    private NotificationService notificationService;
    
    /**
     * Scan QR code and get vendor information
     */
    public VendorScanResult scanVendorQR(String qrData, LocationData currentLocation) {
        
        try {
            // Parse QR data
            QRScanData scanData = parseQRData(qrData);
            
            // Get vendor details
            Vendor vendor = vendorRepository.findByVendorId(scanData.getVendorId())
                .orElseThrow(() -> new ResourceNotFoundException("Vendor not found"));
            
            // Verify vendor location
            LocationVerificationResult locationResult = verifyVendorLocation(
                vendor, currentLocation);
            
            // Get vendor ratings
            List<Rating> ratings = ratingRepository
                .findByVendorIdOrderByCreatedAtDesc(vendor.getId(), PageRequest.of(0, 10));
            
            // Calculate average ratings
            VendorRatingSummary ratingSummary = calculateRatingSummary(ratings);
            
            // Log scan for analytics
            logVendorScan(vendor.getId(), currentLocation, locationResult);
            
            return VendorScanResult.builder()
                .vendorId(vendor.getVendorId())
                .vendorName(vendor.getName())
                .category(vendor.getCategory())
                .status(vendor.getStatus())
                .locationValid(locationResult.isValid())
                .locationDistance(locationResult.getDistance())
                .averageRating(ratingSummary.getAverageRating())
                .totalRatings(ratingSummary.getTotalRatings())
                .ratingBreakdown(ratingSummary.getBreakdown())
                .faceImageUrl(vendor.getFaceImageUrl())
                .zoneName(vendor.getLocation() != null ? vendor.getLocation().getZone().getName() : null)
                .complianceScore(vendor.getComplianceScore())
                .scanTime(LocalDateTime.now())
                .build();
                
        } catch (Exception e) {
            return VendorScanResult.builder()
                .success(false)
                .message("Invalid QR code or vendor not found")
                .build();
        }
    }
    
    /**
     * Report violation with AI-powered validation
     */
    public ViolationReportResult reportViolation(ViolationReportRequest request, Long citizenId) {
        
        // Validate report
        ViolationReportValidation validation = validateViolationReport(request);
        
        if (!validation.isValid()) {
            return ViolationReportResult.builder()
                .success(false)
                .message(validation.getErrorMessage())
                .build();
        }
        
        // Check for duplicate reports
        boolean isDuplicate = isDuplicateReport(request, citizenId);
        if (isDuplicate) {
            return ViolationReportResult.builder()
                .success(false)
                .message("Similar report already submitted")
                .build();
        }
        
        // Create violation record
        Violation violation = Violation.builder()
            .vendorId(request.getVendorId())
            .reportedBy(citizenId)
            .violationType(request.getViolationType())
            .description(request.getDescription())
            .locationLatitude(request.getLocation().getLatitude())
            .locationLongitude(request.getLocation().getLongitude())
            .imageProofUrl(request.getImageProofUrl())
            .validationStatus(ValidationStatus.PENDING)
            .aiDetected(false)
            .priorityLevel(calculateReportPriority(request))
            .createdAt(LocalDateTime.now())
            .build();
        
        violation = violationRepository.save(violation);
        
        // Analyze report authenticity
        ComplaintAnalysisResult authenticityAnalysis = fakeComplaintService
            .analyzeComplaint(convertToComplaint(violation));
        
        // Update violation with analysis
        violation.setAuthenticityScore(authenticityAnalysis.getAuthenticityScore());
        violation.setIsAuthentic(authenticityAnalysis.isAuthentic());
        violationRepository.save(violation);
        
        // Award points for valid report
        if (authenticityAnalysis.isAuthentic()) {
            rewardsService.awardReportPoints(citizenId, violation.getId());
        }
        
        // Send confirmation
        notificationService.sendReportConfirmation(citizenId, violation);
        
        return ViolationReportResult.builder()
            .success(true)
            .violationId(violation.getId())
            .authenticityScore(authenticityAnalysis.getAuthenticityScore())
            .message("Violation report submitted successfully")
            .build();
    }
    
    /**
     * Rate vendor with multi-dimensional feedback
     */
    public RatingResult rateVendor(VendorRatingRequest request, Long citizenId) {
        
        // Validate rating
        if (!isValidRating(request)) {
            return RatingResult.builder()
                .success(false)
                .message("Invalid rating data")
                .build();
        }
        
        // Check if citizen has already rated this vendor recently
        boolean recentlyRated = ratingRepository
            .existsByUserIdAndVendorIdAndCreatedAtAfter(
                citizenId, 
                request.getVendorId(), 
                LocalDateTime.now().minusDays(7)
            );
        
        if (recentlyRated) {
            return RatingResult.builder()
                .success(false)
                .message("You can only rate each vendor once per week")
                .build();
        }
        
        // Create rating
        Rating rating = Rating.builder()
            .vendorId(request.getVendorId())
            .userId(citizenId)
            .cleanliness(request.getCleanliness())
            .pricing(request.getPricing())
            .behavior(request.getBehavior())
            .quality(request.getQuality())
            .average(calculateAverageRating(request))
            .feedback(request.getFeedback())
            .mediaUrls(request.getMediaUrls())
            .verifiedPurchase(request.isVerifiedPurchase())
            .helpfulCount(0)
            .createdAt(LocalDateTime.now())
            .build();
        
        rating = ratingRepository.save(rating);
        
        // Update vendor's average rating
        updateVendorAverageRating(request.getVendorId());
        
        // Award rating points
        rewardsService.awardRatingPoints(citizenId, rating.getId());
        
        // Send notification to vendor
        notificationService.sendNewRatingNotification(request.getVendorId(), rating);
        
        return RatingResult.builder()
            .success(true)
            .ratingId(rating.getId())
            .message("Rating submitted successfully")
            .pointsEarned(rewardsService.getRatingPoints())
            .build();
    }
    
    /**
     * Find nearby legal vendors
     */
    public List<NearbyVendor> findNearbyVendors(LocationData location, double radiusKm, 
            List<VendorCategory> categories) {
        
        // Get vendors within radius
        List<Vendor> nearbyVendors = vendorRepository
            .findNearbyVendors(location.getLatitude(), location.getLongitude(), radiusKm);
        
        // Filter by categories if specified
        if (categories != null && !categories.isEmpty()) {
            nearbyVendors = nearbyVendors.stream()
                .filter(v -> categories.contains(v.getCategory()))
                .collect(Collectors.toList());
        }
        
        // Filter to only approved and active vendors
        nearbyVendors = nearbyVendors.stream()
            .filter(v -> v.getStatus() == VendorStatus.APPROVED)
            .collect(Collectors.toList());
        
        // Convert to response format
        return nearbyVendors.stream()
            .map(vendor -> {
                double distance = calculateDistance(
                    location.getLatitude(), location.getLongitude(),
                    vendor.getLocation().getLatitude(), vendor.getLocation().getLongitude()
                );
                
                VendorRatingSummary ratingSummary = getVendorRatingSummary(vendor.getId());
                
                return NearbyVendor.builder()
                    .vendorId(vendor.getVendorId())
                    .vendorName(vendor.getName())
                    .category(vendor.getCategory())
                    .distance(distance)
                    .averageRating(ratingSummary.getAverageRating())
                    .totalRatings(ratingSummary.getTotalRatings())
                    .location(vendor.getLocation().getAddress())
                    .zoneName(vendor.getLocation().getZone().getName())
                    .complianceScore(vendor.getComplianceScore())
                    .faceImageUrl(vendor.getFaceImageUrl())
                    .isCurrentlyActive(isVendorCurrentlyActive(vendor.getId()))
                    .build();
            })
            .sorted(Comparator.comparing(NearbyVendor::getDistance))
            .collect(Collectors.toList());
    }
}
```

### 2. Gamification & Rewards System

```java
@Service
public class CitizenRewardsService {
    
    @Autowired
    private CitizenRewardsRepository rewardsRepository;
    
    @Autowired
    private CitizenLeaderboardRepository leaderboardRepository;
    
    @Autowired
    private NotificationService notificationService;
    
    // Points configuration
    private static final int VALID_REPORT_POINTS = 50;
    private static final int ACCURATE_REPORT_POINTS = 100;
    private static final int RATING_POINTS = 10;
    private static final int DAILY_CHECKIN_POINTS = 5;
    private static final int REFERRAL_POINTS = 25;
    
    /**
     * Award points for violation report
     */
    public void awardReportPoints(Long userId, Long violationId) {
        
        Violation violation = violationRepository.findById(violationId)
            .orElseThrow(() -> new ResourceNotFoundException("Violation not found"));
        
        int pointsToAward = VALID_REPORT_POINTS;
        
        // Bonus points for high accuracy
        if (violation.getAuthenticityScore() >= 0.9) {
            pointsToAward = ACCURATE_REPORT_POINTS;
        }
        
        // Create reward record
        CitizenReward reward = CitizenReward.builder()
            .userId(userId)
            .rewardType(RewardType.VALID_REPORT)
            .pointsEarned(pointsToAward)
            .referenceId(violationId)
            .rewardMetadata(Map.of(
                "violation_type", violation.getViolationType(),
                "authenticity_score", violation.getAuthenticityScore()
            ))
            .createdAt(LocalDateTime.now())
            .build();
        
        rewardsRepository.save(reward);
        
        // Update leaderboard
        updateLeaderboard(userId, pointsToAward);
        
        // Send notification
        notificationService.sendPointsEarnedNotification(userId, pointsToAward, "Valid Report");
    }
    
    /**
     * Award points for vendor rating
     */
    public void awardRatingPoints(Long userId, Long ratingId) {
        
        CitizenReward reward = CitizenReward.builder()
            .userId(userId)
            .rewardType(RewardType.HELPFUL_RATING)
            .pointsEarned(RATING_POINTS)
            .referenceId(ratingId)
            .createdAt(LocalDateTime.now())
            .build();
        
        rewardsRepository.save(reward);
        
        updateLeaderboard(userId, RATING_POINTS);
        
        notificationService.sendPointsEarnedNotification(userId, RATING_POINTS, "Vendor Rating");
    }
    
    /**
     * Process daily check-in
     */
    public CheckInResult processDailyCheckIn(Long userId) {
        
        // Check if already checked in today
        boolean alreadyCheckedIn = rewardsRepository
            .existsByUserIdAndRewardTypeAndCreatedAtAfter(
                userId, 
                RewardType.DAILY_CHECKIN, 
                LocalDateTime.now().withHour(0).withMinute(0).withSecond(0)
            );
        
        if (alreadyCheckedIn) {
            return CheckInResult.builder()
                .success(false)
                .message("Already checked in today")
                .build();
        }
        
        // Award check-in points
        CitizenReward reward = CitizenReward.builder()
            .userId(userId)
            .rewardType(RewardType.DAILY_CHECKIN)
            .pointsEarned(DAILY_CHECKIN_POINTS)
            .createdAt(LocalDateTime.now())
            .build();
        
        rewardsRepository.save(reward);
        
        updateLeaderboard(userId, DAILY_CHECKIN_POINTS);
        
        // Check for streak bonus
        int streakDays = calculateCheckInStreak(userId);
        int bonusPoints = calculateStreakBonus(streakDays);
        
        if (bonusPoints > 0) {
            CitizenReward streakReward = CitizenReward.builder()
                .userId(userId)
                .rewardType(RewardType.STREAK_BONUS)
                .pointsEarned(bonusPoints)
                .rewardMetadata(Map.of("streak_days", streakDays))
                .createdAt(LocalDateTime.now())
                .build();
            
            rewardsRepository.save(streakReward);
            updateLeaderboard(userId, bonusPoints);
        }
        
        return CheckInResult.builder()
            .success(true)
            .pointsEarned(DAILY_CHECKIN_POINTS + bonusPoints)
            .streakDays(streakDays)
            .message("Daily check-in successful!")
            .build();
    }
    
    /**
     * Update citizen leaderboard
     */
    private void updateLeaderboard(Long userId, int pointsToAdd) {
        
        CitizenLeaderboard leaderboard = leaderboardRepository
            .findByUserId(userId)
            .orElse(CitizenLeaderboard.builder()
                .userId(userId)
                .totalPoints(0)
                .reportsSubmitted(0)
                .ratingsGiven(0)
                .accuracyScore(0.0)
                .build());
        
        // Update total points
        leaderboard.setTotalPoints(leaderboard.getTotalPoints() + pointsToAdd);
        
        // Update other metrics
        updateLeaderboardMetrics(leaderboard, userId);
        
        // Update rank
        updateRank(leaderboard);
        
        leaderboard.setLastActivityAt(LocalDateTime.now());
        leaderboardRepository.save(leaderboard);
    }
    
    /**
     * Get citizen's reward history
     */
    public List<CitizenReward> getRewardHistory(Long userId, int limit) {
        
        return rewardsRepository
            .findByUserIdOrderByCreatedAtDesc(userId, PageRequest.of(0, limit));
    }
    
    /**
     * Get leaderboard
     */
    public List<CitizenLeaderboard> getLeaderboard(int limit) {
        
        Pageable pageable = PageRequest.of(0, limit);
        return leaderboardRepository
            .findAllByOrderByTotalPointsDesc(pageable);
    }
    
    /**
     * Redeem rewards
     */
    public RedemptionResult redeemReward(Long userId, RewardRedemptionRequest request) {
        
        CitizenLeaderboard leaderboard = leaderboardRepository
            .findByUserId(userId)
            .orElseThrow(() -> new ResourceNotFoundException("User not found"));
        
        RewardCatalog catalog = rewardCatalogRepository
            .findById(request.getRewardId())
            .orElseThrow(() -> new ResourceNotFoundException("Reward not found"));
        
        // Check if user has enough points
        if (leaderboard.getTotalPoints() < catalog.getPointsRequired()) {
            return RedemptionResult.builder()
                .success(false)
                .message("Insufficient points")
                .build();
        }
        
        // Create redemption record
        RewardRedemption redemption = RewardRedemption.builder()
            .userId(userId)
            .rewardId(catalog.getId())
            .pointsUsed(catalog.getPointsRequired())
            .redemptionStatus(RedemptionStatus.PENDING)
            .createdAt(LocalDateTime.now())
            .build();
        
        redemptionRepository.save(redemption);
        
        // Deduct points
        leaderboard.setTotalPoints(leaderboard.getTotalPoints() - catalog.getPointsRequired());
        leaderboardRepository.save(leaderboard);
        
        // Process reward
        processRewardRedemption(redemption, catalog);
        
        return RedemptionResult.builder()
            .success(true)
            .redemptionId(redemption.getId())
            .message("Reward redeemed successfully")
            .build();
    }
}
```

### 3. Citizen API Controller

```java
@RestController
@RequestMapping("/api/citizen")
@Validated
public class CitizenController {
    
    @Autowired
    private CitizenEngagementService engagementService;
    
    @Autowired
    private CitizenRewardsService rewardsService;
    
    /**
     * Scan vendor QR code
     */
    @PostMapping("/scan-vendor")
    public ResponseEntity<ApiResponse<VendorScanResult>> scanVendorQR(
            @RequestBody @Valid QRScanRequest request,
            @RequestHeader("X-User-ID") Long userId) {
        
        VendorScanResult result = engagementService.scanVendorQR(
            request.getQrData(), request.getLocation());
        
        return ResponseEntity.ok(ApiResponse.success(result));
    }
    
    /**
     * Report violation
     */
    @PostMapping("/report-violation")
    public ResponseEntity<ApiResponse<ViolationReportResult>> reportViolation(
            @ModelAttribute @Valid ViolationReportRequest request,
            @RequestHeader("X-User-ID") Long userId) {
        
        // Handle file upload
        if (request.getImageFile() != null) {
            String imageUrl = fileService.uploadFile(request.getImageFile());
            request.setImageProofUrl(imageUrl);
        }
        
        ViolationReportResult result = engagementService.reportViolation(request, userId);
        
        return ResponseEntity.ok(ApiResponse.success(result));
    }
    
    /**
     * Rate vendor
     */
    @PostMapping("/rate-vendor")
    public ResponseEntity<ApiResponse<RatingResult>> rateVendor(
            @RequestBody @Valid VendorRatingRequest request,
            @RequestHeader("X-User-ID") Long userId) {
        
        RatingResult result = engagementService.rateVendor(request, userId);
        
        return ResponseEntity.ok(ApiResponse.success(result));
    }
    
    /**
     * Find nearby vendors
     */
    @GetMapping("/nearby-vendors")
    public ResponseEntity<ApiResponse<List<NearbyVendor>>> findNearbyVendors(
            @RequestParam double latitude,
            @RequestParam double longitude,
            @RequestParam(defaultValue = "2.0") double radiusKm,
            @RequestParam(required = false) List<VendorCategory> categories) {
        
        LocationData location = LocationData.builder()
            .latitude(latitude)
            .longitude(longitude)
            .build();
        
        List<NearbyVendor> vendors = engagementService.findNearbyVendors(
            location, radiusKm, categories);
        
        return ResponseEntity.ok(ApiResponse.success(vendors));
    }
    
    /**
     * Daily check-in
     */
    @PostMapping("/check-in")
    public ResponseEntity<ApiResponse<CheckInResult>> dailyCheckIn(
            @RequestHeader("X-User-ID") Long userId) {
        
        CheckInResult result = rewardsService.processDailyCheckIn(userId);
        
        return ResponseEntity.ok(ApiResponse.success(result));
    }
    
    /**
     * Get reward history
     */
    @GetMapping("/rewards/history")
    public ResponseEntity<ApiResponse<List<CitizenReward>>> getRewardHistory(
            @RequestHeader("X-User-ID") Long userId,
            @RequestParam(defaultValue = "20") int limit) {
        
        List<CitizenReward> rewards = rewardsService.getRewardHistory(userId, limit);
        
        return ResponseEntity.ok(ApiResponse.success(rewards));
    }
    
    /**
     * Get leaderboard
     */
    @GetMapping("/leaderboard")
    public ResponseEntity<ApiResponse<List<CitizenLeaderboard>>> getLeaderboard(
            @RequestParam(defaultValue = "50") int limit) {
        
        List<CitizenLeaderboard> leaderboard = rewardsService.getLeaderboard(limit);
        
        return ResponseEntity.ok(ApiResponse.success(leaderboard));
    }
    
    /**
     * Get reward catalog
     */
    @GetMapping("/rewards/catalog")
    public ResponseEntity<ApiResponse<List<RewardCatalog>>> getRewardCatalog() {
        
        List<RewardCatalog> catalog = rewardCatalogRepository
            .findByIsActiveTrueOrderByPointsRequiredAsc();
        
        return ResponseEntity.ok(ApiResponse.success(catalog));
    }
    
    /**
     * Redeem reward
     */
    @PostMapping("/rewards/redeem")
    public ResponseEntity<ApiResponse<RedemptionResult>> redeemReward(
            @RequestBody @Valid RewardRedemptionRequest request,
            @RequestHeader("X-User-ID") Long userId) {
        
        RedemptionResult result = rewardsService.redeemReward(userId, request);
        
        return ResponseEntity.ok(ApiResponse.success(result));
    }
    
    /**
     * Get citizen profile
     */
    @GetMapping("/profile")
    public ResponseEntity<ApiResponse<CitizenProfile>> getProfile(
            @RequestHeader("X-User-ID") Long userId) {
        
        User user = userRepository.findById(userId)
            .orElseThrow(() -> new ResourceNotFoundException("User not found"));
        
        CitizenLeaderboard leaderboard = leaderboardRepository
            .findByUserId(userId)
            .orElse(null);
        
        CitizenProfile profile = CitizenProfile.builder()
            .userId(userId)
            .username(user.getUsername())
            .fullName(user.getFullName())
            .email(user.getEmail())
            .phone(user.getPhone())
            .totalPoints(leaderboard != null ? leaderboard.getTotalPoints() : 0)
            .currentRank(leaderboard != null ? leaderboard.getCurrentRank() : 0)
            .reportsSubmitted(leaderboard != null ? leaderboard.getReportsSubmitted() : 0)
            .ratingsGiven(leaderboard != null ? leaderboard.getRatingsGiven() : 0)
            .accuracyScore(leaderboard != null ? leaderboard.getAccuracyScore() : 0.0)
            .memberSince(user.getCreatedAt())
            .build();
        
        return ResponseEntity.ok(ApiResponse.success(profile));
    }
}
```

### 4. React Native Citizen App

```javascript
// CitizenApp.js
import React, { useState, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { Provider } from 'react-redux';
import { store } from './store';

// Screens
import HomeScreen from './screens/HomeScreen';
import QRScannerScreen from './screens/QRScannerScreen';
import NearbyVendorsScreen from './screens/NearbyVendorsScreen';
import ReportViolationScreen from './screens/ReportViolationScreen';
import RewardsScreen from './screens/RewardsScreen';
import ProfileScreen from './screens/ProfileScreen';
import VendorDetailsScreen from './screens/VendorDetailsScreen';

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

const MainTabs = () => {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;
          
          switch (route.name) {
            case 'Home':
              iconName = 'home';
              break;
            case 'Scanner':
              iconName = 'qr-code-scanner';
              break;
            case 'Nearby':
              iconName = 'location-on';
              break;
            case 'Report':
              iconName = 'report-problem';
              break;
            case 'Rewards':
              iconName = 'emoji-events';
              break;
            case 'Profile':
              iconName = 'person';
              break;
          }
          
          return <Icon name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#007AFF',
        tabBarInactiveTintColor: 'gray',
        headerShown: false,
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Scanner" component={QRScannerScreen} />
      <Tab.Screen name="Nearby" component={NearbyVendorsScreen} />
      <Tab.Screen name="Report" component={ReportViolationScreen} />
      <Tab.Screen name="Rewards" component={RewardsScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
};

const App = () => {
  return (
    <Provider store={store}>
      <NavigationContainer>
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          <Stack.Screen name="Main" component={MainTabs} />
          <Stack.Screen 
            name="VendorDetails" 
            component={VendorDetailsScreen}
            options={{ headerShown: true, title: 'Vendor Details' }}
          />
        </Stack.Navigator>
      </NavigationContainer>
    </Provider>
  );
};

export default App;

// QRScannerScreen.js
import React, { useState } from 'react';
import { View, Text, StyleSheet, Alert, Vibration } from 'react-native';
import { RNCamera } from 'react-native-camera';
import { useDispatch } from 'react-redux';
import { scanVendorQR } from './store/actions/citizenActions';
import LoadingSpinner from '../components/LoadingSpinner';

const QRScannerScreen = ({ navigation }) => {
  const [scanning, setScanning] = useState(true);
  const [loading, setLoading] = useState(false);
  const dispatch = useDispatch();

  const onBarCodeRead = async (scanResult) => {
    if (!scanning) return;
    
    setScanning(false);
    setLoading(true);
    Vibration.vibrate(100);

    try {
      // Get current location
      const location = await getCurrentLocation();
      
      const scanData = {
        qrData: scanResult.data,
        location: {
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
          accuracy: location.coords.accuracy
        }
      };

      const result = await dispatch(scanVendorQR(scanData));
      
      if (result.success) {
        navigation.navigate('VendorDetails', { vendorData: result.data });
      } else {
        Alert.alert('Scan Failed', result.message);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to scan QR code');
    } finally {
      setLoading(false);
      setTimeout(() => setScanning(true), 2000);
    }
  };

  if (loading) {
    return <LoadingSpinner message="Processing scan..." />;
  }

  return (
    <View style={styles.container}>
      <RNCamera
        style={styles.camera}
        type={RNCamera.Constants.Type.back}
        flashMode={RNCamera.Constants.FlashMode.auto}
        onBarCodeRead={onBarCodeRead}
        captureAudio={false}
      >
        <View style={styles.overlay}>
          <View style={styles.scanFrame} />
          <Text style={styles.instruction}>
            Position QR code within the frame
          </Text>
        </View>
      </RNCamera>
    </View>
  );
};

// NearbyVendorsScreen.js
import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { findNearbyVendors } from './store/actions/citizenActions';
import VendorCard from '../components/VendorCard';
import FilterModal from '../components/FilterModal';
import LoadingSpinner from '../components/LoadingSpinner';

const NearbyVendorsScreen = ({ navigation }) => {
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filtersVisible, setFiltersVisible] = useState(false);
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [radius, setRadius] = useState(2.0);
  
  const dispatch = useDispatch();
  const location = useSelector(state => state.location.currentLocation);

  useEffect(() => {
    loadNearbyVendors();
  }, [location, selectedCategories, radius]);

  const loadNearbyVendors = async () => {
    if (!location) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const result = await dispatch(findNearbyVendors({
        latitude: location.latitude,
        longitude: location.longitude,
        radiusKm: radius,
        categories: selectedCategories.length > 0 ? selectedCategories : null
      }));
      
      setVendors(result.data);
    } catch (error) {
      console.error('Failed to load nearby vendors:', error);
    } finally {
      setLoading(false);
    }
  };

  const renderVendor = ({ item }) => (
    <VendorCard
      vendor={item}
      onPress={() => navigation.navigate('VendorDetails', { vendorData: item })}
    />
  );

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <View style={styles.container}>
      {/* Header with filters */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.filterButton}
          onPress={() => setFiltersVisible(true)}
        >
          <Icon name="filter-list" size={24} color="#007AFF" />
          <Text style={styles.filterText}>Filters</Text>
        </TouchableOpacity>
        <Text style={styles.resultCount}>
          {vendors.length} vendors found
        </Text>
      </View>

      {/* Vendor list */}
      <FlatList
        data={vendors}
        renderItem={renderVendor}
        keyExtractor={item => item.vendorId}
        contentContainerStyle={styles.listContainer}
        refreshing={loading}
        onRefresh={loadNearbyVendors}
      />

      {/* Filter modal */}
      <FilterModal
        visible={filtersVisible}
        selectedCategories={selectedCategories}
        radius={radius}
        onCategoriesChange={setSelectedCategories}
        onRadiusChange={setRadius}
        onClose={() => setFiltersVisible(false)}
        onApply={loadNearbyVendors}
      />
    </View>
  );
};

// RewardsScreen.js
import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { getUserProfile, getRewardHistory, getLeaderboard } from './store/actions/citizenActions';
import PointsBalance from '../components/PointsBalance';
import RewardItem from '../components/RewardItem';
import LeaderboardItem from '../components/LeaderboardItem';

const RewardsScreen = () => {
  const [activeTab, setActiveTab] = useState('catalog');
  const [rewardHistory, setRewardHistory] = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);
  
  const dispatch = useDispatch();
  const profile = useSelector(state => state.citizen.profile);
  const rewardCatalog = useSelector(state => state.citizen.rewardCatalog);

  useEffect(() => {
    loadRewardData();
  }, []);

  const loadRewardData = async () => {
    try {
      await dispatch(getUserProfile());
      
      const historyResult = await dispatch(getRewardHistory({ limit: 20 }));
      setRewardHistory(historyResult.data);
      
      const leaderboardResult = await dispatch(getLeaderboard({ limit: 10 }));
      setLeaderboard(leaderboardResult.data);
    } catch (error) {
      console.error('Failed to load reward data:', error);
    }
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'catalog':
        return (
          <ScrollView style={styles.catalogContainer}>
            {rewardCatalog.map(reward => (
              <RewardItem
                key={reward.id}
                reward={reward}
                userPoints={profile?.totalPoints || 0}
              />
            ))}
          </ScrollView>
        );
        
      case 'history':
        return (
          <ScrollView style={styles.historyContainer}>
            {rewardHistory.map((item, index) => (
              <View key={index} style={styles.historyItem}>
                <Text style={styles.historyType}>{item.rewardType}</Text>
                <Text style={styles.historyPoints}>+{item.pointsEarned} pts</Text>
                <Text style={styles.historyDate}>
                  {new Date(item.createdAt).toLocaleDateString()}
                </Text>
              </View>
            ))}
          </ScrollView>
        );
        
      case 'leaderboard':
        return (
          <ScrollView style={styles.leaderboardContainer}>
            {leaderboard.map((user, index) => (
              <LeaderboardItem
                key={user.userId}
                user={user}
                rank={index + 1}
                isCurrentUser={user.userId === profile?.userId}
              />
            ))}
          </ScrollView>
        );
        
      default:
        return null;
    }
  };

  return (
    <View style={styles.container}>
      {/* Points balance */}
      <PointsBalance
        totalPoints={profile?.totalPoints || 0}
        currentRank={profile?.currentRank || 0}
      />

      {/* Tab navigation */}
      <View style={styles.tabContainer}>
        {['catalog', 'history', 'leaderboard'].map(tab => (
          <TouchableOpacity
            key={tab}
            style={[
              styles.tab,
              activeTab === tab && styles.activeTab
            ]}
            onPress={() => setActiveTab(tab)}
          >
            <Text style={[
              styles.tabText,
              activeTab === tab && styles.activeTabText
            ]}>
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Content */}
      {renderContent()}
    </View>
  );
};

export default RewardsScreen;
```

This citizen engagement system creates a comprehensive community-powered platform that encourages public participation through gamification, rewards, and easy-to-use mobile interfaces, turning citizens into active partners in maintaining a well-organized vending ecosystem.
