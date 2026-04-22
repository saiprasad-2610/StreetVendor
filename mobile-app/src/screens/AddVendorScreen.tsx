import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { User, Phone, MapPin, Store, Tag, Send, ChevronDown, ArrowLeft, Briefcase } from 'lucide-react-native';
import * as Location from 'expo-location';
import api from '../services/api';

const AddVendorScreen = ({ navigation }: any) => {
  const [loading, setLoading] = useState(false);
  const [locating, setLocating] = useState(false);
  const [zones, setZones] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    shopName: '',
    category: 'VEGETABLE',
    zoneId: '',
    latitude: '',
    longitude: '',
    aadhaar: '',
  });

  useEffect(() => {
    const fetchZones = async () => {
      try {
        const response = await api.get('/zones');
        setZones(Array.isArray(response.data) ? response.data.filter((z: any) => z.isActive && z.zoneType === 'ALLOWED') : []);
      } catch (error) {
        console.error('Failed to fetch zones', error);
      }
    };
    fetchZones();
  }, []);

  const handleInputChange = (name: string, value: string) => {
    setFormData({ ...formData, [name]: value });
  };

  const detectLocation = async () => {
    setLocating(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Allow location access to detect your vending spot.');
        return;
      }

      const location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      setFormData({
        ...formData,
        latitude: location.coords.latitude.toString(),
        longitude: location.coords.longitude.toString(),
      });
      Alert.alert('Success', 'Location detected successfully!');
    } catch (error) {
      Alert.alert('Error', 'Could not detect location.');
    } finally {
      setLocating(false);
    }
  };

  const handleSubmit = async () => {
    if (!formData.name || !formData.phone || !formData.zoneId || !formData.latitude || !formData.longitude || !formData.aadhaar) {
      Alert.alert('Error', 'Please fill in all required fields including location and Aadhaar');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        ...formData,
        latitude: parseFloat(formData.latitude),
        longitude: parseFloat(formData.longitude),
        zoneId: parseInt(formData.zoneId),
      };
      await api.post('/vendors', payload);
      Alert.alert('Success', 'Vendor added successfully', [
        { text: 'OK', onPress: () => navigation.goBack() }
      ]);
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.message || 'Failed to add vendor');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.headerInfo}>
        <Store color="#2563eb" size={48} />
        <Text style={styles.headerTitle}>New Vendor</Text>
        <Text style={styles.headerSubtitle}>Register a vendor manually</Text>
      </View>

      <View style={styles.form}>
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Full Name *</Text>
          <View style={styles.inputContainer}>
            <User color="#64748b" size={20} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Vendor's full name"
              value={formData.name}
              onChangeText={(v) => handleInputChange('name', v)}
            />
          </View>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Phone Number *</Text>
          <View style={styles.inputContainer}>
            <Phone color="#64748b" size={20} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="10-digit phone number"
              keyboardType="phone-pad"
              maxLength={10}
              value={formData.phone}
              onChangeText={(v) => handleInputChange('phone', v)}
            />
          </View>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Aadhaar Number *</Text>
          <View style={styles.inputContainer}>
            <Briefcase color="#64748b" size={20} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="12-digit Aadhaar number"
              keyboardType="numeric"
              maxLength={12}
              value={formData.aadhaar}
              onChangeText={(v) => handleInputChange('aadhaar', v)}
            />
          </View>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Category</Text>
          <View style={styles.inputContainer}>
            <Tag color="#64748b" size={20} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="e.g. VEGETABLE, FOOD, etc."
              value={formData.category}
              onChangeText={(v) => handleInputChange('category', v)}
            />
          </View>
        </View>

        <View style={styles.inputGroup}>
          <View style={styles.rowBetween}>
            <Text style={styles.label}>Vending Spot (GPS) *</Text>
            <TouchableOpacity onPress={detectLocation} disabled={locating}>
              <Text style={styles.detectText}>{locating ? 'Locating...' : 'Detect GPS'}</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.row}>
            <View style={[styles.inputContainer, { flex: 1, marginRight: 8 }]}>
              <TextInput
                style={styles.input}
                placeholder="Lat"
                value={formData.latitude}
                onChangeText={(v) => handleInputChange('latitude', v)}
                keyboardType="numeric"
              />
            </View>
            <View style={[styles.inputContainer, { flex: 1 }]}>
              <TextInput
                style={styles.input}
                placeholder="Lng"
                value={formData.longitude}
                onChangeText={(v) => handleInputChange('longitude', v)}
                keyboardType="numeric"
              />
            </View>
          </View>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Authorized Zone *</Text>
          <View style={styles.zonePickerContainer}>
            {zones.map((zone) => (
              <TouchableOpacity
                key={zone.id}
                style={[
                  styles.zoneItem,
                  formData.zoneId === zone.id.toString() && styles.zoneItemActive
                ]}
                onPress={() => {
                  handleInputChange('zoneId', zone.id.toString());
                  if (!formData.latitude) {
                    setFormData(prev => ({
                      ...prev,
                      latitude: zone.latitude.toString(),
                      longitude: zone.longitude.toString()
                    }));
                  }
                }}
              >
                <MapPin size={16} color={formData.zoneId === zone.id.toString() ? '#fff' : '#64748b'} />
                <Text style={[
                  styles.zoneText,
                  formData.zoneId === zone.id.toString() && styles.zoneTextActive
                ]}>
                  {zone.name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <TouchableOpacity 
          style={styles.submitButton} 
          onPress={handleSubmit}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Send color="#fff" size={20} />
              <Text style={styles.submitButtonText}>Register Vendor</Text>
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
    backgroundColor: '#f8fafc',
  },
  content: {
    paddingBottom: 40,
  },
  headerInfo: {
    backgroundColor: '#fff',
    padding: 32,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1e3a8a',
    marginTop: 12,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#64748b',
    marginTop: 4,
  },
  form: {
    padding: 24,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#475569',
    marginBottom: 8,
    marginLeft: 4,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 56,
  },
  inputIcon: {
    marginHorizontal: 12,
  },
  input: {
    flex: 1,
    height: 50,
    fontSize: 16,
    color: '#1e293b',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  detectText: {
    color: '#2563eb',
    fontWeight: 'bold',
    fontSize: 14,
  },
  zonePickerContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  zoneItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    gap: 6,
  },
  zoneItemActive: {
    backgroundColor: '#2563eb',
    borderColor: '#2563eb',
  },
  zoneText: {
    fontSize: 14,
    color: '#64748b',
    fontWeight: '600',
  },
  zoneTextActive: {
    color: '#fff',
  },
  submitButton: {
    backgroundColor: '#2563eb',
    height: 56,
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
    marginTop: 12,
    shadowColor: '#2563eb',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
});

export default AddVendorScreen;
