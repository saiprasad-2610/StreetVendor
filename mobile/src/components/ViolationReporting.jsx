import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  Image,
  Platform,
  PermissionsAndroid,
  Modal,
  Picker
} from 'react-native';
import { Camera, useCameraDevices } from 'react-native-vision-camera';
import ImagePicker from 'react-native-image-picker';
import Geolocation from '@react-native-community/geolocation';
import offlineStorage from '../services/OfflineStorageService';
import apiService from '../services/APIService';

const ViolationReporting = ({ navigation }) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    vendorId: '',
    violationType: '',
    description: '',
    reporterName: '',
    reporterPhone: '',
    latitude: null,
    longitude: null,
    imageUri: null
  });
  const [isOnline, setIsOnline] = useState(true);
  const [showCamera, setShowCamera] = useState(false);
  const [devices] = useCameraDevices();
  const device = devices.back;

  useEffect(() => {
    checkConnectivity();
    getCurrentLocation();
  }, []);

  const checkConnectivity = async () => {
    try {
      const netInfo = await fetch('https://www.google.com', { method: 'HEAD' })
        .then(() => true)
        .catch(() => false);
      setIsOnline(netInfo);
    } catch (error) {
      setIsOnline(false);
    }
  };

  const getCurrentLocation = () => {
    const requestLocationPermission = async () => {
      if (Platform.OS === 'android') {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
          {
            title: 'Location Permission Required',
            message: 'This app needs access to your location to report violations',
            buttonNeutral: 'Ask Me Later',
            buttonNegative: 'Cancel',
            buttonPositive: 'OK',
          }
        );
        return granted === PermissionsAndroid.RESULTS.GRANTED;
      }
      return true;
    };

    const getLocation = () => {
      Geolocation.getCurrentPosition(
        (position) => {
          setFormData(prev => ({
            ...prev,
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
          }));
        },
        (error) => {
          console.error('Location error:', error);
          Alert.alert('Error', 'Failed to get location. Please enable location services.');
        },
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 }
      );
    };

    requestLocationPermission().then(granted => {
      if (granted) {
        getLocation();
      }
    });
  };

  const selectImage = () => {
    const options = {
      mediaType: 'photo',
      quality: 0.8,
      maxWidth: 800,
      maxHeight: 600,
    };

    ImagePicker.launchImageLibrary(options, (response) => {
      if (response.assets && response.assets[0]) {
        setFormData(prev => ({
          ...prev,
          imageUri: response.assets[0].uri
        }));
      }
    });
  };

  const takePhoto = () => {
    const options = {
      mediaType: 'photo',
      quality: 0.8,
      maxWidth: 800,
      maxHeight: 600,
    };

    ImagePicker.launchCamera(options, (response) => {
      if (response.assets && response.assets[0]) {
        setFormData(prev => ({
          ...prev,
          imageUri: response.assets[0].uri
        }));
      }
    });
  };

  const validateForm = () => {
    if (!formData.reporterName.trim()) {
      Alert.alert('Error', 'Please enter your name');
      return false;
    }

    if (!formData.reporterPhone.trim()) {
      Alert.alert('Error', 'Please enter your phone number');
      return false;
    }

    if (!/^[6-9]\d{9}$/.test(formData.reporterPhone)) {
      Alert.alert('Error', 'Please enter a valid 10-digit phone number');
      return false;
    }

    if (!formData.violationType) {
      Alert.alert('Error', 'Please select violation type');
      return false;
    }

    if (!formData.description.trim()) {
      Alert.alert('Error', 'Please describe the violation');
      return false;
    }

    if (formData.description.length < 10) {
      Alert.alert('Error', 'Description must be at least 10 characters');
      return false;
    }

    if (formData.description.length > 500) {
      Alert.alert('Error', 'Description must not exceed 500 characters');
      return false;
    }

    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      const violationData = {
        vendorId: formData.vendorId,
        violationType: formData.violationType,
        description: formData.description,
        reporterName: formData.reporterName,
        reporterPhone: formData.reporterPhone,
        latitude: formData.latitude,
        longitude: formData.longitude,
        imageUri: formData.imageUri
      };

      if (isOnline) {
        // Try online submission first
        try {
          const response = await apiService.submitViolationReport(violationData);
          Alert.alert(
            'Success',
            `Violation reported successfully! Report ID: ${response.data.reportId}`,
            [{ text: 'OK', onPress: () => navigation.goBack() }]
          );
        } catch (onlineError) {
          console.log('Online submission failed, saving offline:', onlineError);
          // Save offline if online fails
          await saveOffline(violationData);
        }
      } else {
        // Save offline immediately
        await saveOffline(violationData);
      }
    } catch (error) {
      console.error('Submission error:', error);
      Alert.alert('Error', 'Failed to submit violation report');
    } finally {
      setLoading(false);
    }
  };

  const saveOffline = async (violationData) => {
    try {
      const result = await offlineStorage.reportViolation(violationData);
      
      if (result.success) {
        Alert.alert(
          'Saved Offline',
          'Your violation report has been saved and will be submitted when you are back online.',
          [{ text: 'OK', onPress: () => navigation.goBack() }]
        );
      } else {
        Alert.alert('Error', 'Failed to save violation report');
      }
    } catch (error) {
      console.error('Offline save error:', error);
      Alert.alert('Error', 'Failed to save violation report');
    }
  };

  const violationTypes = [
    'LOCATION_VIOLATION',
    'TIME_RESTRICTION',
    'OVERCROWDING',
    'UNAUTHORIZED_VENDOR',
    'HYGIENE_ISSUE',
    'PRICE_COMPLAINT',
    'BEHAVIOR_ISSUE',
    'OTHER'
  ];

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Report Violation</Text>
        <Text style={styles.subtitle}>
          {isOnline ? 'Online - Reports will be submitted immediately' : 'Offline - Reports will be saved and synced later'}
        </Text>
      </View>

      <View style={styles.form}>
        <View style={styles.formGroup}>
          <Text style={styles.label}>Your Name *</Text>
          <TextInput
            style={styles.input}
            value={formData.reporterName}
            onChangeText={(text) => setFormData(prev => ({ ...prev, reporterName: text }))}
            placeholder="Enter your full name"
            maxLength={100}
          />
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Phone Number *</Text>
          <TextInput
            style={styles.input}
            value={formData.reporterPhone}
            onChangeText={(text) => setFormData(prev => ({ ...prev, reporterPhone: text }))}
            placeholder="Enter your 10-digit phone number"
            keyboardType="phone-pad"
            maxLength={10}
          />
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Vendor ID (Optional)</Text>
          <TextInput
            style={styles.input}
            value={formData.vendorId}
            onChangeText={(text) => setFormData(prev => ({ ...prev, vendorId: text }))}
            placeholder="Enter vendor ID if known"
          />
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Violation Type *</Text>
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={formData.violationType}
              onValueChange={(value) => setFormData(prev => ({ ...prev, violationType: value }))}
              style={styles.picker}
            >
              <Picker.Item label="Select violation type" value="" />
              {violationTypes.map(type => (
                <Picker.Item
                  key={type}
                  label={type.replace('_', ' ').toLowerCase()}
                  value={type}
                />
              ))}
            </Picker>
          </View>
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Description *</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={formData.description}
            onChangeText={(text) => setFormData(prev => ({ ...prev, description: text }))}
            placeholder="Please describe the violation in detail (min 10, max 500 characters)"
            multiline
            numberOfLines={4}
            maxLength={500}
          />
          <Text style={styles.characterCount}>
            {formData.description.length}/500 characters
          </Text>
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Location</Text>
          <View style={styles.locationContainer}>
            {formData.latitude && formData.longitude ? (
              <View style={styles.locationInfo}>
                <Text style={styles.locationText}>
                  GPS: {formData.latitude.toFixed(6)}, {formData.longitude.toFixed(6)}
                </Text>
                <TouchableOpacity
                  style={styles.refreshButton}
                  onPress={getCurrentLocation}
                >
                  <Text style={styles.refreshButtonText}>Refresh Location</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity
                style={styles.locationButton}
                onPress={getCurrentLocation}
              >
                <Text style={styles.locationButtonText}>Get Current Location</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Photo Evidence</Text>
          <View style={styles.imageContainer}>
            {formData.imageUri ? (
              <View style={styles.imagePreview}>
                <Image source={{ uri: formData.imageUri }} style={styles.image} />
                <TouchableOpacity
                  style={styles.removeImageButton}
                  onPress={() => setFormData(prev => ({ ...prev, imageUri: null }))}
                >
                  <Text style={styles.removeImageText}>Remove</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.imageButtons}>
                <TouchableOpacity
                  style={[styles.imageButton, styles.cameraButton]}
                  onPress={takePhoto}
                >
                  <Text style={styles.imageButtonText}>Take Photo</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.imageButton, styles.galleryButton]}
                  onPress={selectImage}
                >
                  <Text style={styles.imageButtonText}>Choose from Gallery</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>

        <TouchableOpacity
          style={[styles.submitButton, loading && styles.disabledButton]}
          onPress={handleSubmit}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.submitButtonText}>
              {isOnline ? 'Submit Report' : 'Save Offline'}
            </Text>
          )}
        </TouchableOpacity>
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>
          Note: False reports may affect your credibility score.
        </Text>
        <Text style={styles.footerText}>
          Location and photo evidence improve report validation.
        </Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#1a237e',
    padding: 20,
    paddingTop: 40,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#fff',
    opacity: 0.8,
  },
  form: {
    padding: 20,
  },
  formGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  characterCount: {
    fontSize: 12,
    color: '#666',
    textAlign: 'right',
    marginTop: 4,
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    backgroundColor: '#fff',
  },
  picker: {
    height: 50,
  },
  locationContainer: {
    marginTop: 8,
  },
  locationInfo: {
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  locationText: {
    fontSize: 14,
    color: '#333',
    marginBottom: 8,
  },
  refreshButton: {
    backgroundColor: '#e3f2fd',
    padding: 8,
    borderRadius: 4,
    alignSelf: 'flex-start',
  },
  refreshButtonText: {
    color: '#1976d2',
    fontSize: 12,
    fontWeight: '600',
  },
  locationButton: {
    backgroundColor: '#e3f2fd',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  locationButtonText: {
    color: '#1976d2',
    fontSize: 16,
    fontWeight: '600',
  },
  imageContainer: {
    marginTop: 8,
  },
  imagePreview: {
    position: 'relative',
  },
  image: {
    width: '100%',
    height: 200,
    borderRadius: 8,
  },
  removeImageButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    padding: 8,
    borderRadius: 4,
  },
  removeImageText: {
    color: '#f44336',
    fontSize: 12,
    fontWeight: '600',
  },
  imageButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  imageButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  cameraButton: {
    backgroundColor: '#4caf50',
  },
  galleryButton: {
    backgroundColor: '#2196f3',
  },
  imageButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  submitButton: {
    backgroundColor: '#1a237e',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 20,
  },
  disabledButton: {
    backgroundColor: '#ccc',
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  footer: {
    padding: 20,
    backgroundColor: '#fff',
    marginTop: 20,
  },
  footerText: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    marginBottom: 4,
  },
});

export default ViolationReporting;
