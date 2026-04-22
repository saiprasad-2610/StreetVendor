import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, RefreshControl, Image, TouchableOpacity } from 'react-native';
import { AlertTriangle, MapPin, Calendar, User, ChevronRight } from 'lucide-react-native';
import api from '../services/api';

const ViolationListScreen = () => {
  const [violations, setViolations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchViolations = useCallback(async () => {
    try {
      const response = await api.get('/violations');
      setViolations(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.error('Failed to fetch violations', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchViolations();
  }, [fetchViolations]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchViolations();
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const renderViolationItem = ({ item }: { item: any }) => (
    <View style={styles.violationCard}>
      <View style={styles.cardHeader}>
        <View style={styles.headerTitleContainer}>
          <AlertTriangle color="#ef4444" size={20} />
          <Text style={styles.violationType}>Violation</Text>
        </View>
        <Text style={styles.dateText}>{formatDate(item.createdAt)}</Text>
      </View>

      <View style={styles.cardBody}>
        {item.imageProofUrl && (
          <Image 
            source={{ uri: `http://10.113.178.31:8080${item.imageProofUrl}` }} 
            style={styles.violationImage}
            resizeMode="cover"
          />
        )}
        
        <View style={styles.infoRow}>
          <User color="#6b7280" size={16} />
          <Text style={styles.infoText}>
            Vendor: <Text style={styles.boldText}>{item.vendor?.name || 'Unknown'}</Text> ({item.vendor?.vendorId || 'N/A'})
          </Text>
        </View>

        <View style={styles.infoRow}>
          <MapPin color="#6b7280" size={16} />
          <Text style={styles.infoText} numberOfLines={1}>
            Location: {item.gpsLatitude ? item.gpsLatitude.toFixed(4) : 'N/A'}, {item.gpsLongitude ? item.gpsLongitude.toFixed(4) : 'N/A'}
          </Text>
        </View>

        <Text style={styles.descriptionText}>{item.description}</Text>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Violations</Text>
          <Text style={styles.subtitle}>{violations.length} reports logged</Text>
        </View>
        <TouchableOpacity style={styles.refreshBtn} onPress={onRefresh}>
          <AlertTriangle color="#ef4444" size={24} />
        </TouchableOpacity>
      </View>

      <FlatList
        data={violations}
        renderItem={renderViolationItem}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <AlertTriangle color="#cbd5e1" size={48} />
            <Text style={styles.emptyText}>No violations reported</Text>
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
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
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
  refreshBtn: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: '#fee2e2',
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    padding: 16,
  },
  violationCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 16,
    marginBottom: 16,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  headerTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  violationType: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#ef4444',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  dateText: {
    fontSize: 12,
    color: '#94a3b8',
    fontWeight: '500',
  },
  cardBody: {
    gap: 12,
  },
  violationImage: {
    width: '100%',
    height: 180,
    borderRadius: 12,
    backgroundColor: '#f1f5f9',
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
  boldText: {
    fontWeight: 'bold',
    color: '#1e293b',
  },
  descriptionText: {
    fontSize: 15,
    color: '#334155',
    lineHeight: 22,
    backgroundColor: '#f8fafc',
    padding: 12,
    borderRadius: 12,
    marginTop: 4,
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
    marginTop: 12,
  },
});

export default ViolationListScreen;
