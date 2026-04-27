import React, { useState, useEffect } from 'react';
import { 
  Card, 
  Row, 
  Col, 
  Statistic, 
  Table, 
  Progress, 
  Tag, 
  Space,
  Select,
  DatePicker,
  Spin,
  Alert
} from 'antd';
import { 
  Users,
  AlertTriangle,
  DollarSign,
  FileText,
  TrendingUp,
  TrendingDown,
  RotateCcw
} from 'lucide-react';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import moment from 'moment';
import api from '../../services/api';

const { RangePicker } = DatePicker;
const { Option } = Select;

const Dashboard = () => {
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [dateRange, setDateRange] = useState([
    moment().subtract(30, 'days'),
    moment()
  ]);
  const [realTimeData, setRealTimeData] = useState(null);

  useEffect(() => {
    fetchDashboardData();
    fetchRealTimeData();
    
    // Refresh real-time data every 30 seconds
    const interval = setInterval(fetchRealTimeData, 30000);
    return () => clearInterval(interval);
  }, [dateRange]);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const [startDate, endDate] = dateRange;
      const response = await api.get('/api/analytics/dashboard', {
        params: {
          startDate: startDate.format('YYYY-MM-DD'),
          endDate: endDate.format('YYYY-MM-DD')
        }
      });
      setDashboardData(response.data.data);
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchRealTimeData = async () => {
    try {
      const response = await api.get('/api/analytics/realtime');
      setRealTimeData(response.data.data);
    } catch (error) {
      console.error('Failed to fetch real-time data:', error);
    }
  };

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D'];

  if (!dashboardData || loading) {
    return (
      <div style={{ textAlign: 'center', padding: '50px' }}>
        <Spin size="large" />
        <div style={{ marginTop: '20px' }}>Loading dashboard...</div>
      </div>
    );
  }

  const { vendorStats, violationStats, revenueStats, citizenReportStats, zoneStats } = dashboardData;

  // Prepare chart data
  const revenueChartData = Object.entries(revenueStats.revenueByMonth || {}).map(([month, amount]) => ({
    month,
    revenue: parseFloat(amount)
  }));

  const violationTypeData = Object.entries(violationStats.violationsByType || {}).map(([type, count]) => ({
    name: type.replace('_', ' '),
    value: count
  }));

  const vendorCategoryData = Object.entries(vendorStats.vendorsByCategory || {}).map(([category, count]) => ({
    name: category,
    value: count
  }));

  const reportTypeData = Object.entries(citizenReportStats.reportsByType || {}).map(([type, count]) => ({
    name: type.replace('_', ' '),
    value: count
  }));

  const zoneUtilizationData = zoneStats.zoneCapacities?.map(zone => ({
    name: zone.zoneName,
    current: zone.currentVendors,
    max: zone.maxVendors,
    utilization: zone.utilizationRate * 100
  })) || [];

  const violationColumns = [
    {
      title: 'Vendor ID',
      dataIndex: 'vendorId',
      key: 'vendorId'
    },
    {
      title: 'Violation Count',
      dataIndex: 'count',
      key: 'count',
      render: (count) => <Tag color="red">{count}</Tag>
    }
  ];

  const zoneColumns = [
    {
      title: 'Zone Name',
      dataIndex: 'zoneName',
      key: 'zoneName'
    },
    {
      title: 'Current / Max',
      key: 'capacity',
      render: (_, record) => `${record.currentVendors} / ${record.maxVendors}`
    },
    {
      title: 'Utilization',
      dataIndex: 'utilizationRate',
      key: 'utilizationRate',
      render: (rate) => (
        <Progress
          percent={rate * 100}
          size="small"
          status={rate >= 0.9 ? 'exception' : 'normal'}
        />
      )
    }
  ];

  return (
    <div>
      {/* Date Range Selector */}
      <Card style={{ marginBottom: '20px' }}>
        <Row justify="space-between" align="middle">
          <Col>
            <Space>
              <span>Date Range:</span>
              <RangePicker
                value={dateRange}
                onChange={setDateRange}
                format="YYYY-MM-DD"
              />
              <Button
                icon={<RotateCcw />}
                onClick={fetchDashboardData}
                loading={loading}
              >
                Refresh
              </Button>
            </Space>
          </Col>
          <Col>
            {realTimeData && (
              <Alert
                message={`Live: ${realTimeData.activeVendors} vendors active | ${realTimeData.todayViolations} violations today`}
                type="info"
                showIcon
              />
            )}
          </Col>
        </Row>
      </Card>

      {/* Real-time Stats */}
      <Row gutter={16} style={{ marginBottom: '20px' }}>
        <Col span={6}>
          <Card>
            <Statistic
              title="Active Vendors"
              value={realTimeData?.activeVendors || 0}
              prefix={<Users />}
              valueStyle={{ color: '#3f8600' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Today's Violations"
              value={realTimeData?.todayViolations || 0}
              prefix={<AlertTriangle />}
              valueStyle={{ color: '#cf1322' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Today's Revenue"
              value={realTimeData?.todayRevenue || 0}
              prefix={<DollarSign />}
              precision={2}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Pending Reports"
              value={realTimeData?.pendingReports || 0}
              prefix={<FileText />}
              valueStyle={{ color: '#722ed1' }}
            />
          </Card>
        </Col>
      </Row>

      {/* Vendor Statistics */}
      <Row gutter={16} style={{ marginBottom: '20px' }}>
        <Col span={8}>
          <Card title="Vendor Overview">
            <Row gutter={16}>
              <Col span={12}>
                <Statistic
                  title="Total Vendors"
                  value={vendorStats.totalVendors}
                  prefix={<Users />}
                />
              </Col>
              <Col span={12}>
                <Statistic
                  title="Active Vendors"
                  value={vendorStats.activeVendors}
                  prefix={<TrendingUp />}
                  valueStyle={{ color: '#3f8600' }}
                />
              </Col>
            </Row>
            <Row gutter={16} style={{ marginTop: '20px' }}>
              <Col span={12}>
                <Statistic
                  title="Pending Approval"
                  value={vendorStats.pendingVendors}
                  prefix={<AlertTriangle />}
                  valueStyle={{ color: '#fa8c16' }}
                />
              </Col>
              <Col span={12}>
                <Statistic
                  title="New This Month"
                  value={vendorStats.newVendorsThisMonth}
                  prefix={<TrendingUp />}
                  valueStyle={{ color: '#52c41a' }}
                />
              </Col>
            </Row>
          </Card>
        </Col>
        <Col span={16}>
          <Card title="Vendor Distribution by Category">
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={vendorCategoryData}
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                  label={({ name, value }) => `${name}: ${value}`}
                >
                  {vendorCategoryData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </Card>
        </Col>
      </Row>

      {/* Revenue Trends */}
      <Row gutter={16} style={{ marginBottom: '20px' }}>
        <Col span={24}>
          <Card title="Revenue Trends">
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={revenueChartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="revenue"
                  stroke="#8884d8"
                  strokeWidth={2}
                  dot={{ fill: '#8884d8' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </Card>
        </Col>
      </Row>

      {/* Violations and Reports */}
      <Row gutter={16} style={{ marginBottom: '20px' }}>
        <Col span={12}>
          <Card title="Violation Types">
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={violationTypeData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="value" fill="#8884d8" />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </Col>
        <Col span={12}>
          <Card title="Citizen Reports">
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={reportTypeData}
                  cx="50%"
                  cy="50%"
                  innerRadius={40}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {reportTypeData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </Card>
        </Col>
      </Row>

      {/* Zone Utilization */}
      <Row gutter={16} style={{ marginBottom: '20px' }}>
        <Col span={24}>
          <Card title="Zone Utilization">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={zoneUtilizationData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="current" fill="#8884d8" name="Current Vendors" />
                <Bar dataKey="max" fill="#82ca9d" name="Max Capacity" />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </Col>
      </Row>

      {/* Detailed Tables */}
      <Row gutter={16}>
        <Col span={12}>
          <Card title="Top Violating Vendors">
            <Table
              columns={violationColumns}
              dataSource={violationStats.topViolatingVendors || []}
              rowKey="vendorId"
              pagination={false}
              size="small"
            />
          </Card>
        </Col>
        <Col span={12}>
          <Card title="Zone Capacity Details">
            <Table
              columns={zoneColumns}
              dataSource={zoneStats.topUtilizedZones || []}
              rowKey="zoneId"
              pagination={false}
              size="small"
            />
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default Dashboard;
