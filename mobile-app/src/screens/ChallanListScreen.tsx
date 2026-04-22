import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl, ActivityIndicator, Alert } from 'react-native';
import { FileText, IndianRupee, Calendar, CheckCircle, Clock, Search } from 'lucide-react-native';
import { useSelector } from 'react-redux';
import { RootState } from '../redux/store';
import api from '../services/api';

const ChallanListScreen = ({ navigation }: any) => {
  const { user } = useSelector((state: RootState) => state.auth);
  const [challans, setChallans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchChallans = async () => {
    try {
      const endpoint = user?.role === 'VENDOR' ? '/challans/my' : '/challans';
      const response = await api.get(endpoint);
      setChallans(response.data);
    } catch (error) {
      console.error('Failed to fetch challans', error);
      Alert.alert('Error', 'Failed to load challans');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchChallans();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchChallans();
  };

  const renderChallanItem = ({ item }: any) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.idBadge}>
          <FileText size={16} color="#3b82f6" />
          <Text style={styles.idText}>#{item.id}</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: item.status === 'PAID' ? '#dcfce7' : '#fee2e2' }]}>
          <Text style={[styles.statusText, { color: item.status === 'PAID' ? '#16a34a' : '#dc2626' }]}>
            {item.status}
          </Text>
        </View>
      </View>

      <Text style={styles.reasonText} numberOfLines={2}>{item.violationReason}</Text>
      
      <View style={styles.cardFooter}>
        <View style={styles.footerItem}>
          <IndianRupee size={16} color="#64748b" />
          <Text style={styles.footerValue}>{item.fineAmount}</Text>
        </View>
        <View style={styles.footerItem}>
          <Calendar size={16} color="#64748b" />
          <Text style={styles.footerValue}>{new Date(item.issuedAt).toLocaleDateString()}</Text>
        </View>
      </View>

      {user?.role === 'VENDOR' && item.status === 'UNPAID' && (
        <TouchableOpacity 
          style={styles.payButton}
          onPress={() => handlePayment(item)}
        >
          <Text style={styles.payButtonText}>Pay Now</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  const handlePayment = async (challan: any) => {
    try {
      setLoading(true);
      const response = await api.post(`/payments/create-order/${challan.id}`);
      navigation.navigate('RazorpayPayment', {
        orderData: response.data,
        razorpayKey: 'rzp_test_SfFxL46SB6oOpP' // In production, get this from backend
      });
    } catch (error: any) {
      Alert.alert('Error', 'Failed to initiate payment');
    } finally {
      setLoading(false);
    }
  };

  if (loading && !refreshing) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>All Challans</Text>
        <Text style={styles.subtitle}>{challans.length} records found</Text>
      </View>

      <FlatList
        data={challans}
        renderItem={renderChallanItem}
        keyExtractor={(item: any) => item.id.toString()}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <FileText size={64} color="#cbd5e1" />
            <Text style={styles.emptyText}>No challans found</Text>
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
    padding: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
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
  listContent: {
    padding: 16,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  idBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#eff6ff',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
  },
  idText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#3b82f6',
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
  reasonText: {
    fontSize: 16,
    color: '#334155',
    fontWeight: '500',
    marginBottom: 16,
    lineHeight: 22,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  footerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  footerValue: {
    fontSize: 14,
    color: '#64748b',
    fontWeight: '500',
  },
  payButton: {
    backgroundColor: '#2563eb',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 16,
  },
  payButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    alignItems: 'center',
    marginTop: 100,
  },
  emptyText: {
    fontSize: 16,
    color: '#94a3b8',
    marginTop: 16,
  },
});

export default ChallanListScreen;
