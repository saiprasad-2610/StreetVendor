import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Alert,
  ActivityIndicator,
  Modal,
  TextInput,
  ScrollView,
} from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import offlineStorage from '../services/OfflineStorageService';
import apiService from '../services/APIService';

const CitizenReportList = ({ navigation }) => {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [isOnline, setIsOnline] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [showPhoneInput, setShowPhoneInput] = useState(false);
  const [selectedReport, setSelectedReport] = useState(null);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    checkConnectivity();
    loadReports();
  }, []);

  const checkConnectivity = async () => {
    const state = await NetInfo.fetch();
    setIsOnline(state.isConnected);
  };

  const loadReports = async () => {
    setLoading(true);
    try {
      // Try to load from API first if online
      if (isOnline && phoneNumber) {
        try {
          const response = await apiService.getMyReports(phoneNumber);
          setReports(response.data.data || []);
        } catch (error) {
          console.log('API failed, loading from offline storage:', error);
          await loadOfflineReports();
        }
      } else {
        await loadOfflineReports();
      }
    } catch (error) {
      console.error('Failed to load reports:', error);
      Alert.alert('Error', 'Failed to load reports');
    } finally {
      setLoading(false);
    }
  };

  const loadOfflineReports = async () => {
    try {
      const offlineReports = await offlineStorage.getMyReports(phoneNumber);
      setReports(offlineReports);
    } catch (error) {
      console.error('Failed to load offline reports:', error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await checkConnectivity();
    await loadReports();
    setRefreshing(false);
  };

  const handlePhoneSubmit = async () => {
    if (!phoneNumber.trim()) {
      Alert.alert('Error', 'Please enter your phone number');
      return;
    }

    if (!/^[6-9]\d{9}$/.test(phoneNumber)) {
      Alert.alert('Error', 'Please enter a valid 10-digit phone number');
      return;
    }

    setShowPhoneInput(false);
    await loadReports();
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'PENDING_REVIEW':
        return '#ff9800';
      case 'UNDER_INVESTIGATION':
        return '#2196f3';
      case 'CONFIRMED':
        return '#4caf50';
      case 'DISMISSED':
        return '#f44336';
      case 'RESOLVED':
        return '#4caf50';
      default:
        return '#9e9e9e';
    }
  };

  const getStatusText = (status) => {
    return status.replace('_', ' ').toLowerCase();
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getValidationColor = (score) => {
    if (score >= 0.8) return '#4caf50';
    if (score >= 0.6) return '#ff9800';
    if (score >= 0.4) return '#ff5722';
    return '#f44336';
  };

  const getValidationText = (score) => {
    if (score >= 0.8) return 'High';
    if (score >= 0.6) return 'Medium';
    if (score >= 0.4) return 'Low';
    return 'Very Low';
  };

  const renderReportItem = ({ item }) => (
    <TouchableOpacity
      style={styles.reportItem}
      onPress={() => {
        setSelectedReport(item);
        setShowDetails(true);
      }}
    >
      <View style={styles.reportHeader}>
        <Text style={styles.reportType}>
          {item.reportType.replace('_', ' ').toLowerCase()}
        </Text>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
          <Text style={styles.statusText}>{getStatusText(item.status)}</Text>
        </View>
      </View>

      <Text style={styles.reportDescription} numberOfLines={2}>
        {item.description}
      </Text>

      <View style={styles.reportFooter}>
        <Text style={styles.reportDate}>
          {formatDate(item.createdAt)}
        </Text>
        {item.validationScore && (
          <View style={styles.validationContainer}>
            <Text style={styles.validationLabel}>Confidence:</Text>
            <Text style={[styles.validationValue, { color: getValidationColor(item.validationScore) }]}>
              {getValidationText(item.validationScore)}
            </Text>
          </View>
        )}
      </View>

      {item.status === 'CONFIRMED' && item.violationId && (
        <View style={styles.violationBadge}>
          <Text style={styles.violationBadgeText}>Converted to Violation</Text>
        </View>
      )}
    </TouchableOpacity>
  );

  const ReportDetailsModal = () => {
    if (!selectedReport) return null;

    return (
      <Modal
        visible={showDetails}
        animationType="slide"
        presentationStyle="page"
        onRequestClose={() => setShowDetails(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Report Details</Text>
            <TouchableOpacity onPress={() => setShowDetails(false)}>
              <Text style={styles.modalClose}>Close</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            <View style={styles.detailSection}>
              <Text style={styles.detailTitle}>Report Information</Text>
              
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Report ID:</Text>
                <Text style={styles.detailValue}>{selectedReport.id}</Text>
              </View>

              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Type:</Text>
                <Text style={styles.detailValue}>
                  {selectedReport.reportType.replace('_', ' ').toLowerCase()}
                </Text>
              </View>

              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Status:</Text>
                <View style={[styles.statusBadge, { backgroundColor: getStatusColor(selectedReport.status) }]}>
                  <Text style={styles.statusText}>{getStatusText(selectedReport.status)}</Text>
                </View>
              </View>

              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Submitted:</Text>
                <Text style={styles.detailValue}>{formatDate(selectedReport.createdAt)}</Text>
              </View>
            </View>

            <View style={styles.detailSection}>
              <Text style={styles.detailTitle}>Description</Text>
              <Text style={styles.detailDescription}>{selectedReport.description}</Text>
            </View>

            {selectedReport.validationScore && (
              <View style={styles.detailSection}>
                <Text style={styles.detailTitle}>Validation Score</Text>
                <View style={styles.validationContainer}>
                  <Text style={styles.validationLabel}>Confidence Level:</Text>
                  <Text style={[styles.validationValue, { color: getValidationColor(selectedReport.validationScore) }]}>
                    {getValidationText(selectedReport.validationScore)} ({Math.round(selectedReport.validationScore * 100)}%)
                  </Text>
                </View>
              </View>
            )}

            {selectedReport.locationLatitude && selectedReport.locationLongitude && (
              <View style={styles.detailSection}>
                <Text style={styles.detailTitle}>Location</Text>
                <Text style={styles.detailValue}>
                  GPS: {selectedReport.locationLatitude.toFixed(6)}, {selectedReport.locationLongitude.toFixed(6)}
                </Text>
                {selectedReport.locationAddress && (
                  <Text style={styles.detailValue}>
                    Address: {selectedReport.locationAddress}
                  </Text>
                )}
              </View>
            )}

            {selectedReport.resolutionNotes && (
              <View style={styles.detailSection}>
                <Text style={styles.detailTitle}>Resolution</Text>
                <Text style={styles.detailDescription}>{selectedReport.resolutionNotes}</Text>
              </View>
            )}

            {selectedReport.status === 'CONFIRMED' && selectedReport.violationId && (
              <View style={styles.detailSection}>
                <Text style={styles.detailTitle}>Converted to Violation</Text>
                <Text style={styles.detailValue}>Violation ID: {selectedReport.violationId}</Text>
              </View>
            )}
          </ScrollView>
        </View>
      </Modal>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>My Reports</Text>
        <TouchableOpacity
          style={styles.phoneButton}
          onPress={() => setShowPhoneInput(true)}
        >
          <Text style={styles.phoneButtonText}>
            {phoneNumber ? `Phone: ${phoneNumber}` : 'Set Phone'}
          </Text>
        </TouchableOpacity>
      </View>

      {!isOnline && (
        <View style={styles.offlineBanner}>
          <Text style={styles.offlineBannerText}>
            Offline - Showing cached reports. Some features may be limited.
          </Text>
        </View>
      )}

      <FlatList
        data={reports}
        renderItem={renderReportItem}
        keyExtractor={(item) => item.id?.toString()}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>
              {phoneNumber ? 'No reports found' : 'Please set your phone number to view reports'}
            </Text>
          </View>
        }
        contentContainerStyle={styles.listContainer}
      />

      {loading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#1a237e" />
        </View>
      )}

      {/* Phone Input Modal */}
      <Modal
        visible={showPhoneInput}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowPhoneInput(false)}
      >
        <View style={styles.phoneModalContainer}>
          <View style={styles.phoneModalContent}>
            <Text style={styles.phoneModalTitle}>Enter Phone Number</Text>
            <Text style={styles.phoneModalSubtitle}>
              Enter your 10-digit phone number to view your reports
            </Text>
            
            <TextInput
              style={styles.phoneInput}
              value={phoneNumber}
              onChangeText={setPhoneNumber}
              placeholder="Enter 10-digit phone number"
              keyboardType="phone-pad"
              maxLength={10}
              autoFocus
            />

            <View style={styles.phoneModalButtons}>
              <TouchableOpacity
                style={[styles.phoneModalButton, styles.cancelButton]}
                onPress={() => setShowPhoneInput(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.phoneModalButton, styles.submitButton]}
                onPress={handlePhoneSubmit}
              >
                <Text style={styles.submitButtonText}>Submit</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Report Details Modal */}
      <ReportDetailsModal />
    </View>
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
  phoneButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
  },
  phoneButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  offlineBanner: {
    backgroundColor: '#fff3cd',
    padding: 12,
    margin: 16,
    borderRadius: 4,
    borderLeftWidth: 4,
    borderLeftColor: '#ffc107',
  },
  offlineBannerText: {
    color: '#856404',
    fontSize: 14,
    textAlign: 'center',
  },
  listContainer: {
    padding: 16,
  },
  reportItem: {
    backgroundColor: '#fff',
    padding: 16,
    marginBottom: 12,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  reportHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  reportType: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    textTransform: 'capitalize',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  reportDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
    lineHeight: 20,
  },
  reportFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  reportDate: {
    fontSize: 12,
    color: '#999',
  },
  validationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  validationLabel: {
    fontSize: 12,
    color: '#666',
    marginRight: 4,
  },
  validationValue: {
    fontSize: 12,
    fontWeight: '600',
  },
  violationBadge: {
    backgroundColor: '#e8f5e8',
    padding: 8,
    borderRadius: 4,
    marginTop: 8,
  },
  violationBadgeText: {
    color: '#2e7d32',
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  loadingContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  phoneModalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  phoneModalContent: {
    backgroundColor: '#fff',
    padding: 24,
    borderRadius: 8,
    width: '80%',
    maxWidth: 300,
  },
  phoneModalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
    textAlign: 'center',
  },
  phoneModalSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 20,
    textAlign: 'center',
  },
  phoneInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 4,
    padding: 12,
    fontSize: 16,
    marginBottom: 20,
    textAlign: 'center',
  },
  phoneModalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  phoneModalButton: {
    flex: 1,
    padding: 12,
    borderRadius: 4,
    alignItems: 'center',
    marginHorizontal: 8,
  },
  cancelButton: {
    backgroundColor: '#f5f5f5',
  },
  cancelButtonText: {
    color: '#666',
    fontWeight: '600',
  },
  submitButton: {
    backgroundColor: '#1a237e',
  },
  submitButtonText: {
    color: '#fff',
    fontWeight: '600',
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
  detailSection: {
    marginBottom: 24,
  },
  detailTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  detailLabel: {
    fontSize: 14,
    color: '#666',
  },
  detailValue: {
    fontSize: 14,
    color: '#333',
    fontWeight: '600',
  },
  detailDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
});

export default CitizenReportList;
