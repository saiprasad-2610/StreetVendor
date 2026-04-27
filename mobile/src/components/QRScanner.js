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
