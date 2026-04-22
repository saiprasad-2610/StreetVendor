import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity, ActivityIndicator, RefreshControl, Image, ScrollView } from 'react-native';
import { Search, Plus, Filter, Phone, MapPin, ChevronRight, Info } from 'lucide-react-native';
import api from '../services/api';
import { useSelector } from 'react-redux';
import { RootState } from '../redux/store';

const VendorListScreen = ({ navigation }: any) => {
  const { user } = useSelector((state: RootState) => state.auth);
  const [vendors, setVendors] = useState<any[]>([]);
  const [filteredVendors, setFilteredVendors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('ALL');

  const fetchVendors = useCallback(async () => {
    try {
      const response = await api.get('/vendors');
      setVendors(Array.isArray(response.data) ? response.data : []);
      setFilteredVendors(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.error('Failed to fetch vendors', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchVendors();
  }, [fetchVendors]);

  useEffect(() => {
    const filtered = vendors.filter(v => {
      const matchesSearch = v.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                           v.vendorId.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesFilter = filterStatus === 'ALL' || v.status === filterStatus;
      return matchesSearch && matchesFilter;
    });
    setFilteredVendors(filtered);
  }, [searchQuery, filterStatus, vendors]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchVendors();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'APPROVED': return '#10b981';
      case 'PENDING': return '#f59e0b';
      case 'REJECTED': return '#ef4444';
      default: return '#6b7280';
    }
  };

  const renderVendorItem = ({ item }: { item: any }) => (
    <TouchableOpacity 
      style={styles.vendorCard}
      onPress={() => {
        // Navigate to details if needed
      }}
    >
      <View style={styles.cardHeader}>
        <View style={styles.vendorBasicInfo}>
          <Text style={styles.vendorName}>{item.name}</Text>
          <Text style={styles.vendorId}>{item.vendorId}</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: `${getStatusColor(item.status)}20` }]}>
          <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>{item.status}</Text>
        </View>
      </View>

      <View style={styles.cardBody}>
        <View style={styles.infoRow}>
          <Phone color="#6b7280" size={16} />
          <Text style={styles.infoText}>{item.phone}</Text>
        </View>
        <View style={styles.infoRow}>
          <MapPin color="#6b7280" size={16} />
          <Text style={styles.infoText} numberOfLines={1}>{item.shopName} - {item.zone?.name || 'No Zone'}</Text>
        </View>
      </View>

      <View style={styles.cardFooter}>
        <Text style={styles.categoryText}>{item.category}</Text>
        <ChevronRight color="#d1d5db" size={20} />
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Vendors</Text>
          <Text style={styles.subtitle}>{filteredVendors.length} active registrations</Text>
        </View>
        {user?.role === 'ADMIN' && (
          <TouchableOpacity 
            style={styles.addButton}
            onPress={() => navigation.navigate('AddVendor')}
          >
            <Plus color="#fff" size={24} />
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.searchSection}>
        <View style={styles.searchBar}>
          <Search color="#94a3b8" size={20} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by name or ID..."
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
        
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterList}>
          {['ALL', 'APPROVED', 'PENDING', 'REJECTED'].map((status) => (
            <TouchableOpacity
              key={status}
              style={[
                styles.filterTab,
                filterStatus === status && styles.filterTabActive
              ]}
              onPress={() => setFilterStatus(status)}
            >
              <Text style={[
                styles.filterTabText,
                filterStatus === status && styles.filterTabTextActive
              ]}>
                {status}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <FlatList
        data={filteredVendors}
        renderItem={renderVendorItem}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={fetchVendors} />}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Info size={48} color="#cbd5e1" />
            <Text style={styles.emptyText}>No vendors found</Text>
          </View>
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 24,
    paddingTop: 60,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1e3a8a',
  },
  subtitle: {
    fontSize: 14,
    color: '#64748b',
    marginTop: 2,
  },
  addButton: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: '#2563eb',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#2563eb',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  searchSection: {
    backgroundColor: '#fff',
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 48,
    marginBottom: 12,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 16,
    color: '#1e293b',
  },
  filterList: {
    flexDirection: 'row',
  },
  filterTab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  filterTabActive: {
    backgroundColor: '#2563eb',
    borderColor: '#2563eb',
  },
  filterTabText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748b',
  },
  filterTabTextActive: {
    color: '#fff',
  },
  listContent: {
    padding: 16,
  },
  vendorCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  vendorBasicInfo: {
    flex: 1,
  },
  vendorName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1e293b',
  },
  vendorId: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '600',
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  statusText: {
    fontSize: 11,
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  cardBody: {
    gap: 8,
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  infoText: {
    fontSize: 14,
    color: '#475569',
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  categoryText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#2563eb',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  emptyContainer: {
    alignItems: 'center',
    marginTop: 60,
  },
  emptyText: {
    fontSize: 16,
    color: '#94a3b8',
    marginTop: 12,
  },
});

export default VendorListScreen;
