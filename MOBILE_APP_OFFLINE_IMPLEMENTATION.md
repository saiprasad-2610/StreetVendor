# 📱 Mobile App with Offline Support

## 📋 Practical React Native App for SMC

### 1. App Structure & Dependencies

```json
// package.json
{
  "name": "smc-vendor-app",
  "version": "1.0.0",
  "dependencies": {
    "react": "18.2.0",
    "react-native": "0.72.0",
    "@react-navigation/native": "^6.1.0",
    "@react-navigation/stack": "^6.3.0",
    "react-native-camera": "^4.2.1",
    "react-native-qrcode-scanner": "^1.5.5",
    "@react-native-async-storage/async-storage": "^1.19.0",
    "react-native-sqlite-storage": "^6.0.1",
    "react-native-permissions": "^3.8.0",
    "react-native-geolocation-service": "^5.3.0",
    "react-native-netinfo": "^9.4.0",
    "axios": "^1.4.0",
    "react-native-image-picker": "^5.6.0",
    "react-native-maps": "^1.7.0",
    "react-native-vector-icons": "^10.0.0"
  }
}
```

### 2. Offline Storage Service

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
        name: 'SMCOffline.db',
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
      
      `CREATE TABLE IF NOT EXISTS violation_reports (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        vendor_id TEXT,
        violation_type TEXT,
        description TEXT,
        latitude REAL,
        longitude REAL,
        image_path TEXT,
        reporter_name TEXT,
        reporter_phone TEXT,
        timestamp TEXT,
        sync_status TEXT DEFAULT 'pending'
      )`,
      
      `CREATE TABLE IF NOT EXISTS sync_queue (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        entity_type TEXT,
        entity_id TEXT,
        operation TEXT,
        entity_data TEXT,
        timestamp TEXT,
        retry_count INTEGER DEFAULT 0
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
        if (zone.polygon_coordinates) {
          zone.polygon_coordinates = JSON.parse(zone.polygon_coordinates);
        }
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
        `INSERT INTO violation_reports 
        (vendor_id, violation_type, description, latitude, longitude, image_path, reporter_name, reporter_phone, timestamp, sync_status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          violationData.vendorId,
          violationData.violationType,
          violationData.description,
          violationData.latitude,
          violationData.longitude,
          violationData.imagePath,
          violationData.reporterName,
          violationData.reporterPhone,
          new Date().toISOString(),
          'pending'
        ]
      );

      const reportId = result.insertId;

      // Add to sync queue
      await this.addToSyncQueue({
        entityType: 'violation_report',
        entityId: reportId.toString(),
        operation: 'create',
        entityData: JSON.stringify(violationData),
        timestamp: new Date().toISOString()
      });

      return { success: true, reportId };
    } catch (error) {
      console.error('Failed to report violation:', error);
      return { success: false, error: error.message };
    }
  }

  // Sync queue management
  async addToSyncQueue(item) {
    try {
      await this.executeSQL(
        `INSERT INTO sync_queue 
        (entity_type, entity_id, operation, entity_data, timestamp)
        VALUES (?, ?, ?, ?, ?)`,
        [
          item.entityType,
          item.entityId,
          item.operation,
          item.entityData,
          item.timestamp
        ]
      );
    } catch (error) {
      console.error('Failed to add to sync queue:', error);
    }
  }

  async processSyncQueue() {
    if (!this.isOnline) return;

    try {
      const queueResult = await this.executeSQL(
        'SELECT * FROM sync_queue WHERE retry_count < 3 ORDER BY timestamp ASC'
      );

      for (let i = 0; i < queueResult.rows.length; i++) {
        const item = queueResult.rows.item(i);
        await this.syncItem(item);
      }
    } catch (error) {
      console.error('Failed to process sync queue:', error);
    }
  }

  async syncItem(item) {
    try {
      const entityData = JSON.parse(item.entityData);
      
      let response;
      switch (item.entity_type) {
        case 'violation_report':
          response = await this.apiService.submitViolationReport(entityData);
          break;
        default:
          console.warn('Unknown entity type:', item.entity_type);
          return;
      }

      if (response.success) {
        // Mark as synced
        await this.executeSQL(
          'DELETE FROM sync_queue WHERE id = ?',
          [item.id]
        );
        
        // Update local record
        if (item.entity_type === 'violation_report') {
          await this.executeSQL(
            'UPDATE violation_reports SET sync_status = ? WHERE id = ?',
            ['synced', item.entity_id]
          );
        }
      } else {
        // Increment retry count
        await this.executeSQL(
          'UPDATE sync_queue SET retry_count = retry_count + 1 WHERE id = ?',
          [item.id]
        );
      }
    } catch (error) {
      console.error('Failed to sync item:', item.id, error);
    }
  }

  // Data preloading for offline use
  async preloadEssentialData() {
    try {
      if (!this.isOnline) {
        console.log('Cannot preload data - offline');
        return;
      }

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

  async getSyncQueueCount() {
    try {
      const result = await this.executeSQL('SELECT COUNT(*) as count FROM sync_queue');
      return result.rows.item(0).count;
    } catch (error) {
      console.error('Failed to get sync queue count:', error);
      return 0;
    }
  }

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
}

export default new OfflineStorageService();
```

### 3. QR Scanner Component

```javascript
// components/QRScanner.js
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Alert, Vibration, PermissionsAndroid, Platform } from 'react-native';
import { RNCamera } from 'react-native-camera';
import Geolocation from '@react-native-community/geolocation';
import offlineStorage from '../services/OfflineStorageService';
import apiService from '../services/APIService';

