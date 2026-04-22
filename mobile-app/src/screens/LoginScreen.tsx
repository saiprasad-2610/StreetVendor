import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, Image } from 'react-native';
import { useDispatch } from 'react-redux';
import { setUser, setError } from '../redux/authSlice';
import api from '../services/api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Lock, User, ShieldCheck, Camera } from 'lucide-react-native';
import { setApiToken } from '../services/api';

const LoginScreen = ({ navigation }: any) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const dispatch = useDispatch();

  const handleLogin = async () => {
    if (!username || !password) {
      Alert.alert('Error', 'Please enter both username and password');
      return;
    }

    setLoading(true);
    try {
      const response = await api.post('/auth/login', { username, password });
      const { token, ...userData } = response.data;

      setApiToken(token); // Set token in memory for immediate use
      await AsyncStorage.setItem('token', token);
      await AsyncStorage.setItem('user', JSON.stringify(userData));

      dispatch(setUser({ user: userData, token }));
    } catch (error: any) {
      const message = error.response?.data?.message || 'Login failed. Please check your credentials.';
      Alert.alert('Login Failed', message);
      dispatch(setError(message));
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.logoContainer}>
          <ShieldCheck color="#fff" size={40} />
        </View>
        <Text style={styles.title}>SVMS</Text>
        <Text style={styles.subtitle}>Smart Street Vendor Management</Text>
      </View>

      <View style={styles.form}>
        <Text style={styles.loginTitle}>Sign In</Text>
        
        <View style={styles.inputContainer}>
          <User color="#64748b" size={20} style={styles.inputIcon} />
          <TextInput
            style={styles.input}
            placeholder="Username"
            placeholderTextColor="#94a3b8"
            value={username}
            onChangeText={setUsername}
            autoCapitalize="none"
          />
        </View>

        <View style={styles.inputContainer}>
          <Lock color="#64748b" size={20} style={styles.inputIcon} />
          <TextInput
            style={styles.input}
            placeholder="Password"
            placeholderTextColor="#94a3b8"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />
        </View>

        <TouchableOpacity 
          style={styles.button} 
          onPress={handleLogin}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Login</Text>
          )}
        </TouchableOpacity>

        <View style={styles.divider}>
          <View style={styles.line} />
          <Text style={styles.dividerText}>OR</Text>
          <View style={styles.line} />
        </View>

        <TouchableOpacity 
          style={styles.publicScanButton} 
          onPress={() => navigation.navigate('Scan', { isPublic: true })}
        >
          <Camera color="#2563eb" size={20} style={styles.inputIcon} />
          <Text style={styles.publicScanText}>Public QR Scan</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.registerLink} 
          onPress={() => navigation.navigate('VendorRegister')}
        >
          <Text style={styles.registerText}>
            Are you a vendor? <Text style={styles.registerHighlight}>Register Now</Text>
          </Text>
        </TouchableOpacity>
      </View>
      
      <View style={styles.footer}>
        <Text style={styles.footerText}>Solapur Municipal Corporation</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
    justifyContent: 'center',
    padding: 24,
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logoContainer: {
    width: 70,
    height: 70,
    borderRadius: 20,
    backgroundColor: '#2563eb',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    shadowColor: '#2563eb',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  title: {
    fontSize: 32,
    fontWeight: '900',
    color: '#1e3a8a',
    letterSpacing: 1,
  },
  subtitle: {
    fontSize: 13,
    color: '#64748b',
    marginTop: 6,
    fontWeight: '500',
  },
  form: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 20,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
  },
  loginTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 20,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    marginBottom: 12,
    paddingHorizontal: 16,
    backgroundColor: '#f8fafc',
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    height: 52,
    color: '#1e293b',
    fontSize: 15,
  },
  button: {
    backgroundColor: '#2563eb',
    height: 52,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 4,
    shadowColor: '#2563eb',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
  },
  line: {
    flex: 1,
    height: 1,
    backgroundColor: '#e2e8f0',
  },
  dividerText: {
    marginHorizontal: 10,
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: 'bold',
  },
  publicScanButton: {
    flexDirection: 'row',
    height: 52,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#2563eb',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  publicScanText: {
    color: '#2563eb',
    fontSize: 16,
    fontWeight: 'bold',
  },
  registerLink: {
    marginTop: 20,
    alignItems: 'center',
  },
  registerText: {
    fontSize: 14,
    color: '#64748b',
  },
  registerHighlight: {
    color: '#2563eb',
    fontWeight: 'bold',
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 11,
    color: '#94a3b8',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
});

export default LoginScreen;
