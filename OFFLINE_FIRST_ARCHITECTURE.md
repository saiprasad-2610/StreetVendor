# 📶 Offline-First Architecture

## 🔄 Resilient System for Indian Conditions

### 1. Offline Data Synchronization Service

```java
@Service
public class OfflineSyncService {
    
    @Autowired
    private SyncQueueRepository syncQueueRepository;
    
    @Autowired
    private ConflictResolutionService conflictService;
    
    @Autowired
    private DataVersioningService versioningService;
    
    /**
     * Queue data for synchronization when online
     */
    public void queueForSync(SyncableEntity entity, SyncOperation operation) {
        
        SyncQueueItem queueItem = SyncQueueItem.builder()
            .entityType(entity.getEntityType())
            .entityId(entity.getId())
            .operation(operation)
            .entityData(entity.toJson())
            .entityVersion(entity.getVersion())
            .timestamp(LocalDateTime.now())
            .deviceId(getCurrentDeviceId())
            .userId(getCurrentUserId())
            .syncStatus(SyncStatus.PENDING)
            .retryCount(0)
            .build();
        
        syncQueueRepository.save(queueItem);
        
        // Attempt immediate sync if online
        if (isOnline()) {
            attemptSync(queueItem);
        }
    }
    
    /**
     * Process synchronization queue when online
     */
    @Scheduled(fixedRate = 30000) // Every 30 seconds
    @Async
    public void processSyncQueue() {
        
        if (!isOnline()) {
            return;
        }
        
        List<SyncQueueItem> pendingItems = syncQueueRepository
            .findBySyncStatusOrderByTimestampAsc(SyncStatus.PENDING);
        
        for (SyncQueueItem item : pendingItems) {
            try {
                processSyncItem(item);
            } catch (Exception e) {
                handleSyncFailure(item, e);
            }
        }
    }
    
    private void processSyncItem(SyncQueueItem item) {
        
        // Check for conflicts
        ConflictResolutionResult conflictResult = conflictService
            .checkForConflicts(item);
        
        if (conflictResult.hasConflict()) {
            resolveConflict(item, conflictResult);
            return;
        }
        
        // Apply synchronization
        boolean success = switch (item.getOperation()) {
            case CREATE -> syncCreate(item);
            case UPDATE -> syncUpdate(item);
            case DELETE -> syncDelete(item);
        };
        
        if (success) {
            // Mark as synced
            item.setSyncStatus(SyncStatus.COMPLETED);
            item.setSyncedAt(LocalDateTime.now());
            syncQueueRepository.save(item);
            
            // Update local cache
            updateLocalCache(item);
        } else {
            handleSyncFailure(item, new Exception("Sync operation failed"));
        }
    }
    
    /**
     * Handle sync conflicts
     */
    private void resolveConflict(SyncQueueItem item, ConflictResolutionResult conflictResult) {
        
        ConflictResolutionStrategy strategy = conflictResult.getRecommendedStrategy();
        
        switch (strategy) {
            case SERVER_WINS:
                // Update local with server data
                updateLocalWithServerData(item, conflictResult.getServerData());
                item.setSyncStatus(SyncStatus.RESOLVED_SERVER_WINS);
                break;
                
            case CLIENT_WINS:
                // Force client data to server
                forceSyncToServer(item);
                item.setSyncStatus(SyncStatus.RESOLVED_CLIENT_WINS);
                break;
                
            case MANUAL_RESOLUTION:
                // Queue for manual resolution
                item.setSyncStatus(SyncStatus.CONFLICT_REQUIRES_MANUAL);
                item.setConflictData(conflictResult.getConflictDetails());
                break;
                
            case MERGE:
                // Attempt automatic merge
                SyncQueueItem mergedItem = attemptMerge(item, conflictResult);
                if (mergedItem != null) {
                    processSyncItem(mergedItem);
                    item.setSyncStatus(SyncStatus.RESOLVED_MERGED);
                } else {
                    item.setSyncStatus(SyncStatus.CONFLICT_REQUIRES_MANUAL);
                    item.setConflictData(conflictResult.getConflictDetails());
                }
                break;
        }
        
        syncQueueRepository.save(item);
        
        // Notify user of conflict resolution
        notifyConflictResolution(item, strategy);
    }
    
    /**
     * Background data preloading for offline use
     */
    @Scheduled(cron = "0 0 2 * * ?") // Daily at 2 AM
    public void preloadOfflineData() {
        
        // Preload essential data for offline operation
        preloadVendorData();
        preloadZoneData();
        preloadPricingData();
        preloadMapsData();
        preloadReferenceData();
    }
    
    private void preloadVendorData() {
        
        List<Vendor> vendors = vendorRepository.findAllActiveVendors();
        
        for (Vendor vendor : vendors) {
            OfflineVendorData offlineData = OfflineVendorData.builder()
                .vendorId(vendor.getId())
                .vendorCode(vendor.getVendorId())
                .name(vendor.getName())
                .category(vendor.getCategory())
                .status(vendor.getStatus())
                .location(vendor.getLocation())
                .qrCodeUrl(vendor.getQrCode().getQrCodeUrl())
                .faceImageUrl(vendor.getFaceImageUrl())
                .lastUpdated(LocalDateTime.now())
                .build();
            
            offlineCacheService.storeOfflineData("vendor", vendor.getId().toString(), offlineData);
        }
    }
    
    private void preloadZoneData() {
        
        List<Zone> zones = zoneRepository.findAllActiveZones();
        
        for (Zone zone : zones) {
            OfflineZoneData offlineData = OfflineZoneData.builder()
                .zoneId(zone.getId())
                .name(zone.getName())
                .zoneType(zone.getZoneType())
                .polygonCoordinates(zone.getPolygonCoordinates())
                .maxVendors(zone.getMaxVendors())
                .timeRestrictions(zone.getTimeRestrictions())
                .lastUpdated(LocalDateTime.now())
                .build();
            
            offlineCacheService.storeOfflineData("zone", zone.getId().toString(), offlineData);
        }
    }
}
```

