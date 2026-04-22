import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl, ActivityIndicator, Alert } from 'react-native';
import { CreditCard, IndianRupee, Calendar, CheckCircle, Clock, User } from 'lucide-react-native';
import { useSelector } from 'react-redux';
import { RootState } from '../redux/store';
import api from '../services/api';

const RentManagementScreen = ({ navigation }: any) => {
  const { user } = useSelector((state: RootState) => state.auth);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchPayments = async () => {
    try {
      const endpoint = user?.role === 'VENDOR' ? '/payments/my-rent-payments' : '/payments/rent-payments';
      const response = await api.get(endpoint);
      setPayments(response.data);
    } catch (error) {
      console.error('Failed to fetch rent payments', error);
      Alert.alert('Error', 'Failed to load rent records');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchPayments();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchPayments();
  };

  const renderPaymentItem = ({ item }: any) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.vendorInfo}>
          <User size={16} color="#64748b" />
          <Text style={styles.vendorName}>{item.vendor?.name || 'Unknown Vendor'}</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: item.status === 'PAID' ? '#dcfce7' : '#fee2e2' }]}>
          <Text style={[styles.statusText, { color: item.status === 'PAID' ? '#16a34a' : '#dc2626' }]}>
            {item.status}
          </Text>
        </View>
      </View>

      <View style={styles.detailsGrid}>
        <View style={styles.detailItem}>
          <Text style={styles.detailLabel}>Amount</Text>
          <View style={styles.amountContainer}>
            <IndianRupee size={14} color="#1e293b" />
            <Text style={styles.detailValue}>{item.amount}</Text>
          </View>
        </View>
        <View style={styles.detailItem}>
          <Text style={styles.detailLabel}>Period</Text>
          <Text style={styles.detailValue}>{item.month} {item.year}</Text>
        </View>
        <View style={styles.detailItem}>
          <Text style={styles.detailLabel}>Date</Text>
          <Text style={styles.detailValue}>{item.paymentDate ? new Date(item.paymentDate).toLocaleDateString() : 'N/A'}</Text>
        </View>
      </View>

      {item.transactionId && (
        <View style={styles.transactionBox}>
          <Text style={styles.transactionLabel}>TXN ID: </Text>
          <Text style={styles.transactionId}>{item.transactionId}</Text>
        </View>
      )}
      {user?.role === 'VENDOR' && item.status === 'UNPAID' && (
        <TouchableOpacity 
          style={styles.payButton}
          onPress={() => handleRentPayment(item)}
        >
          <Text style={styles.payButtonText}>Pay Rent Now</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  const handleRentPayment = async (rent: any) => {
    try {
      setLoading(true);
      const response = await api.post(`/payments/create-rent-order/${user?.id}`);
      navigation.navigate('RazorpayPayment', {
        orderData: response.data,
        razorpayKey: 'rzp_test_SfFxL46SB6oOpP'
      });
    } catch (error: any) {
      Alert.alert('Error', 'Failed to initiate rent payment');
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
        <Text style={styles.title}>Rent Management</Text>
        <Text style={styles.subtitle}>Track monthly vending fees</Text>
      </View>

      <FlatList
        data={payments}
        renderItem={renderPaymentItem}
        keyExtractor={(item: any) => item.id.toString()}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <CreditCard size={64} color="#cbd5e1" />
            <Text style={styles.emptyText}>No rent records found</Text>
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
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  vendorInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  vendorName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1e293b',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  statusText: {
    fontSize: 12,
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  detailsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#f8fafc',
    padding: 12,
    borderRadius: 12,
    marginBottom: 12,
  },
  detailItem: {
    gap: 4,
  },
  detailLabel: {
    fontSize: 11,
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  amountContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e293b',
  },
  transactionBox: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  transactionLabel: {
    fontSize: 12,
    color: '#94a3b8',
  },
  transactionId: {
    fontSize: 12,
    color: '#64748b',
    fontFamily: 'monospace',
  },
  payButton: {
    backgroundColor: '#10b981',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 16,
  },
  payButtonText: {
    color: '#fff',
    fontSize: 15,
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

export default RentManagementScreen;
