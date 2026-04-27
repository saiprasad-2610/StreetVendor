import React, { useState, useEffect } from 'react';
import { 
  Card, 
  Table, 
  Tag, 
  Button, 
  Space, 
  Modal, 
  Form, 
  Input, 
  Select, 
  message, 
  Row, 
  Col, 
  Statistic, 
  Alert as AntAlert,
  Tooltip,
  Badge,
  Drawer,
  Timeline
} from 'antd';
import { 
  BellOutlined, 
  ExclamationCircleOutlined, 
  CheckCircleOutlined, 
  ClockCircleOutlined,
  AlertOutlined,
  UserOutlined,
  EyeOutlined,
  ReloadOutlined,
  FilterOutlined
} from '@ant-design/icons';
import moment from 'moment';
import api from '../../services/api';

const { TextArea } = Input;
const { Option } = Select;
const { Search } = Input;

const AlertManagement = () => {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedAlert, setSelectedAlert] = useState(null);
  const [acknowledgeModalVisible, setAcknowledgeModalVisible] = useState(false);
  const [resolveModalVisible, setResolveModalVisible] = useState(false);
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [alertStats, setAlertStats] = useState(null);
  const [filterStatus, setFilterStatus] = useState(null);
  const [filterSeverity, setFilterSeverity] = useState(null);
  const [searchText, setSearchText] = useState('');
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [form] = Form.useForm();

  useEffect(() => {
    fetchAlerts();
    fetchAlertStats();
    
    // Refresh alerts every 30 seconds
    const interval = setInterval(fetchAlerts, 30000);
    return () => clearInterval(interval);
  }, [filterStatus, filterSeverity, searchText]);

  const fetchAlerts = async () => {
    setLoading(true);
    try {
      const params = {};
      if (filterStatus) params.status = filterStatus;
      if (filterSeverity) params.severity = filterSeverity;
      
      const response = await api.get('/api/alerts', { params });
      let filteredAlerts = response.data.data;
      
      // Apply search filter
      if (searchText) {
        filteredAlerts = filteredAlerts.filter(alert => 
          alert.title.toLowerCase().includes(searchText.toLowerCase()) ||
          alert.message.toLowerCase().includes(searchText.toLowerCase()) ||
          alert.alertType.toLowerCase().includes(searchText.toLowerCase())
        );
      }
      
      setAlerts(filteredAlerts);
    } catch (error) {
      message.error('Failed to fetch alerts');
    } finally {
      setLoading(false);
    }
  };

  const fetchAlertStats = async () => {
    try {
      const response = await api.get('/api/alerts/statistics', {
        params: {
          startDate: moment().subtract(30, 'days').format('YYYY-MM-DD'),
          endDate: moment().format('YYYY-MM-DD')
        }
      });
      setAlertStats(response.data.data);
    } catch (error) {
      console.error('Failed to fetch alert statistics:', error);
    }
  };

  const handleAcknowledge = (alert) => {
    setSelectedAlert(alert);
    setAcknowledgeModalVisible(true);
  };

  const handleResolve = (alert) => {
    setSelectedAlert(alert);
    setResolveModalVisible(true);
  };

  const confirmAcknowledge = async () => {
    try {
      await api.put(`/api/alerts/${selectedAlert.id}/acknowledge`);
      message.success('Alert acknowledged successfully');
      setAcknowledgeModalVisible(false);
      fetchAlerts();
      fetchAlertStats();
    } catch (error) {
      message.error('Failed to acknowledge alert');
    }
  };

  const confirmResolve = async (values) => {
    try {
      await api.put(`/api/alerts/${selectedAlert.id}/resolve`, {
        resolutionNotes: values.resolutionNotes
      });
      message.success('Alert resolved successfully');
      setResolveModalVisible(false);
      form.resetFields();
      fetchAlerts();
      fetchAlertStats();
    } catch (error) {
      message.error('Failed to resolve alert');
    }
  };

  const handleViewDetails = (alert) => {
    setSelectedAlert(alert);
    setDrawerVisible(true);
  };

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'CRITICAL': return 'red';
      case 'HIGH': return 'orange';
      case 'MEDIUM': return 'gold';
      case 'LOW': return 'green';
      default: return 'default';
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'PENDING': return 'red';
      case 'ACKNOWLEDGED': return 'orange';
      case 'IN_PROGRESS': return 'blue';
      case 'RESOLVED': return 'green';
      default: return 'default';
    }
  };

  const columns = [
    {
      title: 'Type',
      dataIndex: 'alertType',
      key: 'alertType',
      render: (type) => (
        <Tag color="blue">{type.replace('_', ' ')}</Tag>
      )
    },
    {
      title: 'Title',
      dataIndex: 'title',
      key: 'title',
      render: (title, record) => (
        <div>
          <strong>{title}</strong>
          {record.autoEscalated && (
            <Tag color="purple" size="small" style={{ marginLeft: '8px' }}>
              Auto-Escalated
            </Tag>
          )}
        </div>
      )
    },
    {
      title: 'Severity',
      dataIndex: 'severity',
      key: 'severity',
      render: (severity) => (
        <Tag color={getSeverityColor(severity)}>
          {severity}
        </Tag>
      ),
      sorter: true
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status) => (
        <Tag color={getStatusColor(status)}>
          {status.replace('_', ' ')}
        </Tag>
      ),
      sorter: true
    },
    {
      title: 'Priority',
      dataIndex: 'priorityLevel',
      key: 'priorityLevel',
      render: (priority) => (
        <Badge 
          count={priority} 
          style={{ backgroundColor: priority >= 75 ? '#f5222d' : priority >= 50 ? '#fa8c16' : '#52c41a' }}
        />
      ),
      sorter: true
    },
    {
      title: 'Created',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (date) => (
        <Tooltip title={moment(date).format('YYYY-MM-DD HH:mm:ss')}>
          {moment(date).fromNow()}
        </Tooltip>
      ),
      sorter: true
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => (
        <Space>
          <Tooltip title="View Details">
            <Button
              type="link"
              icon={<EyeOutlined />}
              onClick={() => handleViewDetails(record)}
            />
          </Tooltip>
          {record.status === 'PENDING' && (
            <Tooltip title="Acknowledge">
              <Button
                type="link"
                icon={<CheckCircleOutlined />}
                onClick={() => handleAcknowledge(record)}
              />
            </Tooltip>
          )}
          {record.status !== 'RESOLVED' && (
            <Tooltip title="Resolve">
              <Button
                type="link"
                icon={<CheckCircleOutlined />}
                onClick={() => handleResolve(record)}
              />
            </Tooltip>
          )}
        </Space>
      )
    }
  ];

  const AlertStatsCard = () => {
    if (!alertStats) return null;

    const { totalAlerts, statusCounts, severityCounts } = alertStats;

    return (
      <Row gutter={16} style={{ marginBottom: '20px' }}>
        <Col span={6}>
          <Card>
            <Statistic
              title="Total Alerts"
              value={totalAlerts}
              prefix={<BellOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Pending"
              value={statusCounts?.PENDING || 0}
              prefix={<ExclamationCircleOutlined />}
              valueStyle={{ color: '#f5222d' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Critical"
              value={severityCounts?.CRITICAL || 0}
              prefix={<AlertOutlined />}
              valueStyle={{ color: '#cf1322' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Resolved"
              value={statusCounts?.RESOLVED || 0}
              prefix={<CheckCircleOutlined />}
              valueStyle={{ color: '#3f8600' }}
            />
          </Card>
        </Col>
      </Row>
    );
  };

  const AlertDetailsDrawer = () => {
    if (!selectedAlert) return null;

    return (
      <Drawer
        title={`Alert Details - ${selectedAlert.title}`}
        placement="right"
        onClose={() => setDrawerVisible(false)}
        visible={drawerVisible}
        width={600}
        extra={
          <Space>
            {selectedAlert.status === 'PENDING' && (
              <Button
                type="primary"
                onClick={() => {
                  setDrawerVisible(false);
                  handleAcknowledge(selectedAlert);
                }}
              >
                Acknowledge
              </Button>
            )}
            {selectedAlert.status !== 'RESOLVED' && (
              <Button
                type="primary"
                onClick={() => {
                  setDrawerVisible(false);
                  handleResolve(selectedAlert);
                }}
              >
                Resolve
              </Button>
            )}
          </Space>
        }
      >
        <div>
          <Row gutter={16} style={{ marginBottom: '20px' }}>
            <Col span={12}>
              <strong>Type:</strong>
              <div>
                <Tag color="blue">{selectedAlert.alertType.replace('_', ' ')}</Tag>
              </div>
            </Col>
            <Col span={12}>
              <strong>Severity:</strong>
              <div>
                <Tag color={getSeverityColor(selectedAlert.severity)}>
                  {selectedAlert.severity}
                </Tag>
              </div>
            </Col>
          </Row>

          <Row gutter={16} style={{ marginBottom: '20px' }}>
            <Col span={12}>
              <strong>Status:</strong>
              <div>
                <Tag color={getStatusColor(selectedAlert.status)}>
                  {selectedAlert.status.replace('_', ' ')}
                </Tag>
              </div>
            </Col>
            <Col span={12}>
              <strong>Priority:</strong>
              <div>
                <Badge 
                  count={selectedAlert.priorityLevel} 
                  style={{ backgroundColor: selectedAlert.priorityLevel >= 75 ? '#f5222d' : selectedAlert.priorityLevel >= 50 ? '#fa8c16' : '#52c41a' }}
                />
              </div>
            </Col>
          </Row>

          <div style={{ marginBottom: '20px' }}>
            <strong>Message:</strong>
            <div style={{ marginTop: '8px', padding: '12px', backgroundColor: '#f5f5f5', borderRadius: '4px' }}>
              {selectedAlert.message}
            </div>
          </div>

          {selectedAlert.locationLatitude && selectedAlert.locationLongitude && (
            <div style={{ marginBottom: '20px' }}>
              <strong>Location:</strong>
              <div>
                <Tag color="geekblue">
                  {selectedAlert.locationLatitude.toFixed(6)}, {selectedAlert.locationLongitude.toFixed(6)}
                </Tag>
              </div>
            </div>
          )}

          <Timeline style={{ marginBottom: '20px' }}>
            <Timeline.Item
              dot={<ClockCircleOutlined style={{ fontSize: '16px' }} />}
              color="blue"
            >
              <strong>Created:</strong> {moment(selectedAlert.createdAt).format('YYYY-MM-DD HH:mm:ss')}
            </Timeline.Item>
            {selectedAlert.acknowledgedAt && (
              <Timeline.Item
                dot={<CheckCircleOutlined style={{ fontSize: '16px' }} />}
                color="orange"
              >
                <strong>Acknowledged:</strong> {moment(selectedAlert.acknowledgedAt).format('YYYY-MM-DD HH:mm:ss')}
              </Timeline.Item>
            )}
            {selectedAlert.resolvedAt && (
              <Timeline.Item
                dot={<CheckCircleOutlined style={{ fontSize: '16px' }} />}
                color="green"
              >
                <strong>Resolved:</strong> {moment(selectedAlert.resolvedAt).format('YYYY-MM-DD HH:mm:ss')}
              </Timeline.Item>
            )}
          </Timeline>

          {selectedAlert.resolutionNotes && (
            <div>
              <strong>Resolution Notes:</strong>
              <div style={{ marginTop: '8px', padding: '12px', backgroundColor: '#f6ffed', borderRadius: '4px', border: '1px solid #b7eb8f' }}>
                {selectedAlert.resolutionNotes}
              </div>
            </div>
          )}

          {selectedAlert.escalationLevel > 0 && (
            <AntAlert
              message={`Escalated Level ${selectedAlert.escalationLevel}`}
              description="This alert has been automatically escalated due to lack of response."
              type="warning"
              showIcon
              style={{ marginTop: '20px' }}
            />
          )}
        </div>
      </Drawer>
    );
  };

  return (
    <div>
      <AlertStatsCard />

      <Card
        title="Alert Management"
        extra={
          <Space>
            <Search
              placeholder="Search alerts..."
              allowClear
              style={{ width: 200 }}
              onChange={(e) => setSearchText(e.target.value)}
            />
            <Select
              placeholder="Filter Status"
              allowClear
              style={{ width: 120 }}
              onChange={setFilterStatus}
            >
              <Option value="PENDING">Pending</Option>
              <Option value="ACKNOWLEDGED">Acknowledged</Option>
              <Option value="IN_PROGRESS">In Progress</Option>
              <Option value="RESOLVED">Resolved</Option>
            </Select>
            <Select
              placeholder="Filter Severity"
              allowClear
              style={{ width: 120 }}
              onChange={setFilterSeverity}
            >
              <Option value="CRITICAL">Critical</Option>
              <Option value="HIGH">High</Option>
              <Option value="MEDIUM">Medium</Option>
              <Option value="LOW">Low</Option>
            </Select>
            <Button
              icon={<ReloadOutlined />}
              onClick={fetchAlerts}
              loading={loading}
            >
              Refresh
            </Button>
          </Space>
        }
      >
        <Table
          columns={columns}
          dataSource={alerts}
          rowKey="id"
          loading={loading}
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total) => `Total ${total} alerts`
          }}
          rowClassName={(record) => {
            if (record.severity === 'CRITICAL' && record.status === 'PENDING') {
              return 'critical-alert-row';
            }
            return '';
          }}
        />
      </Card>

      {/* Acknowledge Modal */}
      <Modal
        title="Acknowledge Alert"
        visible={acknowledgeModalVisible}
        onOk={confirmAcknowledge}
        onCancel={() => setAcknowledgeModalVisible(false)}
        okText="Acknowledge"
        cancelText="Cancel"
      >
        <p>Are you sure you want to acknowledge this alert?</p>
        <p><strong>Alert:</strong> {selectedAlert?.title}</p>
        <p><strong>Message:</strong> {selectedAlert?.message}</p>
      </Modal>

      {/* Resolve Modal */}
      <Modal
        title="Resolve Alert"
        visible={resolveModalVisible}
        onCancel={() => setResolveModalVisible(false)}
        footer={null}
      >
        <Form form={form} onFinish={confirmResolve} layout="vertical">
          <p><strong>Alert:</strong> {selectedAlert?.title}</p>
          <p><strong>Message:</strong> {selectedAlert?.message}</p>
          
          <Form.Item
            name="resolutionNotes"
            label="Resolution Notes"
            rules={[{ required: true, message: 'Please provide resolution notes' }]}
          >
            <TextArea
              rows={4}
              placeholder="Describe how this alert was resolved..."
            />
          </Form.Item>
          
          <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
            <Space>
              <Button onClick={() => setResolveModalVisible(false)}>
                Cancel
              </Button>
              <Button type="primary" htmlType="submit">
                Resolve
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* Alert Details Drawer */}
      <AlertDetailsDrawer />

      <style jsx>{`
        .critical-alert-row {
          background-color: #fff2f0;
        }
      `}</style>
    </div>
  );
};

export default AlertManagement;
