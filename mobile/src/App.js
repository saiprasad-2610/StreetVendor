import React, { useState, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { View, Text, StyleSheet, StatusBar } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import offlineStorage from './services/OfflineStorageService';
import QRScanner from './components/QRScanner';
import VendorList from './components/VendorList';
import ViolationReport from './components/ViolationReport';
import SyncStatus from './components/SyncStatus';

// Phase 1 Enhanced Components
import ViolationReporting from './components/ViolationReporting';
import SyncManager from './components/SyncManager';
import CitizenReportList from './components/CitizenReportList';

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
        
        {/* Navigation Menu */}
        <View style={styles.navigationMenu}>
          <TouchableOpacity
            style={styles.navButton}
            onPress={() => navigation.navigate('VendorList')}
          >
            <Text style={styles.navButtonText}>Nearby Vendors</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.navButton}
            onPress={() => navigation.navigate('ViolationReporting')}
          >
            <Text style={styles.navButtonText}>Report Violation</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.navButton}
            onPress={() => navigation.navigate('CitizenReports')}
          >
            <Text style={styles.navButtonText}>My Reports</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.navButton}
            onPress={() => navigation.navigate('SyncManager')}
          >
            <Text style={styles.navButtonText}>Sync Manager</Text>
          </TouchableOpacity>
        </View>
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
        
        {/* Phase 1 Enhanced Screens */}
        <Stack.Screen
          name="ViolationReporting"
          component={ViolationReporting}
          options={{ title: 'Report Violation' }}
        />
        <Stack.Screen
          name="CitizenReports"
          component={CitizenReportList}
          options={{ title: 'My Reports' }}
        />
        <Stack.Screen
          name="SyncManager"
          component={SyncManager}
          options={{ title: 'Sync Manager' }}
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
  navigationMenu: {
    marginTop: 20,
  },
  navButton: {
    backgroundColor: '#ffffff',
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  navButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a237e',
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