const QRScanner = ({ navigation, onScanComplete }) => {
  const [scanning, setScanning] = useState(true);
  const [loading, setLoading] = useState(false);
  const [hasPermission, setHasPermission] = useState(false);

  useEffect(() => {
    requestCameraPermission();
  }, []);

  const requestCameraPermission = async () => {
    if (Platform.OS === 'android') {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.CAMERA,
        {
          title: 'Camera Permission',
          message: 'SMC Vendor App needs access to your camera to scan QR codes',
          buttonNeutral: 'Ask Me Later',
          buttonNegative: 'Cancel',
          buttonPositive: 'OK',
        }
      );
      setHasPermission(granted === PermissionsAndroid.RESULTS.GRANTED);
    } else {
      setHasPermission(true);
    }
  };

  const getCurrentLocation = () => {
    return new Promise((resolve, reject) => {
      Geolocation.getCurrentPosition(
        (position) => {
          resolve({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy
          });
        },
        (error) => {
          console.error('Location error:', error);
          reject(error);
        },
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 }
      );
    });
  };

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
        scanData = await apiService.scanVendorQR({
          qrData: scanResult.data,
          location: location
        });
      } catch (onlineError) {
        console.log('Online scan failed, trying offline:', onlineError);
        scanData = await performOfflineScan(scanResult.data, location);
      }
      
      if (scanData.success) {
        onScanComplete(scanData.data);
      } else {
        Alert.alert('Scan Failed', scanData.message || 'Invalid QR code');
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
      
      // Simple distance check (for radius-based zones)
      if (vendorZone.radius_meters) {
        const distance = calculateDistance(
          currentLocation.latitude,
          currentLocation.longitude,
          vendorZone.latitude,
          vendorZone.longitude
        );
        return distance <= vendorZone.radius_meters;
      }
      
      // For polygon zones, we'd need more complex logic
      // For simplicity, return true for now
      return true;
    } catch (error) {
      console.error('Location validation failed:', error);
      return false;
    }
  };

  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c * 1000; // Distance in meters
  };

  const extractVendorIdFromQR = (qrData) => {
    // Simple QR parsing logic
    try {
      if (qrData.includes('vendor_id=')) {
        const match = qrData.match(/vendor_id=([^&]+)/);
        return match ? match[1] : null;
      }
      return qrData; // Assume QR data is just the vendor ID
    } catch (error) {
      return null;
    }
  };

  if (!hasPermission) {
    return (
      <View style={styles.container}>
        <Text style={styles.message}>Camera permission is required to scan QR codes</Text>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={styles.container}>
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
        androidCameraPermissionOptions={{
          title: 'Permission to use camera',
          message: 'We need your permission to use the camera',
          buttonPositive: 'OK',
          buttonNegative: 'Cancel',
        }}
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
    backgroundColor: 'black',
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
  message: {
    color: 'white',
    fontSize: 18,
    textAlign: 'center',
    padding: 20,
  },
  loadingText: {
    color: 'white',
    fontSize: 18,
    textAlign: 'center',
  },
});