### 2. Local Storage Service (React Native)

```javascript
// services/OfflineStorageService.js
import AsyncStorage from '@react-native-async-storage/async-storage';
import SQLite from 'react-native-sqlite-storage';
import NetInfo from '@react-native-community/netinfo';

class OfflineStorageService {
    constructor() {
        this.db = null;
        this.isOnline = true;
        this.syncQueue = [];
        this.initDatabase();
        this.setupNetworkListener();
    }

    async initDatabase() {
        try {
            this.db = SQLite.openDatabase({
                name: 'SVMSOffline.db',
                location: 'default',
            });
            
            await this.createTables();
            console.log('Offline database initialized');
        } catch (error) {
            console.error('Failed to initialize offline database:', error);
        }
    }

    async createTables() {
        const queries = [
            `CREATE TABLE IF NOT EXISTS vendors (
                id INTEGER PRIMARY KEY,
                vendor_id TEXT UNIQUE,
                name TEXT,
                category TEXT,
                status TEXT,
                latitude REAL,
                longitude REAL,
                qr_code_url TEXT,
                face_image_url TEXT,
                last_updated TEXT,
                sync_status TEXT DEFAULT 'synced'
            )`,
            
            `CREATE TABLE IF NOT EXISTS zones (
                id INTEGER PRIMARY KEY,
                name TEXT,
                zone_type TEXT,
                polygon_coordinates TEXT,
                max_vendors INTEGER,
                last_updated TEXT,
                sync_status TEXT DEFAULT 'synced'
            )`,
            
            `CREATE TABLE IF NOT EXISTS sync_queue (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                entity_type TEXT,
                entity_id TEXT,
                operation TEXT,
                entity_data TEXT,
                timestamp TEXT,
                retry_count INTEGER DEFAULT 0,
                sync_status TEXT DEFAULT 'pending'
            )`,
            
            `CREATE TABLE IF NOT EXISTS violations (
                id INTEGER PRIMARY KEY,
                vendor_id TEXT,
                violation_type TEXT,
                description TEXT,
                latitude REAL,
                longitude REAL,
                image_path TEXT,
                timestamp TEXT,
                sync_status TEXT DEFAULT 'pending'
            )`,
            
            `CREATE TABLE IF NOT EXISTS ratings (
                id INTEGER PRIMARY KEY,
                vendor_id TEXT,
                cleanliness INTEGER,
                pricing INTEGER,
                behavior INTEGER,
                feedback TEXT,
                timestamp TEXT,
                sync_status TEXT DEFAULT 'pending'
            )`
        ];

        for (const query of queries) {
            await this.executeSQL(query);
        }
    }

    setupNetworkListener() {
        NetInfo.addEventListener(state => {
            this.isOnline = state.isConnected;
            if (this.isOnline) {
                this.processSyncQueue();
            }
        });
    }

    // Vendor operations
    async getVendor(vendorId) {
        try {
            const result = await this.executeSQL(
                'SELECT * FROM vendors WHERE vendor_id = ?',
                [vendorId]
            );
            
            return result.rows.length > 0 ? result.rows.item(0) : null;
        } catch (error) {
            console.error('Failed to get vendor:', error);
            return null;
        }
    }

    async getAllVendors() {
        try {
            const result = await this.executeSQL('SELECT * FROM vendors ORDER BY name');
            
            const vendors = [];
            for (let i = 0; i < result.rows.length; i++) {
                vendors.push(result.rows.item(i));
            }
            return vendors;
        } catch (error) {
            console.error('Failed to get all vendors:', error);
            return [];
        }
    }

    async saveVendor(vendorData) {
        try {
            await this.executeSQL(
                `INSERT OR REPLACE INTO vendors 
                (vendor_id, name, category, status, latitude, longitude, qr_code_url, face_image_url, last_updated, sync_status)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    vendorData.vendorId,
                    vendorData.name,
                    vendorData.category,
                    vendorData.status,
                    vendorData.latitude,
                    vendorData.longitude,
                    vendorData.qrCodeUrl,
                    vendorData.faceImageUrl,
                    new Date().toISOString(),
                    'synced'
                ]
            );
        } catch (error) {
            console.error('Failed to save vendor:', error);
        }
    }

    // Zone operations
    async getZones() {
        try {
            const result = await this.executeSQL('SELECT * FROM zones ORDER BY name');
            
            const zones = [];
            for (let i = 0; i < result.rows.length; i++) {
                const zone = result.rows.item(i);
                zone.polygonCoordinates = JSON.parse(zone.polygon_coordinates);
                zones.push(zone);
            }
            return zones;
        } catch (error) {
            console.error('Failed to get zones:', error);
            return [];
        }
    }

    async saveZone(zoneData) {
        try {
            await this.executeSQL(
                `INSERT OR REPLACE INTO zones 
                (id, name, zone_type, polygon_coordinates, max_vendors, last_updated, sync_status)
                VALUES (?, ?, ?, ?, ?, ?, ?)`,
                [
                    zoneData.id,
                    zoneData.name,
                    zoneData.zoneType,
                    JSON.stringify(zoneData.polygonCoordinates),
                    zoneData.maxVendors,
                    new Date().toISOString(),
                    'synced'
                ]
            );
        } catch (error) {
            console.error('Failed to save zone:', error);
        }
    }

    // Violation reporting (offline)
    async reportViolation(violationData) {
        try {
            // Save to local database
            const result = await this.executeSQL(
                `INSERT INTO violations 
                (vendor_id, violation_type, description, latitude, longitude, image_path, timestamp, sync_status)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    violationData.vendorId,
                    violationData.violationType,
                    violationData.description,
                    violationData.latitude,
                    violationData.longitude,
                    violationData.imagePath,
                    new Date().toISOString(),
                    'pending'
                ]
            );

            const violationId = result.insertId;

            // Add to sync queue
            await this.addToSyncQueue({
                entityType: 'violation',
                entityId: violationId.toString(),
                operation: 'create',
                entityData: JSON.stringify(violationData),
                timestamp: new Date().toISOString()
            });

            return { success: true, violationId };
        } catch (error) {
            console.error('Failed to report violation:', error);
            return { success: false, error: error.message };
        }
    }

    // Rating submission (offline)
    async submitRating(ratingData) {
        try {
            const result = await this.executeSQL(
                `INSERT INTO ratings 
                (vendor_id, cleanliness, pricing, behavior, feedback, timestamp, sync_status)
                VALUES (?, ?, ?, ?, ?, ?, ?)`,
                [
                    ratingData.vendorId,
                    ratingData.cleanliness,
                    ratingData.pricing,
                    ratingData.behavior,
                    ratingData.feedback,
                    new Date().toISOString(),
                    'pending'
                ]
            );

            const ratingId = result.insertId;

            // Add to sync queue
            await this.addToSyncQueue({
                entityType: 'rating',
                entityId: ratingId.toString(),
                operation: 'create',
                entityData: JSON.stringify(ratingData),
                timestamp: new Date().toISOString()
            });

            return { success: true, ratingId };
        } catch (error) {
            console.error('Failed to submit rating:', error);
            return { success: false, error: error.message };
        }
    }

    // Sync queue management
    async addToSyncQueue(item) {
        try {
            await this.executeSQL(
                `INSERT INTO sync_queue 
                (entity_type, entity_id, operation, entity_data, timestamp, sync_status)
                VALUES (?, ?, ?, ?, ?, ?)`,
                [
                    item.entityType,
                    item.entityId,
                    item.operation,
                    item.entityData,
                    item.timestamp,
                    'pending'
                ]
            );
        } catch (error) {
            console.error('Failed to add to sync queue:', error);
        }
    }

    async getSyncQueue() {
        try {
            const result = await this.executeSQL(
                'SELECT * FROM sync_queue WHERE sync_status = ? ORDER BY timestamp ASC',
                ['pending']
            );

            const queue = [];
            for (let i = 0; i < result.rows.length; i++) {
                queue.push(result.rows.item(i));
            }
            return queue;
        } catch (error) {
            console.error('Failed to get sync queue:', error);
            return [];
        }
    }

    async processSyncQueue() {
        if (!this.isOnline) return;

        try {
            const queue = await this.getSyncQueue();
            
            for (const item of queue) {
                try {
                    await this.syncItem(item);
                } catch (error) {
                    console.error('Failed to sync item:', item.id, error);
                    await this.markSyncFailed(item.id);
                }
            }
        } catch (error) {
            console.error('Failed to process sync queue:', error);
        }
    }

    async syncItem(item) {
        const entityData = JSON.parse(item.entity_data);
        
        let response;
        switch (item.entity_type) {
            case 'violation':
                response = await this.apiService.reportViolation(entityData);
                break;
            case 'rating':
                response = await this.apiService.submitRating(entityData);
                break;
            default:
                throw new Error(`Unknown entity type: ${item.entity_type}`);
        }

        if (response.success) {
            await this.markSyncCompleted(item.id);
        } else {
            throw new Error(response.message || 'Sync failed');
        }
    }

    async markSyncCompleted(queueItemId) {
        await this.executeSQL(
            'UPDATE sync_queue SET sync_status = ? WHERE id = ?',
            ['completed', queueItemId]
        );
    }

    async markSyncFailed(queueItemId) {
        await this.executeSQL(
            'UPDATE sync_queue SET retry_count = retry_count + 1 WHERE id = ?',
            [queueItemId]
        );
    }

    // Utility methods
    async executeSQL(query, params = []) {
        return new Promise((resolve, reject) => {
            this.db.transaction(tx => {
                tx.executeSql(
                    query,
                    params,
                    (tx, results) => resolve(results),
                    (tx, error) => reject(error)
                );
            });
        });
    }

    // Data preloading
    async preloadEssentialData() {
        try {
            // Preload vendors
            const vendorsResponse = await this.apiService.getAllVendors();
            if (vendorsResponse.success) {
                for (const vendor of vendorsResponse.data) {
                    await this.saveVendor(vendor);
                }
            }

            // Preload zones
            const zonesResponse = await this.apiService.getAllZones();
            if (zonesResponse.success) {
                for (const zone of zonesResponse.data) {
                    await this.saveZone(zone);
                }
            }

            console.log('Essential data preloaded for offline use');
        } catch (error) {
            console.error('Failed to preload essential data:', error);
        }
    }

    // Cache management
    async clearCache() {
        try {
            await this.executeSQL('DELETE FROM vendors');
            await this.executeSQL('DELETE FROM zones');
            await this.executeSQL('DELETE FROM sync_queue WHERE sync_status = "completed"');
            console.log('Cache cleared');
        } catch (error) {
            console.error('Failed to clear cache:', error);
        }
    }

    async getCacheSize() {
        try {
            const vendorsCount = await this.executeSQL('SELECT COUNT(*) as count FROM vendors');
            const zonesCount = await this.executeSQL('SELECT COUNT(*) as count FROM zones');
            const syncQueueCount = await this.executeSQL('SELECT COUNT(*) as count FROM sync_queue');

            return {
                vendors: vendorsCount.rows.item(0).count,
                zones: zonesCount.rows.item(0).count,
                syncQueue: syncQueueCount.rows.item(0).count
            };
        } catch (error) {
            console.error('Failed to get cache size:', error);
            return { vendors: 0, zones: 0, syncQueue: 0 };
        }
    }
}

export default new OfflineStorageService();
```

### 3. Offline-First React Native Components

```javascript
// components/OfflineAwareScreen.js
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Alert, NetInfo } from 'react-native';
import { useSelector, useDispatch } from 'react-redux';
import offlineStorage from '../services/OfflineStorageService';
import { setOnlineStatus } from '../store/actions/networkActions';

const OfflineAwareScreen = ({ children, requireOnline = false }) => {
    const [isOnline, setIsOnline] = useState(true);
    const [syncStatus, setSyncStatus] = useState('idle');
    const dispatch = useDispatch();

    useEffect(() => {
        const unsubscribe = NetInfo.addEventListener(state => {
            const online = state.isConnected;
            setIsOnline(online);
            dispatch(setOnlineStatus(online));
            
            if (online) {
                // Start sync when coming online
                startSyncProcess();
            }
        });

        return () => unsubscribe();
    }, []);

    const startSyncProcess = async () => {
        setSyncStatus('syncing');
        try {
            await offlineStorage.processSyncQueue();
            setSyncStatus('synced');
            
            // Clear sync status after 3 seconds
            setTimeout(() => setSyncStatus('idle'), 3000);
        } catch (error) {
            setSyncStatus('error');
            console.error('Sync failed:', error);
        }
    };

    if (requireOnline && !isOnline) {
        return (
            <View style={styles.offlineContainer}>
                <Text style={styles.offlineIcon}>📶</Text>
                <Text style={styles.offlineTitle}>No Internet Connection</Text>
                <Text style={styles.offlineMessage}>
                    This feature requires an internet connection. Please check your network settings.
                </Text>
                <Text style={styles.syncStatus}>
                    Data will be synced automatically when you're back online.
                </Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            {/* Sync status indicator */}
            {syncStatus !== 'idle' && (
                <View style={[
                    styles.syncIndicator,
                    syncStatus === 'syncing' && styles.syncing,
                    syncStatus === 'synced' && styles.synced,
                    syncStatus === 'error' && styles.syncError
                ]}>
                    <Text style={styles.syncText}>
                        {syncStatus === 'syncing' && 'Syncing data...'}
                        {syncStatus === 'synced' && 'All data synced'}
                        {syncStatus === 'error' && 'Sync failed'}
                    </Text>
                </View>
            )}

            {/* Offline indicator */}
            {!isOnline && (
                <View style={styles.offlineIndicator}>
                    <Text style={styles.offlineIndicatorText}>
                        Offline - Changes will sync when online
                    </Text>
                </View>
            )}

            {children}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    offlineContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
        backgroundColor: '#f5f5f5',
    },
    offlineIcon: {
        fontSize: 64,
        marginBottom: 20,
    },
    offlineTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 10,
        textAlign: 'center',
    },
    offlineMessage: {
        fontSize: 16,
        textAlign: 'center',
        color: '#666',
        marginBottom: 20,
        lineHeight: 24,
    },
    syncStatus: {
        fontSize: 14,
        textAlign: 'center',
        color: '#999',
    },
    syncIndicator: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        padding: 8,
        backgroundColor: '#f0f0f0',
        zIndex: 1000,
    },
    syncing: {
        backgroundColor: '#e3f2fd',
    },
    synced: {
        backgroundColor: '#e8f5e8',
    },
    syncError: {
        backgroundColor: '#ffebee',
    },
    syncText: {
        textAlign: 'center',
        fontSize: 14,
    },
    offlineIndicator: {
        backgroundColor: '#fff3cd',
        padding: 8,
        borderBottomWidth: 1,
        borderBottomColor: '#ffeaa7',
    },
    offlineIndicatorText: {
        textAlign: 'center',
        fontSize: 14,
        color: '#856404',
    },
});

export default OfflineAwareScreen;

// components/OfflineVendorScanner.js
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Alert, Vibration } from 'react-native';
import { RNCamera } from 'react-native-camera';
import { useDispatch } from 'react-redux';
import offlineStorage from '../services/OfflineStorageService';
import { scanVendorQR } from '../store/actions/vendorActions';

const OfflineVendorScanner = ({ onScanComplete }) => {
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
            
            // Try online scan first
            let scanData;
            try {
                scanData = await dispatch(scanVendorQR({
                    qrData: scanResult.data,
                    location: {
                        latitude: location.coords.latitude,
                        longitude: location.coords.longitude,
                        accuracy: location.coords.accuracy
                    }
                }));
            } catch (onlineError) {
                // Fallback to offline scan
                console.log('Online scan failed, trying offline:', onlineError);
                scanData = await performOfflineScan(scanResult.data, location);
            }
            
            if (scanData.success) {
                onScanComplete(scanData.data);
            } else {
                Alert.alert('Scan Failed', scanData.message);
            }
        } catch (error) {
            Alert.alert('Error', 'Failed to scan QR code');
        } finally {
            setLoading(false);
            setTimeout(() => setScanning(true), 2000);
        }
    };

    const performOfflineScan = async (qrData, location) => {
        try {
            // Parse QR data to get vendor ID
            const vendorId = extractVendorIdFromQR(qrData);
            
            // Get vendor from local storage
            const vendor = await offlineStorage.getVendor(vendorId);
            
            if (!vendor) {
                return { success: false, message: 'Vendor not found locally' };
            }
            
            // Perform basic location validation
            const isWithinZone = await validateLocationOffline(vendor, location);
            
            return {
                success: true,
                data: {
                    vendorId: vendor.vendor_id,
                    vendorName: vendor.name,
                    category: vendor.category,
                    status: vendor.status,
                    locationValid: isWithinZone,
                    offlineMode: true,
                    scanTime: new Date().toISOString()
                }
            };
        } catch (error) {
            return { success: false, message: 'Offline scan failed: ' + error.message };
        }
    };

    const validateLocationOffline = async (vendor, currentLocation) => {
        try {
            // Get vendor's zone from local storage
            const zones = await offlineStorage.getZones();
            const vendorZone = zones.find(zone => zone.id === vendor.zoneId);
            
            if (!vendorZone) {
                return false;
            }
            
            // Check if current location is within zone polygon
            return isPointInPolygon(
                currentLocation.coords.latitude,
                currentLocation.coords.longitude,
                vendorZone.polygonCoordinates
            );
        } catch (error) {
            console.error('Location validation failed:', error);
            return false;
        }
    };

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <Text style={styles.loadingText}>Processing scan...</Text>
            </View>
        );
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
                        Position QR code within frame
                    </Text>
                    <Text style={styles.offlineNote}>
                        Works offline with basic validation
                    </Text>
                </View>
            </RNCamera>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    camera: {
        flex: 1,
    },
    overlay: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.5)',
    },
    scanFrame: {
        width: 250,
        height: 250,
        borderWidth: 2,
        borderColor: '#00FF00',
        borderRadius: 10,
        marginBottom: 20,
    },
    instruction: {
        color: 'white',
        fontSize: 16,
        textAlign: 'center',
        marginBottom: 10,
    },
    offlineNote: {
        color: '#ccc',
        fontSize: 12,
        textAlign: 'center',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'black',
    },
    loadingText: {
        color: 'white',
        fontSize: 18,
    },
});

export default OfflineVendorScanner;
```

### 4. Conflict Resolution Service

```java
@Service
public class ConflictResolutionService {
    
    @Autowired
    private DataVersioningService versioningService;
    
    @Autowired
    private EntityRepository entityRepository;
    
    /**
     * Check for conflicts between local and server data
     */
    public ConflictResolutionResult checkForConflicts(SyncQueueItem syncItem) {
        
        // Get server version
        Entity serverEntity = entityRepository
            .findById(syncItem.getEntityType(), syncItem.getEntityId());
        
        // Get local version
        Entity localEntity = JSON.parse(syncItem.getEntityData(), Entity.class);
        
        if (serverEntity == null) {
            // No server entity, no conflict
            return ConflictResolutionResult.builder()
                .hasConflict(false)
                .build();
        }
        
        // Compare versions
        if (serverEntity.getVersion().equals(localEntity.getVersion())) {
            // Same version, no conflict
            return ConflictResolutionResult.builder()
                .hasConflict(false)
                .build();
        }
        
        // Conflict detected - analyze differences
        ConflictAnalysis analysis = analyzeConflict(serverEntity, localEntity, syncItem);
        
        // Recommend resolution strategy
        ConflictResolutionStrategy strategy = recommendResolutionStrategy(analysis);
        
        return ConflictResolutionResult.builder()
            .hasConflict(true)
            .serverData(serverEntity)
            .localData(localEntity)
            .conflictAnalysis(analysis)
            .recommendedStrategy(strategy)
            .conflictDetails(createConflictDetails(serverEntity, localEntity))
            .build();
    }
    
    private ConflictAnalysis analyzeConflict(Entity serverEntity, Entity localEntity, SyncQueueItem syncItem) {
        
        // Analyze time difference
        Duration timeDifference = Duration.between(
            serverEntity.getLastUpdated(), 
            localEntity.getLastUpdated()
        );
        
        // Analyze field differences
        List<FieldDifference> fieldDifferences = compareFields(serverEntity, localEntity);
        
        // Analyze business impact
        BusinessImpact impact = assessBusinessImpact(serverEntity, localEntity, syncItem);
        
        return ConflictAnalysis.builder()
            .timeDifference(timeDifference)
            .fieldDifferences(fieldDifferences)
            .businessImpact(impact)
            .conflictSeverity(calculateConflictSeverity(fieldDifferences, impact))
            .build();
    }
    
    private ConflictResolutionStrategy recommendResolutionStrategy(ConflictAnalysis analysis) {
        
        // Auto-resolve simple conflicts
        if (analysis.getFieldDifferences().size() == 1) {
            FieldDifference diff = analysis.getFieldDifferences().get(0);
            
            // Server wins for critical fields
            if (isCriticalField(diff.getFieldName())) {
                return ConflictResolutionStrategy.SERVER_WINS;
            }
            
            // Client wins for user-generated fields
            if (isUserGeneratedField(diff.getFieldName())) {
                return ConflictResolutionStrategy.CLIENT_WINS;
            }
        }
        
        // Low impact conflicts - auto-merge
        if (analysis.getBusinessImpact().getSeverity() == BusinessImpactSeverity.LOW) {
            return ConflictResolutionStrategy.MERGE;
        }
        
        // High impact conflicts - manual resolution
        if (analysis.getBusinessImpact().getSeverity() == BusinessImpactSeverity.HIGH) {
            return ConflictResolutionStrategy.MANUAL_RESOLUTION;
        }
        
        // Default to server wins for medium impact
        return ConflictResolutionStrategy.SERVER_WINS;
    }
    
    /**
     * Attempt automatic merge of conflicting entities
     */
    public Entity attemptMerge(Entity serverEntity, Entity localEntity, ConflictAnalysis analysis) {
        
        try {
            Entity mergedEntity = serverEntity.clone();
            
            // Merge non-conflicting fields
            for (FieldDifference diff : analysis.getFieldDifferences()) {
                if (!isConflictingField(diff)) {
                    mergedEntity.setFieldValue(diff.getFieldName(), diff.getLocalValue());
                }
            }
            
            // Update version and timestamp
            mergedEntity.setVersion(generateNewVersion(serverEntity.getVersion(), localEntity.getVersion()));
            mergedEntity.setLastUpdated(LocalDateTime.now());
            mergedEntity.setMergeNote("Automatic merge of conflicting versions");
            
            return mergedEntity;
            
        } catch (Exception e) {
            log.error("Failed to merge entities", e);
            return null;
        }
    }
}
```

This offline-first architecture ensures the system remains functional in areas with poor connectivity, automatically syncs data when connectivity is restored, and handles conflicts intelligently - essential for reliable operation across diverse Indian urban environments.
