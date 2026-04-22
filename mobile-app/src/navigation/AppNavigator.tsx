import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../redux/store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { setUser, setLoading } from '../redux/authSlice';
import { Layout, Home, Users, Camera, AlertTriangle, FileText, Map as MapIcon, LogOut } from 'lucide-react-native';

// Screens
import LoginScreen from '../screens/LoginScreen';
import DashboardScreen from '../screens/DashboardScreen';
import VendorListScreen from '../screens/VendorListScreen';
import AddVendorScreen from '../screens/AddVendorScreen';
import ScanQRScreen from '../screens/ScanQRScreen';
import ViolationListScreen from '../screens/ViolationListScreen';
import ChallanScreen from '../screens/ChallanScreen';
import MapScreen from '../screens/MapScreen';
import VendorRegisterScreen from '../screens/VendorRegisterScreen';
import ChallanListScreen from '../screens/ChallanListScreen';
import RentManagementScreen from '../screens/RentManagementScreen';
import RazorpayPaymentScreen from '../screens/RazorpayPaymentScreen';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

const TabNavigator = () => {
  const { user } = useSelector((state: RootState) => state.auth);
  
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#2563eb',
        tabBarInactiveTintColor: '#94a3b8',
        tabBarStyle: {
          borderTopWidth: 1,
          borderTopColor: '#e2e8f0',
          height: 60,
          paddingBottom: 10,
        }
      }}
    >
      <Tab.Screen 
        name="Dashboard" 
        component={DashboardScreen} 
        options={{ tabBarIcon: ({ color }) => <Home color={color} size={24} /> }}
      />
      <Tab.Screen 
        name="Vendors" 
        component={VendorListScreen} 
        options={{ tabBarIcon: ({ color }) => <Users color={color} size={24} /> }}
      />
      {(user?.role === 'ADMIN' || user?.role === 'OFFICER') && (
        <Tab.Screen 
          name="Scan" 
          component={ScanQRScreen} 
          options={{ tabBarIcon: ({ color }) => <Camera color={color} size={24} /> }}
        />
      )}
      <Tab.Screen 
        name="Violations" 
        component={ViolationListScreen} 
        options={{ tabBarIcon: ({ color }) => <AlertTriangle color={color} size={24} /> }}
      />
      <Tab.Screen 
        name="Map" 
        component={MapScreen} 
        options={{ tabBarIcon: ({ color }) => <MapIcon color={color} size={24} /> }}
      />
    </Tab.Navigator>
  );
};

const AppNavigator = () => {
  const { user, loading } = useSelector((state: RootState) => state.auth);
  const dispatch = useDispatch();

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const storedUser = await AsyncStorage.getItem('user');
        const token = await AsyncStorage.getItem('token');
        if (storedUser && token) {
          dispatch(setUser({ user: JSON.parse(storedUser), token }));
        }
      } catch (e) {
        console.error('Failed to load auth state', e);
      } finally {
        dispatch(setLoading(false));
      }
    };
    checkAuth();
  }, [dispatch]);

  if (loading) {
    return null; // or a loading screen
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {user ? (
          <>
            <Stack.Screen name="MainTabs" component={TabNavigator} />
            <Stack.Screen name="AddVendor" component={AddVendorScreen} options={{ headerShown: true, title: 'Add Vendor', headerTintColor: '#1e3a8a' }} />
            <Stack.Screen name="Challan" component={ChallanScreen} options={{ headerShown: true, title: 'Issue Challan', headerTintColor: '#1e3a8a' }} />
            <Stack.Screen name="ChallanList" component={ChallanListScreen} options={{ headerShown: true, title: 'Challan Records', headerTintColor: '#1e3a8a' }} />
            <Stack.Screen name="RentManagement" component={RentManagementScreen} options={{ headerShown: true, title: 'Rent Management', headerTintColor: '#1e3a8a' }} />
            <Stack.Screen name="RazorpayPayment" component={RazorpayPaymentScreen} options={{ headerShown: true, title: 'Secure Payment', headerTintColor: '#1e3a8a' }} />
          </>
        ) : (
          <>
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="VendorRegister" component={VendorRegisterScreen} />
            <Stack.Screen name="Scan" component={ScanQRScreen} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default AppNavigator;
