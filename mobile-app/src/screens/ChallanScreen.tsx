import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, Alert, ActivityIndicator, Image } from 'react-native';
import { CameraView, Camera, useCameraPermissions } from 'expo-camera';
import { MapPin, X, Send, IndianRupee, FileText, AlertCircle, Camera as CameraIcon } from 'lucide-react-native';
import api from '../services/api';

const ChallanScreen = ({ route, navigation }: any) => {
  const { vendorId } = route.params;
  const [permission, requestPermission] = useCameraPermissions();
  const [fineAmount, setFineAmount] = useState('');
  const [violationReason, setViolationReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [takingPhoto, setTakingPhoto] = useState(false);
  const cameraRef = React.useRef<any>(null);

  const handleTakePhoto = async () => {
    if (cameraRef.current) {
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.5, base64: true });
      setCapturedImage(photo.uri);
      setTakingPhoto(false);
    }
  };

  const submitChallan = async () => {
    if (!fineAmount || !violationReason) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('vendorId', vendorId.toString());
      formData.append('fineAmount', fineAmount);
      formData.append('violationReason', violationReason);
      
      if (capturedImage) {
        const uriParts = capturedImage.split('.');
        const fileType = uriParts[uriParts.length - 1];
        formData.append('image', {
          uri: capturedImage,
          name: `challan.${fileType}`,
          type: `image/${fileType}`,
        } as any);
      }

      await api.post('/challans', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      Alert.alert('Success', 'Challan issued successfully', [
        { text: 'OK', onPress: () => navigation.goBack() }
      ]);
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.message || 'Failed to issue challan');
    } finally {
      setLoading(false);
    }
  };

  if (!permission) return <View style={styles.centerContainer}><ActivityIndicator /></View>;

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
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.headerInfo}>
        <AlertCircle color="#ef4444" size={48} />
        <Text style={styles.headerTitle}>Issue New Challan</Text>
        <Text style={styles.headerSubtitle}>Vendor ID: {vendorId}</Text>
      </View>

      <View style={styles.form}>
        <Text style={styles.label}>Fine Amount (₹)</Text>
        <View style={styles.inputContainer}>
          <IndianRupee color="#6b7280" size={20} style={styles.inputIcon} />
          <TextInput
            style={styles.input}
            placeholder="Enter amount"
            keyboardType="numeric"
            value={fineAmount}
            onChangeText={setFineAmount}
          />
        </View>

        <Text style={styles.label}>Violation Reason</Text>
        <View style={[styles.inputContainer, styles.textAreaContainer]}>
          <FileText color="#6b7280" size={20} style={{ ...styles.inputIcon, marginTop: 12 }} />
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Describe the reason for fine..."
            multiline
            numberOfLines={4}
            value={violationReason}
            onChangeText={setViolationReason}
          />
        </View>

        <Text style={styles.label}>Evidence Photo (Optional)</Text>
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

        <TouchableOpacity 
          style={[styles.submitButton, loading && styles.disabledButton]} 
          onPress={submitChallan}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Send color="#fff" size={20} />
              <Text style={styles.submitButtonText}>Issue Challan</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f3f4f6',
  },
  content: {
    padding: 20,
  },
  headerInfo: {
    alignItems: 'center',
    marginBottom: 24,
    paddingVertical: 20,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
    marginTop: 12,
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#6b7280',
    marginTop: 4,
  },
  form: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    marginBottom: 20,
    paddingHorizontal: 12,
  },
  textAreaContainer: {
    alignItems: 'flex-start',
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    height: 48,
    color: '#111827',
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
    paddingVertical: 12,
  },
  takePhotoButton: {
    height: 120,
    borderWidth: 2,
    borderColor: '#3b82f6',
    borderStyle: 'dashed',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
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
    marginBottom: 24,
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
    backgroundColor: '#ef4444',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
    borderRadius: 8,
    gap: 10,
  },
  disabledButton: {
    opacity: 0.7,
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
});

export default ChallanScreen;
