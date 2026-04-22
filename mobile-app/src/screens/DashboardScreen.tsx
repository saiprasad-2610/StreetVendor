import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, ActivityIndicator, Dimensions } from 'react-native';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../redux/store';
import { logout } from '../redux/authSlice';
import api from '../services/api';
import { Users, AlertTriangle, FileText, TrendingUp, LogOut, Camera, Map as MapIcon, CreditCard, ChevronRight } from 'lucide-react-native';

const { width } = Dimensions.get('window');

const StatCard = ({ title, value, icon: Icon, color }: any) => (
  <View style={styles.statCard}>
    <View style={[styles.statIconWrapper, { backgroundColor: `${color}15` }]}>
      <Icon color={color} size={24} />
    </View>
    <View style={styles.statContent}>
      <Text style={styles.statLabel}>{title}</Text>
      <Text style={styles.statNumber}>{value}</Text>
    </View>
  </View>
);

const DashboardScreen = ({ navigation }: any) => {
  const { user } = useSelector((state: RootState) => state.auth);
  const dispatch = useDispatch();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState({
    totalVendors: 0,
    approvedVendors: 0,
    pendingVendors: 0,
    totalViolations: 0,
    totalChallans: 0,
    revenue: 0,
  });

  const fetchStats = useCallback(async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      if (user.role === 'VENDOR') {
        const [challans, rent] = await Promise.all([
          api.get('/challans/my'),
          api.get('/payments/my-rent-payments')
        ]);
        
        const challanData = Array.isArray(challans.data) ? challans.data : [];
        const rentData = Array.isArray(rent.data) ? rent.data : [];
        
        setStats({
          totalVendors: 1,
          approvedVendors: 1,
          pendingVendors: 0,
          totalViolations: 0, // Backend doesn't have /violations/my yet
          totalChallans: challanData.length,
          revenue: challanData.filter((c: any) => c.status === 'PAID').reduce((acc: number, c: any) => acc + c.fineAmount, 0)
        });
      } else {
        const [vendors, violations, challans] = await Promise.all([
          api.get('/vendors'),
          api.get('/violations'),
          api.get('/challans')
        ]);

        const vData = Array.isArray(vendors.data) ? vendors.data : [];
        const violationData = Array.isArray(violations.data) ? violations.data : [];
        const challanData = Array.isArray(challans.data) ? challans.data : [];
        
        const paidChallans = challanData.filter((c: any) => c.status === 'PAID');
        
        setStats({
          totalVendors: vData.length,
          approvedVendors: vData.filter((v: any) => v.status === 'APPROVED').length,
          pendingVendors: vData.filter((v: any) => v.status === 'PENDING').length,
          totalViolations: violationData.length,
          totalChallans: challanData.length,
          revenue: paidChallans.reduce((acc: number, c: any) => acc + c.fineAmount, 0)
        });
      }
    } catch (error) {
      console.error('Failed to fetch stats', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchStats();
  };

  const handleLogout = () => {
    dispatch(logout());
  };

  if (loading && !refreshing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    );
  }

  return (
    <ScrollView 
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <View style={styles.topHeader}>
        <View>
          <Text style={styles.greeting}>Hello,</Text>
          <Text style={styles.name}>{user?.fullName || user?.username}</Text>
          <View style={styles.roleBadge}>
            <Text style={styles.roleText}>{user?.role}</Text>
          </View>
        </View>
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <LogOut color="#ef4444" size={22} />
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        <View style={styles.statsRow}>
          <StatCard title="Vendors" value={stats.totalVendors} icon={Users} color="#2563eb" />
          <StatCard title="Violations" value={stats.totalViolations} icon={AlertTriangle} color="#ef4444" />
        </View>
        <View style={styles.statsRow}>
          <StatCard title={user?.role === 'VENDOR' ? 'My Challans' : 'Total Challans'} value={stats.totalChallans} icon={FileText} color="#8b5cf6" />
          <StatCard title={user?.role === 'VENDOR' ? 'Fines Paid' : 'Total Revenue'} value={`₹${stats.revenue}`} icon={TrendingUp} color="#10b981" />
        </View>

        <Text style={styles.sectionHeading}>Quick Actions</Text>
        <View style={styles.grid}>
          {(user?.role === 'ADMIN' || user?.role === 'OFFICER') ? (
            <>
              <TouchableOpacity style={styles.gridItem} onPress={() => navigation.navigate('Scan')}>
                <View style={[styles.gridIcon, { backgroundColor: '#3b82f6' }]}>
                  <Camera color="#fff" size={24} />
                </View>
                <Text style={styles.gridLabel}>Scan QR</Text>
              </TouchableOpacity>
              
              <TouchableOpacity style={styles.gridItem} onPress={() => navigation.navigate('Vendors')}>
                <View style={[styles.gridIcon, { backgroundColor: '#10b981' }]}>
                  <Users color="#fff" size={24} />
                </View>
                <Text style={styles.gridLabel}>Vendors</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.gridItem} onPress={() => navigation.navigate('Violations')}>
                <View style={[styles.gridIcon, { backgroundColor: '#f59e0b' }]}>
                  <AlertTriangle color="#fff" size={24} />
                </View>
                <Text style={styles.gridLabel}>Violations</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.gridItem} onPress={() => navigation.navigate('ChallanList')}>
                <View style={[styles.gridIcon, { backgroundColor: '#8b5cf6' }]}>
                  <FileText color="#fff" size={24} />
                </View>
                <Text style={styles.gridLabel}>Challans</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.gridItem} onPress={() => navigation.navigate('RentManagement')}>
                <View style={[styles.gridIcon, { backgroundColor: '#ec4899' }]}>
                  <CreditCard color="#fff" size={24} />
                </View>
                <Text style={styles.gridLabel}>Rent</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.gridItem} onPress={() => navigation.navigate('Map')}>
                <View style={[styles.gridIcon, { backgroundColor: '#64748b' }]}>
                  <MapIcon color="#fff" size={24} />
                </View>
                <Text style={styles.gridLabel}>Map View</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <TouchableOpacity style={styles.gridItem} onPress={() => navigation.navigate('ChallanList')}>
                <View style={[styles.gridIcon, { backgroundColor: '#8b5cf6' }]}>
                  <FileText color="#fff" size={24} />
                </View>
                <Text style={styles.gridLabel}>My Challans</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.gridItem} onPress={() => navigation.navigate('RentManagement')}>
                <View style={[styles.gridIcon, { backgroundColor: '#ec4899' }]}>
                  <CreditCard color="#fff" size={24} />
                </View>
                <Text style={styles.gridLabel}>My Rent</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.gridItem} onPress={() => navigation.navigate('Map')}>
                <View style={[styles.gridIcon, { backgroundColor: '#64748b' }]}>
                  <MapIcon color="#fff" size={24} />
                </View>
                <Text style={styles.gridLabel}>Map View</Text>
              </TouchableOpacity>
            </>
          )}
        </View>

        <View style={styles.recentSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionHeading}>System Status</Text>
            <TouchableOpacity onPress={onRefresh}>
              <Text style={styles.seeAll}>Refresh</Text>
            </TouchableOpacity>
          </View>
          
          <View style={styles.statusCard}>
            <View style={styles.statusInfo}>
              <View style={styles.statusDot} />
              <Text style={styles.statusText}>Server Online</Text>
            </View>
            <Text style={styles.updateTime}>Last updated: {new Date().toLocaleTimeString()}</Text>
          </View>
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  topHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 24,
    paddingTop: 60,
    backgroundColor: '#fff',
  },
  greeting: {
    fontSize: 14,
    color: '#64748b',
    fontWeight: '500',
  },
  name: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1e3a8a',
  },
  roleBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#eff6ff',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    marginTop: 4,
  },
  roleText: {
    fontSize: 11,
    color: '#2563eb',
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  logoutBtn: {
    padding: 10,
    backgroundColor: '#fee2e2',
    borderRadius: 12,
  },
  content: {
    padding: 20,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
  },
  statIconWrapper: {
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statContent: {
    flex: 1,
  },
  statLabel: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '500',
  },
  statNumber: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1e293b',
  },
  sectionHeading: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1e293b',
    marginTop: 24,
    marginBottom: 16,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  gridItem: {
    width: (width - 64) / 3,
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 20,
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
  },
  gridIcon: {
    width: 48,
    height: 48,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  gridLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
  },
  recentSection: {
    marginTop: 8,
    paddingBottom: 40,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  seeAll: {
    color: '#2563eb',
    fontSize: 14,
    fontWeight: '600',
    marginTop: 10,
  },
  statusCard: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  statusInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10b981',
  },
  statusText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e293b',
  },
  updateTime: {
    fontSize: 12,
    color: '#94a3b8',
  },
});

export default DashboardScreen;