export default QRScanner;
```

### 4. Main App Component

```javascript
// App.js
import React, { useState, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { View, Text, StyleSheet, StatusBar, NetInfo } from 'react-native';
import offlineStorage from './services/OfflineStorageService';
import QRScanner from './components/QRScanner';
import VendorList from './components/VendorList';
import ViolationReport from './components/ViolationReport';
import SyncStatus from './components/SyncStatus';

const Stack = createStackNavigator();

const App = () => {
  const [isOnline, setIsOnline] = useState(true);
  const [syncQueueCount, setSyncQueueCount] = useState(0);

  useEffect(() => {
    initializeApp();
    setupNetworkListener();
    
    // Preload data for offline use
    offlineStorage.preloadEssentialData();
  }, []);

  const initializeApp = async () => {
    try {
      // Initialize offline storage
      await offlineStorage.initDatabase();
      
      // Check sync queue
      const count = await offlineStorage.getSyncQueueCount();
      setSyncQueueCount(count);
      
      console.log('App initialized successfully');
    } catch (error) {
      console.error('Failed to initialize app:', error);
    }
  };

  const setupNetworkListener = () => {
    NetInfo.addEventListener(state => {
      setIsOnline(state.isConnected);
      
      // Process sync queue when coming online
      if (state.isConnected) {
        offlineStorage.processSyncQueue();
      }
    });
  };

  const HomeScreen = ({ navigation }) => (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#1a237e" />
      
      <View style={styles.header}>
        <Text style={styles.title}>SMC Vendor Management</Text>
        <SyncStatus isOnline={isOnline} syncQueueCount={syncQueueCount} />
      </View>
      
      <View style={styles.content}>
        <QRScanner
          onScanComplete={(vendorData) => {
            navigation.navigate('VendorDetails', { vendorData });
          }}
        />
      </View>
      
      <View style={styles.footer}>
        <Text style={styles.footerText}>
          {isOnline ? 'Online' : 'Offline - Changes will sync when online'}
        </Text>
      </View>
    </View>
  );

  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerStyle: { backgroundColor: '#1a237e' },
          headerTintColor: '#ffffff',
          headerTitleStyle: { fontWeight: 'bold' },
        }}
      >
        <Stack.Screen
          name="Home"
          component={HomeScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="VendorList"
          component={VendorList}
          options={{ title: 'Nearby Vendors' }}
        />
        <Stack.Screen
          name="ViolationReport"
          component={ViolationReport}
          options={{ title: 'Report Violation' }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a237e',
  },
  header: {
    padding: 20,
    paddingTop: 40,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: 10,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  footer: {
    padding: 20,
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  footerText: {
    color: '#ffffff',
    textAlign: 'center',
    fontSize: 14,
  },
});

export default App;
```

### 5. API Service with Offline Support

```javascript
// services/APIService.js
import axios from 'axios';
import offlineStorage from './OfflineStorageService';

const API_BASE_URL = 'https://api.smc.gov.in/api';

class APIService {
  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Request interceptor for auth token
    this.client.interceptors.request.use(async (config) => {
      const token = await offlineStorage.getAuthToken();
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    });

    // Response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => response,
      async (error) => {
        if (error.response?.status === 401) {
          // Handle token refresh
          await this.refreshToken();
        }
        return Promise.reject(error);
      }
    );
  }

  async scanVendorQR(scanData) {
    try {
      const response = await this.client.post('/public/scan-vendor', scanData);
      return { success: true, data: response.data };
    } catch (error) {
      if (error.response) {
        return { 
          success: false, 
          message: error.response.data.message || 'Scan failed' 
        };
      }
      throw error; // Re-throw for offline handling
    }
  }

  async getAllVendors() {
    try {
      const response = await this.client.get('/public/vendors');
      return { success: true, data: response.data };
    } catch (error) {
      if (error.response) {
        return { 
          success: false, 
          message: error.response.data.message || 'Failed to fetch vendors' 
        };
      }
      throw error;
    }
  }

  async getAllZones() {
    try {
      const response = await this.client.get('/public/zones');
      return { success: true, data: response.data };
    } catch (error) {
      if (error.response) {
        return { 
          success: false, 
          message: error.response.data.message || 'Failed to fetch zones' 
        };
      }
      throw error;
    }
  }

  async submitViolationReport(reportData) {
    try {
      const formData = new FormData();
      
      // Add form fields
      Object.keys(reportData).forEach(key => {
        if (key !== 'image') {
          formData.append(key, reportData[key]);
        }
      });

      // Add image if exists
      if (reportData.image) {
        formData.append('image', {
          uri: reportData.image.uri,
          type: reportData.image.type,
          name: reportData.image.name || 'violation.jpg',
        });
      }

      const response = await this.client.post('/public/report-violation', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      return { success: true, data: response.data };
    } catch (error) {
      if (error.response) {
        return { 
          success: false, 
          message: error.response.data.message || 'Failed to submit report' 
        };
      }
      throw error;
    }
  }

  async refreshToken() {
    try {
      const refreshToken = await offlineStorage.getRefreshToken();
      if (!refreshToken) {
        throw new Error('No refresh token available');
      }

      const response = await this.client.post('/auth/refresh', {
        refreshToken,
      });

      const { token, refreshToken: newRefreshToken } = response.data;
      
      await offlineStorage.setAuthToken(token);
      if (newRefreshToken) {
        await offlineStorage.setRefreshToken(newRefreshToken);
      }

      return token;
    } catch (error) {
      console.error('Token refresh failed:', error);
      await offlineStorage.clearAuthTokens();
      throw error;
    }
  }
}

export default new APIService();
```

This mobile app implementation provides **essential offline capabilities** for SMC vendors and citizens, ensuring the system works reliably even in areas with poor connectivity.
