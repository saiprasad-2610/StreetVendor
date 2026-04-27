import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ActivityIndicator, Image, Modal, TextInput, ScrollView } from 'react-native';
import { CameraView, Camera, useCameraPermissions } from 'expo-camera';
import * as Location from 'expo-location';
import { MapPin, X, Send, ShieldCheck, ShieldAlert, AlertTriangle, FileText, Camera as CameraIcon } from 'lucide-react-native';
import api from '../services/api';

const ScanQRScreen = ({ navigation, route }: any) => {
  const isPublic = route.params?.isPublic || false;
  const [permission, requestPermission] = useCameraPermissions();
  const [scanning, setScanning] = useState(true);
  const [loading, setLoading] = useState(false);
  const [location, setLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [accuracy, setAccuracy] = useState<number | null>(null);
  const [locationHistory, setLocationHistory] = useState<{ latitude: number; longitude: number; accuracy: number }[]>([]);
  const [vendorInfo, setVendorInfo] = useState<any>(null);
  const [showReportModal, setShowReportModal] = useState(false);
  const [violationDesc, setViolationDesc] = useState('');
  const [reporterName, setReporterName] = useState('');
  const [reporterPhone, setReporterPhone] = useState('');
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [takingPhoto, setTakingPhoto] = useState(false);
  const [gpsStatus, setGpsStatus] = useState<'initializing' | 'good' | 'poor' | 'failed'>('initializing');
  const [showManualLocation, setShowManualLocation] = useState(false);
  const [manualLat, setManualLat] = useState('');
  const [manualLng, setManualLng] = useState('');
  const cameraRef = React.useRef<any>(null);

  // Get location with progressive fallback strategy
  const getLocationWithFallback = async (): Promise<{ latitude: number; longitude: number; accuracy: number } | null> => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission denied', 'Location access is required for scanning.');
      setGpsStatus('failed');
      return null;
    }

    setGpsStatus('initializing');

    // Strategy 1: Try high accuracy GPS with averaging
    let loc = await tryHighAccuracyLocation();
    if (loc) {
      setGpsStatus('good');
      return loc;
    }

    // Strategy 2: Try medium accuracy
    setGpsStatus('poor');
    loc = await tryMediumAccuracyLocation();
    if (loc) {
      return loc;
    }

    // Strategy 3: Try low accuracy (network-based)
    loc = await tryLowAccuracyLocation();
    if (loc) {
      return loc;
    }

    // Strategy 4: Use last known location
    loc = await tryLastKnownLocation();
    if (loc) {
      Alert.alert('Using Last Known Location', 'GPS signal is weak. Using your last known location.');
      return loc;
    }

    setGpsStatus('failed');
    return null;
  };

  const tryHighAccuracyLocation = async (): Promise<{ latitude: number; longitude: number; accuracy: number } | null> => {
    const readings: { latitude: number; longitude: number; accuracy: number }[] = [];
    const maxReadings = 5;
    const minAccuracy = 20;

    for (let i = 0; i < maxReadings; i++) {
      try {
        const loc = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Highest,
        });

        if (loc.coords.accuracy && loc.coords.accuracy <= minAccuracy) {
          readings.push({
            latitude: loc.coords.latitude,
            longitude: loc.coords.longitude,
            accuracy: loc.coords.accuracy,
          });
        }
      } catch (err) {
        console.error('High accuracy location error:', err);
      }

      if (i < maxReadings - 1) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

    if (readings.length === 0) return null;

    const weights = readings.map(r => 1 / (r.accuracy * r.accuracy));
    const totalWeight = weights.reduce((sum, w) => sum + w, 0);

    const avgLat = readings.reduce((sum, r, i) => sum + r.latitude * weights[i], 0) / totalWeight;
    const avgLng = readings.reduce((sum, r, i) => sum + r.longitude * weights[i], 0) / totalWeight;
    const avgAccuracy = readings.reduce((sum, r) => sum + r.accuracy, 0) / readings.length;

    return { latitude: avgLat, longitude: avgLng, accuracy: avgAccuracy };
  };

  const tryMediumAccuracyLocation = async (): Promise<{ latitude: number; longitude: number; accuracy: number } | null> => {
    try {
      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      return {
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
        accuracy: loc.coords.accuracy || 50,
      };
    } catch (err) {
      return null;
    }
  };

  const tryLowAccuracyLocation = async (): Promise<{ latitude: number; longitude: number; accuracy: number } | null> => {
    try {
      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Low,
      });
      return {
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
        accuracy: loc.coords.accuracy || 100,
      };
    } catch (err) {
      return null;
    }
  };

  const tryLastKnownLocation = async (): Promise<{ latitude: number; longitude: number; accuracy: number } | null> => {
    try {
      const loc = await Location.getLastKnownPositionAsync();
      if (loc) {
        return {
          latitude: loc.coords.latitude,
          longitude: loc.coords.longitude,
          accuracy: loc.coords.accuracy || 100,
        };
      }
    } catch (err) {
      console.error('Last known location error:', err);
    }
    return null;
  };

  // Start continuous location tracking (like Google Maps)
  const startContinuousLocationTracking = () => {
    const subscription = Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.Highest,
        timeInterval: 1000, // Update every second
        distanceInterval: 5, // Update only if moved 5 meters
      },
      (newLocation) => {
        const loc = {
          latitude: newLocation.coords.latitude,
          longitude: newLocation.coords.longitude,
          accuracy: newLocation.coords.accuracy || 50,
        };
        setLocation(loc);
        setAccuracy(loc.accuracy);
        setLocationHistory(prev => [...prev, loc]);

        // Update status based on accuracy
        if (loc.accuracy < 10) {
          setGpsStatus('good');
        } else if (loc.accuracy < 50) {
          setGpsStatus('poor');
        }
      }
    );

    return subscription;
  };

  // Open Google Maps to get current location
  const openGoogleMapsForLocation = () => {
    Linking.openURL('https://www.google.com/maps');
  };

  useEffect(() => {
    (async () => {
      const loc = await getLocationWithFallback();
      if (loc) {
        setLocation({ latitude: loc.latitude, longitude: loc.longitude });
        setAccuracy(loc.accuracy);
        setLocationHistory([loc]);
      }
    })();
  }, []);

  const onBarcodeScanned = async ({ data }: { data: string }) => {
    if (!scanning) return;
    setScanning(false);
    setLoading(true);

    let vendorId = data;
    try {
      const parsedData = JSON.parse(data);
      vendorId = parsedData.id || data;
    } catch (err) {}

    // CRITICAL: Refresh location before each scan for real-time accuracy
    const freshLocation = await getLocationWithFallback();
    if (!freshLocation) {
      Alert.alert(
        'Location Required',
        'Unable to get your location. Please enable GPS or enter location manually.',
        [
          { text: 'Cancel', onPress: () => { setScanning(true); setLoading(false); } },
          { text: 'Enter Manually', onPress: () => { setShowManualLocation(true); setLoading(false); } }
        ]
      );
      return;
    }

    const loc = {
      latitude: freshLocation.latitude,
      longitude: freshLocation.longitude,
    };
    setLocation(loc);
    setAccuracy(freshLocation.accuracy);
    setLocationHistory(prev => [...prev, freshLocation]);

    await performScan(vendorId, loc, freshLocation.accuracy);
  };

  const performScan = async (vendorId: string, loc: { latitude: number, longitude: number }, gpsAccuracy: number) => {
    try {
      const response = await api.post('/scan/validate', {
        vendorId,
        latitude: loc.latitude,
        longitude: loc.longitude,
        gpsAccuracy: gpsAccuracy,
      });
      setVendorInfo(response.data);
    } catch (error: any) {
      Alert.alert('Scan Failed', error.response?.data?.message || 'Failed to validate vendor');
      setScanning(true);
    } finally {
      setLoading(false);
    }
  };

  const handleTakePhoto = async () => {
    if (cameraRef.current) {
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.5, base64: true });
      setCapturedImage(photo.uri);
      setTakingPhoto(false);
    }
  };

  const submitViolation = async () => {
    if (!violationDesc) {
      Alert.alert('Error', 'Please provide a description');
      return;
    }

    if (isPublic && (!reporterName || !reporterPhone)) {
      Alert.alert('Error', 'Please provide your name and phone number');
      return;
    }

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('vendorId', vendorInfo.vendorId);
      formData.append('description', violationDesc);
      formData.append('gpsLatitude', (location?.latitude || 0).toString());
      formData.append('gpsLongitude', (location?.longitude || 0).toString());

      if (isPublic) {
        formData.append('reporterName', reporterName);
        formData.append('reporterPhone', reporterPhone);
      }

      if (capturedImage) {
        const uriParts = capturedImage.split('.');
        const fileType = uriParts[uriParts.length - 1];

        formData.append('image', {
          uri: capturedImage,
          name: `violation_${Date.now()}.${fileType}`,
          type: `image/${fileType}`,
        } as any);
      }

      await api.post('/violations/report', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      Alert.alert('Success', 'Violation reported successfully');
      setShowReportModal(false);
      setVendorInfo(null);
      setScanning(true);
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.message || 'Failed to report violation');
    } finally {
      setLoading(false);
    }
  };

  const handleManualLocationSubmit = () => {
    const lat = parseFloat(manualLat);
    const lng = parseFloat(manualLng);

    if (isNaN(lat) || isNaN(lng)) {
      Alert.alert('Invalid Input', 'Please enter valid latitude and longitude');
      return;
    }

    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      Alert.alert('Invalid Coordinates', 'Latitude must be between -90 and 90, Longitude between -180 and 180');
      return;
    }

    setLocation({ latitude: lat, longitude: lng });
    setAccuracy(0); // Manual entry has no accuracy
    setShowManualLocation(false);

    Alert.alert('Location Set', 'Manual location set successfully. You can now scan the vendor.');
  };

  if (!permission) {
    return <View style={styles.centerContainer}><ActivityIndicator /></View>;
  }

  if (!permission.granted) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.messageText}>We need your permission to show the camera</Text>
        <TouchableOpacity onPress={requestPermission} style={styles.resetButton}>
          <Text style={styles.resetButtonText}>Grant Permission</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2563eb" />
        <Text style={styles.loadingText}>Validating Vendor...</Text>
      </View>
    );
  }

  if (takingPhoto) {
    return (
      <View style={styles.cameraContainer}>
        <CameraView
          ref={cameraRef}
          style={styles.preview}
        />
        <View style={styles.cameraControls}>
          <TouchableOpacity style={styles.captureButton} onPress={handleTakePhoto}>
            <View style={styles.captureInner} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.cancelCameraButton} onPress={() => setTakingPhoto(false)}>
            <X color="#fff" size={30} />
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {scanning ? (
        <View style={styles.cameraContainer}>
          <CameraView
            style={styles.preview}
            onBarcodeScanned={onBarcodeScanned}
            barcodeScannerSettings={{
              barcodeTypes: ["qr"],
            }}
          />
          <View style={styles.overlay}>
            <Text style={styles.centerText}>Scan Vendor QR Code</Text>
            {gpsStatus === 'initializing' && (
              <View style={styles.accuracyBadge}>
                <Text style={styles.accuracyText}>🔄 Getting GPS...</Text>
              </View>
            )}
            {gpsStatus === 'good' && accuracy !== null && (
              <View style={[styles.accuracyBadge, { backgroundColor: 'rgba(34, 197, 94, 0.8)' }]}>
                <Text style={styles.accuracyText}>
                  ✓ GPS: ±{accuracy.toFixed(1)}m (High Accuracy)
                </Text>
              </View>
            )}
            {gpsStatus === 'poor' && accuracy !== null && (
              <View style={[styles.accuracyBadge, { backgroundColor: 'rgba(234, 179, 8, 0.8)' }]}>
                <Text style={styles.accuracyText}>
                  ⚠ GPS: ±{accuracy.toFixed(1)}m (Low Accuracy)
                </Text>
              </View>
            )}
            {gpsStatus === 'failed' && (
              <View style={[styles.accuracyBadge, { backgroundColor: 'rgba(239, 68, 68, 0.8)' }]}>
                <Text style={styles.accuracyText}>
                  ✗ GPS Failed - Tap to retry
                </Text>
              </View>
            )}
            <TouchableOpacity style={styles.buttonTouchable} onPress={() => navigation.goBack()}>
              <Text style={styles.buttonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : vendorInfo ? (
        <ScrollView contentContainerStyle={styles.resultContainer}>
          <View style={[styles.statusCard, { backgroundColor: vendorInfo.validationStatus === 'VALID' ? '#dcfce7' : '#fee2e2' }]}>
            {vendorInfo.validationStatus === 'VALID' ? (
              <ShieldCheck color="#16a34a" size={60} />
            ) : (
              <ShieldAlert color="#dc2626" size={60} />
            )}
            <Text style={[styles.statusText, { color: vendorInfo.validationStatus === 'VALID' ? '#16a34a' : '#dc2626' }]}>
              {vendorInfo.validationStatus}
            </Text>
            <Text style={styles.messageText}>{vendorInfo.message}</Text>
          </View>

          <View style={styles.infoCard}>
            <Text style={styles.infoTitle}>Vendor Details</Text>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Name:</Text>
              <Text style={styles.infoValue}>{vendorInfo.vendorName}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>ID:</Text>
              <Text style={styles.infoValue}>{vendorInfo.vendorId}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Category:</Text>
              <Text style={styles.infoValue}>{vendorInfo.category}</Text>
            </View>
          </View>

          <View style={styles.buttonRow}>
            <TouchableOpacity 
              style={[styles.actionButton, { backgroundColor: '#ef4444' }]} 
              onPress={() => setShowReportModal(true)}
            >
              <AlertTriangle color="#fff" size={20} />
              <Text style={styles.actionButtonText}>Report Violation</Text>
            </TouchableOpacity>
            
            {!isPublic && (
              <TouchableOpacity 
                style={[styles.actionButton, { backgroundColor: '#3b82f6' }]} 
                onPress={() => navigation.navigate('Challan', { vendorId: vendorInfo.vendorId })}
              >
                <FileText color="#fff" size={20} />
                <Text style={styles.actionButtonText}>Issue Challan</Text>
              </TouchableOpacity>
            )}
          </View>

          <TouchableOpacity style={styles.resetButton} onPress={() => setScanning(true)}>
            <Text style={styles.resetButtonText}>Scan Another</Text>
          </TouchableOpacity>
        </ScrollView>
      ) : null}

      <Modal visible={showReportModal} animationType="slide">
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Report Violation</Text>
            <TouchableOpacity onPress={() => setShowReportModal(false)}>
              <X color="#111827" size={24} />
            </TouchableOpacity>
          </View>
          
          <ScrollView style={styles.modalContent}>
            {isPublic && (
              <>
                <Text style={styles.inputLabel}>Your Name *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Enter your full name"
                  value={reporterName}
                  onChangeText={setReporterName}
                />
                
                <Text style={styles.inputLabel}>Your Phone Number *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Enter your 10-digit mobile number"
                  keyboardType="phone-pad"
                  maxLength={10}
                  value={reporterPhone}
                  onChangeText={setReporterPhone}
                />
              </>
            )}

            <Text style={styles.inputLabel}>Violation Description *</Text>
            <TextInput
              style={styles.textArea}
              placeholder="Describe the violation..."
              multiline
              numberOfLines={4}
              value={violationDesc}
              onChangeText={setViolationDesc}
            />

            <Text style={styles.inputLabel}>Photo Proof (Optional)</Text>
            {capturedImage ? (
              <View style={styles.imagePreviewContainer}>
                <Image source={{ uri: capturedImage }} style={styles.imagePreview} />
                <TouchableOpacity style={styles.removeImage} onPress={() => setCapturedImage(null)}>
                  <X color="#fff" size={20} />
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity style={styles.takePhotoButton} onPress={() => setTakingPhoto(true)}>
                <CameraIcon color="#3b82f6" size={40} />
                <Text style={styles.takePhotoButtonText}>Take Photo</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity style={styles.submitButton} onPress={submitViolation}>
              <Send color="#fff" size={20} />
              <Text style={styles.submitButtonText}>Submit Report</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>

      <Modal visible={showManualLocation} animationType="slide">
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Enter Location Manually</Text>
            <TouchableOpacity onPress={() => setShowManualLocation(false)}>
              <X color="#111827" size={24} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            <TouchableOpacity style={styles.googleMapsButton} onPress={openGoogleMapsForLocation}>
              <MapPin color="#4285F4" size={20} />
              <Text style={styles.googleMapsButtonText}>Open Google Maps to Get Location</Text>
            </TouchableOpacity>

            <Text style={styles.dividerText}>OR ENTER MANUALLY</Text>

            <Text style={styles.inputLabel}>Latitude *</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g., 17.6599"
              value={manualLat}
              onChangeText={setManualLat}
              keyboardType="decimal-pad"
            />

            <Text style={styles.inputLabel}>Longitude *</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g., 75.9064"
              value={manualLng}
              onChangeText={setManualLng}
              keyboardType="decimal-pad"
            />

            <Text style={styles.infoText}>
              Tip: In Google Maps, tap and hold on your location to see coordinates.
            </Text>

            <TouchableOpacity style={styles.submitButton} onPress={handleManualLocationSubmit}>
              <Send color="#fff" size={20} />
              <Text style={styles.submitButtonText}>Set Location</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#4b5563',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 100,
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  centerText: {
    fontSize: 18,
    color: '#fff',
    textAlign: 'center',
    fontWeight: 'bold',
  },
  buttonText: {
    fontSize: 18,
    color: '#fff',
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  buttonTouchable: {
    padding: 16,
  },
  resultContainer: {
    padding: 20,
    alignItems: 'center',
  },
  statusCard: {
    width: '100%',
    padding: 24,
    borderRadius: 16,
    alignItems: 'center',
    marginBottom: 20,
  },
  statusText: {
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 12,
  },
  messageText: {
    fontSize: 16,
    textAlign: 'center',
    color: '#4b5563',
    marginTop: 8,
  },
  infoCard: {
    width: '100%',
    backgroundColor: '#f9fafb',
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#111827',
  },
  infoRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  infoLabel: {
    width: 100,
    color: '#6b7280',
    fontWeight: '600',
  },
  infoValue: {
    flex: 1,
    color: '#111827',
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 20,
  },
  actionButton: {
    flex: 0.48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 8,
    gap: 8,
  },
  actionButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  resetButton: {
    padding: 12,
    backgroundColor: '#3b82f6',
    borderRadius: 8,
    marginTop: 20,
  },
  resetButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  modalContent: {
    padding: 20,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    color: '#374151',
  },
  input: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#1e293b',
    backgroundColor: '#f8fafc',
    marginBottom: 16,
  },
  infoText: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 20,
    fontStyle: 'italic',
  },
  googleMapsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4285F4',
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
    gap: 10,
  },
  googleMapsButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  dividerText: {
    textAlign: 'center',
    color: '#9ca3af',
    fontSize: 12,
    marginBottom: 20,
    fontWeight: '600',
  },
  textArea: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    padding: 12,
    height: 120,
    textAlignVertical: 'top',
    marginBottom: 20,
  },
  takePhotoButton: {
    height: 150,
    borderWidth: 2,
    borderColor: '#3b82f6',
    borderStyle: 'dashed',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    backgroundColor: '#eff6ff',
  },
  takePhotoButtonText: {
    marginTop: 8,
    color: '#3b82f6',
    fontWeight: '600',
  },
  imagePreviewContainer: {
    width: '100%',
    height: 200,
    borderRadius: 12,
    marginBottom: 20,
    position: 'relative',
  },
  imagePreview: {
    width: '100%',
    height: '100%',
    borderRadius: 12,
  },
  removeImage: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 20,
    padding: 5,
  },
  submitButton: {
    backgroundColor: '#10b981',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
    borderRadius: 8,
    gap: 10,
    marginBottom: 40,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  cameraContainer: {
    flex: 1,
    backgroundColor: '#000',
  },
  preview: {
    flex: 1,
  },
  cameraControls: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 40,
    backgroundColor: 'rgba(0,0,0,0.5)',
    position: 'absolute',
    bottom: 0,
    width: '100%',
  },
  captureButton: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  captureInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 2,
    borderColor: '#000',
  },
  cancelCameraButton: {
    position: 'absolute',
    right: 30,
    bottom: 60,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  accuracyBadge: {
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginTop: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  accuracyText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
});

export default ScanQRScreen;
