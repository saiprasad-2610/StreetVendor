import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Dimensions, ScrollView, TouchableOpacity } from 'react-native';
import { MapPin, Info, Navigation, Search } from 'lucide-react-native';
import api from '../services/api';

const { width, height } = Dimensions.get('window');

const MapScreen = () => {
  const [vendors, setVendors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchVendors = async () => {
      try {
        const response = await api.get('/vendors');
        setVendors(Array.isArray(response.data) ? response.data : []);
      } catch (error) {
        console.error('Failed to fetch vendors', error);
      } finally {
        setLoading(false);
      }
    };
    fetchVendors();
  }, []);

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Vendor Map View</Text>
      </View>

      <View style={styles.mapPlaceholder}>
        {/* In a real app, we would use react-native-maps here */}
        <View style={styles.mapContent}>
          <MapPin color="#3b82f6" size={100} style={styles.mapIcon} />
          <Text style={styles.mapText}>Interactive Map Visualization</Text>
          <Text style={styles.mapSubtext}>Showing {vendors.length} vendors in your area</Text>
        </View>

        {/* Floating Search */}
        <View style={styles.searchBox}>
          <Search color="#9ca3af" size={20} />
          <Text style={styles.searchText}>Search area or vendor...</Text>
        </View>
      </View>

      <View style={styles.vendorPanel}>
        <Text style={styles.panelTitle}>Nearby Vendors</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.vendorScroll}>
          {vendors.map((vendor) => (
            <TouchableOpacity key={vendor.id} style={styles.vendorCard}>
              <View style={styles.vendorInfo}>
                <Text style={styles.vendorName}>{vendor.name}</Text>
                <Text style={styles.vendorShop}>{vendor.shopName}</Text>
                <View style={styles.distanceTag}>
                  <Navigation color="#3b82f6" size={12} />
                  <Text style={styles.distanceText}>0.5 km away</Text>
                </View>
              </View>
              <TouchableOpacity style={styles.detailsBtn}>
                <Info color="#fff" size={16} />
              </TouchableOpacity>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    padding: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
  },
  mapPlaceholder: {
    flex: 1,
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  mapContent: {
    alignItems: 'center',
  },
  mapIcon: {
    opacity: 0.2,
    marginBottom: 20,
  },
  mapText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#4b5563',
  },
  mapSubtext: {
    fontSize: 14,
    color: '#9ca3af',
    marginTop: 8,
  },
  searchBox: {
    position: 'absolute',
    top: 20,
    left: 20,
    right: 20,
    height: 50,
    backgroundColor: '#fff',
    borderRadius: 25,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  searchText: {
    marginLeft: 10,
    color: '#9ca3af',
    fontSize: 16,
  },
  vendorPanel: {
    height: 180,
    paddingVertical: 16,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    backgroundColor: '#fff',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  panelTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#111827',
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  vendorScroll: {
    paddingHorizontal: 16,
    gap: 12,
  },
  vendorCard: {
    width: 200,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  vendorInfo: {
    flex: 1,
  },
  vendorName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#111827',
  },
  vendorShop: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 2,
  },
  distanceTag: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    gap: 4,
  },
  distanceText: {
    fontSize: 10,
    color: '#3b82f6',
    fontWeight: '600',
  },
  detailsBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#3b82f6',
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default MapScreen;
