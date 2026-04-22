import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { User, Mail, Phone, MapPin, Briefcase, Lock, ArrowLeft, IndianRupee, Navigation, Tag, Layers, Zap } from 'lucide-react-native';
import * as Location from 'expo-location';
import api from '../services/api';

const VendorRegisterScreen = ({ navigation }: any) => {
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    name: '',
    email: '',
    phone: '',
    aadhaar: '',
    category: 'VEGETABLE',
    monthlyRent: '500',
    latitude: '',
    longitude: '',
    address: '',
    zoneId: '',
  });
  const [loading, setLoading] = useState(false);
  const [locating, setLocating] = useState(false);
  const [isLive, setIsLive] = useState(false);
  const [zones, setZones] = useState<any[]>([]);
  const subscriptionRef = useRef<Location.LocationSubscription | null>(null);

  useEffect(() => {
    const fetchZones = async () => {
      try {
        const response = await api.get('/zones');
        setZones(response.data.filter((z: any) => z.isActive && z.zoneType === 'ALLOWED'));
      } catch (err) {
        console.error("Failed to fetch zones", err);
      }
    };
    fetchZones();

    return () => {
      if (subscriptionRef.current) {
        subscriptionRef.current.remove();
      }
    };
  }, []);

  const categories = [
    { label: 'Vegetables', value: 'VEGETABLE' },
    { label: 'Fruits', value: 'FRUIT' },
    { label: 'Food/Snacks', value: 'FOOD' },
    { label: 'Tea Stall', value: 'TEA' },
    { label: 'Pan Shop', value: 'PAN_SHOP' },
    { label: 'Other', value: 'OTHER' },
  ];

  const handleInputChange = (name: string, value: string) => {
    setFormData({ ...formData, [name]: value });
  };

  const toggleLiveTracking = async () => {
    if (isLive) {
      if (subscriptionRef.current) {
        subscriptionRef.current.remove();
        subscriptionRef.current = null;
      }
      setIsLive(false);
    } else {
      setLocating(true);
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permission Denied', 'Allow location access for live tracking.');
          setLocating(false);
          return;
        }

        setIsLive(true);
        subscriptionRef.current = await Location.watchPositionAsync(
          { 
            accuracy: Location.Accuracy.Highest,
            timeInterval: 2000,
            distanceInterval: 1 
          },
          (location) => {
            setFormData(prev => ({
              ...prev,
              latitude: location.coords.latitude.toString(),
              longitude: location.coords.longitude.toString(),
            }));
          }
        );
      } catch (error) {
        Alert.alert('Error', 'Could not start live tracking.');
        setIsLive(false);
      } finally {
        setLocating(false);
      }
    }
  };

  const handleRegister = async () => {
    const { username, password, name, phone, aadhaar, latitude, longitude, zoneId } = formData;
    if (!username || !password || !name || !phone || !aadhaar || !latitude || !longitude || !zoneId) {
      Alert.alert('Error', 'Please fill all required fields including zone and location');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        ...formData,
        monthlyRent: parseFloat(formData.monthlyRent),
        latitude: parseFloat(formData.latitude),
        longitude: parseFloat(formData.longitude),
        zoneId: parseInt(formData.zoneId),
      };
      
      await api.post('/vendors/register', payload);
      Alert.alert('Success', 'Registration successful! Please wait for admin approval.', [
        { text: 'OK', onPress: () => navigation.navigate('Login') }
      ]);
    } catch (error: any) {
      Alert.alert('Registration Failed', error.response?.data?.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <ArrowLeft color="#1e3a8a" size={24} />
        </TouchableOpacity>
        <Text style={styles.title}>Vendor Self-Registration</Text>
        <Text style={styles.subtitle}>Join the Smart Street Vendor Management System</Text>
      </View>

      <View style={styles.form}>
        <Text style={styles.sectionTitle}>Account Credentials</Text>
        <View style={styles.inputContainer}>
          <User color="#64748b" size={20} style={styles.icon} />
          <TextInput
            style={styles.input}
            placeholder="Username *"
            value={formData.username}
            onChangeText={(v) => handleInputChange('username', v)}
            autoCapitalize="none"
          />
        </View>

        <View style={styles.inputContainer}>
          <Lock color="#64748b" size={20} style={styles.icon} />
          <TextInput
            style={styles.input}
            placeholder="Password *"
            value={formData.password}
            onChangeText={(v) => handleInputChange('password', v)}
            secureTextEntry
          />
        </View>

        <Text style={styles.sectionTitle}>Personal Information</Text>
        <View style={styles.inputContainer}>
          <User color="#64748b" size={20} style={styles.icon} />
          <TextInput
            style={styles.input}
            placeholder="Full Name *"
            value={formData.name}
            onChangeText={(v) => handleInputChange('name', v)}
          />
        </View>

        <View style={styles.inputContainer}>
          <Phone color="#64748b" size={20} style={styles.icon} />
          <TextInput
            style={styles.input}
            placeholder="Phone Number *"
            value={formData.phone}
            onChangeText={(v) => handleInputChange('phone', v)}
            keyboardType="phone-pad"
          />
        </View>

        <View style={styles.inputContainer}>
          <Briefcase color="#64748b" size={20} style={styles.icon} />
          <TextInput
            style={styles.input}
            placeholder="Aadhaar Number *"
            value={formData.aadhaar}
            onChangeText={(v) => handleInputChange('aadhaar', v)}
            keyboardType="numeric"
          />
        </View>

        <View style={styles.inputContainer}>
          <Tag color="#64748b" size={20} style={styles.icon} />
          <TextInput
            style={styles.input}
            placeholder="Vending Category *"
            value={formData.category}
            onChangeText={(v) => handleInputChange('category', v)}
          />
        </View>

        <View style={styles.inputContainer}>
          <IndianRupee color="#64748b" size={20} style={styles.icon} />
          <TextInput
            style={styles.input}
            placeholder="Monthly Rent (₹)"
            value={formData.monthlyRent}
            onChangeText={(v) => handleInputChange('monthlyRent', v)}
            keyboardType="numeric"
          />
        </View>

        <Text style={styles.sectionTitle}>Vending Zone Allocation</Text>
        <Text style={styles.helperText}>Pick an authorized zone. Your spot must be inside it.</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.zoneList}>
          {zones.map(zone => (
            <TouchableOpacity 
              key={zone.id} 
              style={[
                styles.zoneBadge, 
                formData.zoneId == zone.id.toString() && styles.selectedZoneBadge
              ]}
              onPress={() => {
                setFormData({
                  ...formData,
                  zoneId: zone.id.toString(),
                  latitude: isLive ? formData.latitude : zone.latitude.toString(),
                  longitude: isLive ? formData.longitude : zone.longitude.toString()
                });
              }}
            >
              <Layers color={formData.zoneId == zone.id.toString() ? '#fff' : '#2563eb'} size={16} />
              <Text style={[
                styles.zoneBadgeText,
                formData.zoneId == zone.id.toString() && styles.selectedZoneBadgeText
              ]}>
                {zone.name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <View style={styles.locationSection}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>Vending Location</Text>
            <TouchableOpacity 
              onPress={toggleLiveTracking} 
              style={[styles.detectBtn, isLive && styles.liveActiveBtn]} 
              disabled={locating}
            >
              <View style={styles.row}>
                {isLive && <Zap color="#fff" size={14} style={{ marginRight: 4 }} />}
                {locating ? (
                  <ActivityIndicator size="small" color={isLive ? "#fff" : "#2563eb"} />
                ) : (
                  <Text style={[styles.detectBtnText, isLive && styles.liveActiveBtnText]}>
                    {isLive ? 'LIVE TRACKING ON' : 'GO LIVE (GPS)'}
                  </Text>
                )}
              </View>
            </TouchableOpacity>
          </View>
          
          <View style={styles.row}>
            <View style={[styles.inputContainer, { flex: 1, marginRight: 8 }]}>
              <TextInput
                style={[styles.input, isLive && styles.liveInput]}
                placeholder="Latitude *"
                value={formData.latitude}
                onChangeText={(v) => handleInputChange('latitude', v)}
                keyboardType="numeric"
                editable={!isLive}
              />
            </View>
            <View style={[styles.inputContainer, { flex: 1 }]}>
              <TextInput
                style={[styles.input, isLive && styles.liveInput]}
                placeholder="Longitude *"
                value={formData.longitude}
                onChangeText={(v) => handleInputChange('longitude', v)}
                keyboardType="numeric"
                editable={!isLive}
              />
            </View>
          </View>

          <View style={styles.inputContainer}>
            <MapPin color="#64748b" size={20} style={styles.icon} />
            <TextInput
              style={styles.input}
              placeholder="Specific Address / Landmark"
              value={formData.address}
              onChangeText={(v) => handleInputChange('address', v)}
              multiline
            />
          </View>
        </View>

        <TouchableOpacity 
          style={styles.button} 
          onPress={handleRegister}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Register Now</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.loginLink} 
          onPress={() => navigation.navigate('Login')}
        >
          <Text style={styles.loginLinkText}>Already have an account? Login</Text>
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
  header: {
    padding: 24,
    paddingTop: 60,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  backButton: {
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1e3a8a',
  },
  subtitle: {
    fontSize: 14,
    color: '#64748b',
    marginTop: 4,
  },
  form: {
    padding: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1e3a8a',
    marginTop: 16,
    marginBottom: 12,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  helperText: {
    fontSize: 12,
    color: '#94a3b8',
    marginBottom: 12,
  },
  zoneList: {
    marginBottom: 20,
  },
  zoneBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#eff6ff',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 25,
    marginRight: 10,
    borderWidth: 1,
    borderColor: '#dbeafe',
    gap: 8,
  },
  selectedZoneBadge: {
    backgroundColor: '#2563eb',
    borderColor: '#2563eb',
  },
  zoneBadgeText: {
    color: '#2563eb',
    fontWeight: 'bold',
    fontSize: 13,
  },
  selectedZoneBadgeText: {
    color: '#fff',
  },
  detectBtn: {  
    backgroundColor: '#eff6ff',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#dbeafe',
  },
  liveActiveBtn: {
    backgroundColor: '#22c55e',
    borderColor: '#22c55e',
  },
  detectBtnText: {
    color: '#2563eb',
    fontSize: 12,
    fontWeight: 'bold',
  },
  liveActiveBtnText: {
    color: '#fff',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    marginBottom: 12,
    paddingHorizontal: 16,
    minHeight: 56,
  },
  liveInput: {
    color: '#22c55e',
    fontWeight: 'bold',
  },
  icon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#1e293b',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  button: {
    backgroundColor: '#2563eb',
    height: 56,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 24,
    shadowColor: '#2563eb',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  loginLink: {
    marginTop: 24,
    alignItems: 'center',
    paddingBottom: 40,
  },
  loginLinkText: {
    color: '#2563eb',
    fontSize: 16,
    fontWeight: '500',
  },
});

export default VendorRegisterScreen;
