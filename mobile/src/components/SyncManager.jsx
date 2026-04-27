import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  RefreshControl,
  Modal,
} from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import offlineStorage from '../services/OfflineStorageService';
import apiService from '../services/APIService';

const SyncManager = ({ navigation }) => {
  const [isOnline, setIsOnline] = useState(false);
  const [syncQueueCount, setSyncQueueCount] = useState(0);
  const [lastSyncTime, setLastSyncTime] = useState(null);
  const [syncing, setSyncing] = useState(false);
  const [syncHistory, setSyncHistory] = useState([]);
  const [showDetails, setShowDetails] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    checkConnectivity();
    setupNetworkListener();
    loadSyncData();
    
    // Check sync status every 30 seconds
    const interval = setInterval(() => {
      checkConnectivity();
      loadSyncData();
    }, 30000);
    
    return () => clearInterval(interval);
  }, []);

  const checkConnectivity = async () => {
    const state = await NetInfo.fetch();
    setIsOnline(state.isConnected);
  };

  const setupNetworkListener = () => {
    const unsubscribe = NetInfo.addEventListener(state => {
      setIsOnline(state.isConnected);
      if (state.isConnected) {
        // Auto-sync when coming online
        setTimeout(() => triggerSync(), 1000);
      }
    });
    return unsubscribe;
  };

  const loadSyncData = async () => {
    try {
      const count = await offlineStorage.getSyncQueueCount();
      setSyncQueueCount(count);
      
      // Load last sync time from local storage
      const lastSync = await offlineStorage.getLastSyncTime();
      setLastSyncTime(lastSync);
      
      // Load sync history
      const history = await offlineStorage.getSyncHistory();
      setSyncHistory(history.slice(0, 10)); // Show last 10 items
    } catch (error) {
      console.error('Failed to load sync data:', error);
    }
  };

  const triggerSync = async () => {
    if (!isOnline) {
      Alert.alert('Offline', 'Cannot sync while offline. Please check your internet connection.');
      return;
    }

    setSyncing(true);
    try {
      // Process sync queue
      await offlineStorage.processSyncQueue();
      
      // Update sync time
      const now = new Date().toISOString();
      await offlineStorage.setLastSyncTime(now);
      setLastSyncTime(now);
      
      // Reload sync data
      await loadSyncData();
      
      Alert.alert('Success', 'Data synchronized successfully!');
    } catch (error) {
      console.error('Sync failed:', error);
      Alert.alert('Error', 'Failed to synchronize data. Please try again.');
    } finally {
      setSyncing(false);
      setRefreshing(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await checkConnectivity();
    await loadSyncData();
    setRefreshing(false);
  };

  const clearSyncQueue = async () => {
    Alert.alert(
      'Clear Sync Queue',
      'This will remove all pending items from the sync queue. Are you sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            try {
              await offlineStorage.clearSyncQueue();
              await loadSyncData();
              Alert.alert('Success', 'Sync queue cleared successfully!');
            } catch (error) {
              console.error('Failed to clear sync queue:', error);
              Alert.alert('Error', 'Failed to clear sync queue.');
            }
          }
        }
      ]
    );
  };

  const downloadEssentialData = async () => {
    if (!isOnline) {
      Alert.alert('Offline', 'Cannot download data while offline.');
      return;
    }

    Alert.alert(
      'Download Essential Data',
      'This will download vendors, zones, and other essential data for offline use. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Download',
          onPress: async () => {
            try {
              await offlineStorage.preloadEssentialData();
              Alert.alert('Success', 'Essential data downloaded successfully!');
            } catch (error) {
              console.error('Failed to download data:', error);
              Alert.alert('Error', 'Failed to download essential data.');
            }
          }
        }
      ]
    );
  };

  const formatSyncTime = (timeString) => {
    if (!timeString) return 'Never';
    
    const date = new Date(timeString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} minutes ago`;
    
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours} hours ago`;
    
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays} days ago`;
  };

  const getSyncStatusColor = () => {
    if (syncQueueCount === 0) return '#4caf50';
    if (syncQueueCount < 5) return '#ff9800';
    return '#f44336';
  };

  const getSyncStatusText = () => {
    if (!isOnline) return 'Offline';
    if (syncing) return 'Syncing...';
    if (syncQueueCount === 0) return 'Up to date';
    if (syncQueueCount === 1) return '1 item pending';
    return `${syncQueueCount} items pending`;
  };

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      <View style={styles.header}>
        <Text style={styles.title}>Sync Manager</Text>
        <View style={styles.statusContainer}>
          <View style={[styles.statusIndicator, { backgroundColor: isOnline ? '#4caf50' : '#f44336' }]} />
          <Text style={styles.statusText}>
            {isOnline ? 'Online' : 'Offline'}
          </Text>
        </View>
      </View>

      {/* Sync Status Card */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Sync Status</Text>
        <View style={styles.syncStatusContainer}>
          <View style={styles.syncStatusRow}>
            <Text style={styles.syncStatusLabel}>Status:</Text>
            <Text style={[styles.syncStatusValue, { color: getSyncStatusColor() }]}>
              {getSyncStatusText()}
            </Text>
          </View>
          
          <View style={styles.syncStatusRow}>
            <Text style={styles.syncStatusLabel}>Last Sync:</Text>
            <Text style={styles.syncStatusValue}>
              {formatSyncTime(lastSyncTime)}
            </Text>
          </View>
          
          <View style={styles.syncStatusRow}>
            <Text style={styles.syncStatusLabel}>Pending Items:</Text>
            <Text style={[styles.syncStatusValue, { color: syncQueueCount > 0 ? '#ff9800' : '#4caf50' }]}>
              {syncQueueCount}
            </Text>
          </View>
        </View>
        
        <TouchableOpacity
          style={[styles.syncButton, !isOnline && styles.disabledButton]}
          onPress={triggerSync}
          disabled={!isOnline || syncing}
        >
          {syncing ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.syncButtonText}>
              {isOnline ? 'Sync Now' : 'Offline - Sync Disabled'}
            </Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Quick Actions */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Quick Actions</Text>
        
        <TouchableOpacity
          style={[styles.actionButton, !isOnline && styles.disabledButton]}
          onPress={downloadEssentialData}
          disabled={!isOnline}
        >
          <Text style={styles.actionButtonText}>Download Essential Data</Text>
          <Text style={styles.actionButtonSubtext}>
            Get vendors, zones, and other data for offline use
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => setShowDetails(true)}
        >
          <Text style={styles.actionButtonText}>View Sync Details</Text>
          <Text style={styles.actionButtonSubtext}>
            See detailed sync history and queue items
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.actionButton, styles.dangerButton]}
          onPress={clearSyncQueue}
          disabled={syncQueueCount === 0}
        >
          <Text style={[styles.actionButtonText, styles.dangerButtonText]}>
            Clear Sync Queue
          </Text>
          <Text style={styles.actionButtonSubtext}>
            Remove all pending items from sync queue
          </Text>
        </TouchableOpacity>
      </View>

      {/* Sync History */}
      {syncHistory.length > 0 && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Recent Sync Activity</Text>
          {syncHistory.map((item, index) => (
            <View key={index} style={styles.historyItem}>
              <View style={styles.historyIndicator}>
                <View style={[
                  styles.historyDot,
                  { backgroundColor: item.success ? '#4caf50' : '#f44336' }
                ]} />
              </View>
              <View style={styles.historyContent}>
                <Text style={styles.historyTitle}>{item.type}</Text>
                <Text style={styles.historyTime}>
                  {formatSyncTime(item.timestamp)}
                </Text>
                {item.message && (
                  <Text style={styles.historyMessage}>{item.message}</Text>
                )}
              </View>
            </View>
          ))}
        </View>
      )}

      {/* Sync Details Modal */}
      <Modal
        visible={showDetails}
        animationType="slide"
        presentationStyle="page"
        onRequestClose={() => setShowDetails(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Sync Details</Text>
            <TouchableOpacity onPress={() => setShowDetails(false)}>
              <Text style={styles.modalClose}>Close</Text>
            </TouchableOpacity>
          </View>
          
          <ScrollView style={styles.modalContent}>
            <View style={styles.detailsSection}>
              <Text style={styles.detailsTitle}>Connection Status</Text>
              <View style={styles.detailsRow}>
                <Text style={styles.detailsLabel}>Network:</Text>
                <Text style={[styles.detailsValue, { color: isOnline ? '#4caf50' : '#f44336' }]}>
                  {isOnline ? 'Connected' : 'Disconnected'}
                </Text>
              </View>
              <View style={styles.detailsRow}>
                <Text style={styles.detailsLabel}>Server:</Text>
                <Text style={[styles.detailsValue, { color: '#4caf50' }]}>
                  Available
                </Text>
              </View>
            </View>
            
            <View style={styles.detailsSection}>
              <Text style={styles.detailsTitle}>Sync Queue</Text>
              <View style={styles.detailsRow}>
                <Text style={styles.detailsLabel}>Total Items:</Text>
                <Text style={styles.detailsValue}>{syncQueueCount}</Text>
              </View>
              <View style={styles.detailsRow}>
                <Text style={styles.detailsLabel}>Failed Items:</Text>
                <Text style={styles.detailsValue}>0</Text>
              </View>
              <View style={styles.detailsRow}>
                <Text style={styles.detailsLabel}>Retry Count:</Text>
                <Text style={styles.detailsValue}>0</Text>
              </View>
            </View>
            
            <View style={styles.detailsSection}>
              <Text style={styles.detailsTitle}>Data Statistics</Text>
              <View style={styles.detailsRow}>
                <Text style={styles.detailsLabel}>Cached Vendors:</Text>
                <Text style={styles.detailsValue}>--</Text>
              </View>
              <View style={styles.detailsRow}>
                <Text style={styles.detailsLabel}>Cached Zones:</Text>
                <Text style={styles.detailsValue}>--</Text>
              </View>
              <View style={styles.detailsRow}>
                <Text style={styles.detailsLabel}>Cache Size:</Text>
                <Text style={styles.detailsValue}>-- MB</Text>
              </View>
            </View>
          </ScrollView>
        </View>
      </Modal>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#1a237e',
    padding: 20,
    paddingTop: 40,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
  },
  statusText: {
    color: '#fff',
    fontSize: 14,
  },
  card: {
    backgroundColor: '#fff',
    margin: 16,
    padding: 16,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  syncStatusContainer: {
    marginBottom: 16,
  },
  syncStatusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  syncStatusLabel: {
    fontSize: 14,
    color: '#666',
  },
  syncStatusValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  syncButton: {
    backgroundColor: '#1a237e',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  disabledButton: {
    backgroundColor: '#ccc',
  },
  syncButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  actionButton: {
    backgroundColor: '#f5f5f5',
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  actionButtonSubtext: {
    fontSize: 12,
    color: '#666',
  },
  dangerButton: {
    backgroundColor: '#ffebee',
    borderColor: '#ffcdd2',
  },
  dangerButtonText: {
    color: '#f44336',
  },
  historyItem: {
    flexDirection: 'row',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  historyIndicator: {
    marginRight: 12,
    justifyContent: 'center',
  },
  historyDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  historyContent: {
    flex: 1,
  },
  historyTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2,
  },
  historyTime: {
    fontSize: 12,
    color: '#666',
    marginBottom: 2,
  },
  historyMessage: {
    fontSize: 12,
    color: '#999',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  modalClose: {
    fontSize: 16,
    color: '#1a237e',
    fontWeight: '600',
  },
  modalContent: {
    flex: 1,
    padding: 20,
  },
  detailsSection: {
    marginBottom: 24,
  },
  detailsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  detailsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  detailsLabel: {
    fontSize: 14,
    color: '#666',
  },
  detailsValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
});

export default SyncManager;
