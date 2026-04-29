import React, { useState, useEffect } from 'react';
import { Badge, Drawer, List, Button, Empty, Tag, notification, Typography, Space } from 'antd';
import { BellOutlined, DeleteOutlined, CheckOutlined, WarningOutlined, InfoCircleOutlined, CheckCircleOutlined, CloseCircleOutlined } from '@ant-design/icons';
import { alertAPI, violationAPI, zoneAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import axios from 'axios';

const { Text } = Typography;

const NotificationCenter = () => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [vendorInfo, setVendorInfo] = useState(null);

  useEffect(() => {
    // Fetch vendor info if user is a vendor
    if (user?.role === 'VENDOR') {
      fetchVendorInfo();
    }
  }, [user]);

  useEffect(() => {
    loadNotifications();
    // Poll for new notifications every 30 seconds
    const interval = setInterval(loadNotifications, 30000);
    return () => clearInterval(interval);
  }, [vendorInfo]);

  const fetchVendorInfo = async () => {
    try {
      const response = await axios.get('/api/vendors/me');
      setVendorInfo(response.data);
    } catch (error) {
      console.error('Failed to fetch vendor info:', error);
    }
  };

  const loadNotifications = async () => {
    try {
      setLoading(true);
      console.log('Loading notifications - User:', user?.role, 'VendorInfo:', vendorInfo);

      let alertsRes;

      // Use vendor-specific endpoint for vendors, general endpoint for admin/officer
      if (user?.role === 'VENDOR' && vendorInfo?.id) {
        console.log('Fetching vendor alerts for vendor ID:', vendorInfo.id);
        alertsRes = await alertAPI.getForVendor(vendorInfo.id).catch((err) => {
          console.error('Error fetching vendor alerts:', err);
          return { data: [] };
        });
        console.log('Vendor alerts response:', alertsRes);
      } else if (user?.role === 'ADMIN' || user?.role === 'OFFICER') {
        alertsRes = await alertAPI.getAll().catch(() => ({ data: [] }));
      } else {
        console.log('No matching role or missing vendorInfo.id');
        alertsRes = { data: [] };
      }

      const violationsRes = (user?.role === 'ADMIN' || user?.role === 'OFFICER')
        ? await violationAPI.getAll().catch(() => ({ data: [] }))
        : { data: [] };

      const alerts = Array.isArray(alertsRes.data?.data) ? alertsRes.data.data :
                    Array.isArray(alertsRes.data) ? alertsRes.data : [];
      const violations = Array.isArray(violationsRes.data) ? violationsRes.data : [];

      const combinedNotifications = [
        ...alerts.map(a => ({
          id: `alert-${a.id}`,
          type: 'alert',
          title: a.title || 'Alert',
          description: a.message || a.description,
          severity: a.severity || 'INFO',
          timestamp: a.createdAt,
          read: false,
          data: a
        })),
        ...violations.map(v => ({
          id: `violation-${v.id}`,
          type: 'violation',
          title: 'Violation Reported',
          description: `${v.type} - ${v.description}`,
          severity: 'HIGH',
          timestamp: v.createdAt,
          read: false,
          data: v
        }))
      ].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

      setNotifications(combinedNotifications);
      setUnreadCount(combinedNotifications.filter(n => !n.read).length);
    } catch (error) {
      console.error('Failed to load notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = (id) => {
    setNotifications(prev =>
      prev.map(n => n.id === id ? { ...n, read: true } : n)
    );
    setUnreadCount(prev => Math.max(0, prev - 1));
  };

  const markAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    setUnreadCount(0);
    notification.success({
      message: 'All notifications marked as read',
    });
  };

  const clearAll = () => {
    setNotifications([]);
    setUnreadCount(0);
    notification.info({
      message: 'All notifications cleared',
    });
  };

  const handleNotificationClick = async (notification) => {
    markAsRead(notification.id);

    if (notification.type === 'alert') {
      // Acknowledge the alert on the server for vendors
      if (user?.role === 'VENDOR' && notification.data?.id) {
        try {
          await alertAPI.acknowledgeForVendor(notification.data.id);
        } catch (error) {
          console.error('Failed to acknowledge alert:', error);
        }
      }
    } else if (notification.type === 'violation') {
      // Handle violation click - could navigate to violation details
      console.log('Violation clicked:', notification.data);
    }
  };

  const getIcon = (type, severity) => {
    if (type === 'alert') {
      switch (severity) {
        case 'CRITICAL':
          return <CloseCircleOutlined style={{ color: '#ff4d4f' }} />;
        case 'HIGH':
          return <WarningOutlined style={{ color: '#faad14' }} />;
        default:
          return <InfoCircleOutlined style={{ color: '#1890ff' }} />;
      }
    } else if (type === 'violation') {
      return <WarningOutlined style={{ color: '#ff4d4f' }} />;
    }
    return <BellOutlined />;
  };

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'CRITICAL':
        return 'red';
      case 'HIGH':
        return 'orange';
      case 'MEDIUM':
        return 'gold';
      case 'LOW':
        return 'blue';
      default:
        return 'default';
    }
  };

  const formatTime = (timestamp) => {
    const now = new Date();
    const time = new Date(timestamp);
    const diff = now - time;

    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)} min ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)} hours ago`;
    return time.toLocaleDateString();
  };

  const formatWarningMessage = (message) => {
    if (!message) return null;

    // Parse the warning message structure
    const lines = message.split('\n');
    const greeting = lines[0];
    const detailsStart = lines.findIndex(l => l.includes('Violation Details:'));
    const mainMessage = lines.slice(0, detailsStart).join(' ').replace(greeting, '').trim();

    const details = {};
    for (let i = detailsStart + 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (line.startsWith('- ')) {
        const [key, value] = line.substring(2).split(':', 2);
        if (key && value) {
          details[key.trim()] = value.trim();
        }
      }
    }

    const footerIndex = lines.findIndex(l => l.includes('SMC Street Vendor Management System'));
    const advice = footerIndex > 0 ? lines[footerIndex - 1] : '';

    return { greeting, mainMessage, details, advice };
  };

  return (
    <>
      <Badge count={unreadCount} overflowCount={99}>
        <Button
          type="text"
          icon={<BellOutlined />}
          onClick={() => setDrawerVisible(true)}
          size="large"
        />
      </Badge>

      <Drawer
        title={
          <Space>
            <BellOutlined />
            <span>Notifications</span>
            {unreadCount > 0 && (
              <Tag color="blue">{unreadCount} unread</Tag>
            )}
          </Space>
        }
        placement="right"
        size="large"
        onClose={() => setDrawerVisible(false)}
        open={drawerVisible}
        extra={
          <Space>
            {unreadCount > 0 && (
              <Button
                icon={<CheckOutlined />}
                onClick={markAllAsRead}
                size="small"
              >
                Mark all read
              </Button>
            )}
            <Button
              icon={<DeleteOutlined />}
              onClick={clearAll}
              size="small"
              danger
            >
              Clear all
            </Button>
          </Space>
        }
      >
        {loading ? (
          <div style={{ textAlign: 'center', padding: '50px 0' }}>
            Loading notifications...
          </div>
        ) : notifications.length > 0 ? (
          <List
            dataSource={notifications}
            renderItem={(item) => (
              <List.Item
                key={item.id}
                onClick={() => handleNotificationClick(item)}
                style={{
                  cursor: 'pointer',
                  backgroundColor: item.read ? 'transparent' : '#f0f7ff',
                  padding: '12px',
                  borderRadius: '8px',
                  marginBottom: '8px',
                }}
                actions={[
                  !item.read && (
                    <Button
                      type="text"
                      icon={<CheckOutlined />}
                      onClick={(e) => {
                        e.stopPropagation();
                        markAsRead(item.id);
                      }}
                      size="small"
                    />
                  )
                ]}
              >
                <List.Item.Meta
                  avatar={getIcon(item.type, item.severity)}
                  title={
                    <Space>
                      <Text strong={!item.read}>{item.title}</Text>
                      <Tag color={getSeverityColor(item.severity)} size="small">
                        {item.severity}
                      </Tag>
                    </Space>
                  }
                  description={
                    <div style={{ marginTop: '4px' }}>
                      {item.type === 'alert' && item.title?.includes('Warning') ? (
                        // Enhanced warning message display
                        (() => {
                          const parsed = formatWarningMessage(item.description);
                          return parsed ? (
                            <div style={{ lineHeight: '1.5' }}>
                              <div style={{ marginBottom: '8px' }}>
                                <Text strong style={{ fontSize: '14px' }}>
                                  {parsed.greeting}
                                </Text>
                              </div>

                              <div style={{
                                backgroundColor: '#fff7e6',
                                borderLeft: '3px solid #faad14',
                                padding: '8px 12px',
                                marginBottom: '10px',
                                borderRadius: '4px'
                              }}>
                                <Text>{parsed.mainMessage}</Text>
                              </div>

                              {Object.keys(parsed.details).length > 0 && (
                                <div style={{ marginBottom: '10px' }}>
                                  <Text strong style={{ fontSize: '12px', color: '#666' }}>
                                    Violation Details:
                                  </Text>
                                  <div style={{ marginLeft: '8px', marginTop: '4px' }}>
                                    {Object.entries(parsed.details).map(([key, value]) => (
                                      <div key={key} style={{ marginBottom: '2px' }}>
                                        <Tag color="default" style={{ marginRight: '4px', fontSize: '11px' }}>
                                          {key}
                                        </Tag>
                                        <Text style={{ fontSize: '12px' }}>{value}</Text>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {parsed.advice && (
                                <div style={{
                                  backgroundColor: '#f6ffed',
                                  borderLeft: '3px solid #52c41a',
                                  padding: '8px 12px',
                                  marginBottom: '8px',
                                  borderRadius: '4px'
                                }}>
                                  <Text style={{ fontSize: '12px', color: '#389e0d' }}>
                                    <CheckOutlined style={{ marginRight: '4px' }} />
                                    {parsed.advice}
                                  </Text>
                                </div>
                              )}

                              <Text type="secondary" style={{ fontSize: '12px', display: 'block', marginTop: '8px' }}>
                                {formatTime(item.timestamp)}
                              </Text>
                            </div>
                          ) : (
                            <Text type="secondary">{item.description}</Text>
                          );
                        })()
                      ) : (
                        // Default display for non-warning notifications
                        <>
                          <Text type="secondary" style={{ display: 'block', marginBottom: '4px', lineHeight: '1.5' }}>
                            {item.description}
                          </Text>
                          <Text type="secondary" style={{ fontSize: '12px' }}>
                            {formatTime(item.timestamp)}
                          </Text>
                        </>
                      )}
                    </div>
                  }
                />
              </List.Item>
            )}
          />
        ) : (
          <Empty
            description="No notifications"
            image={Empty.PRESENTED_IMAGE_SIMPLE}
          />
        )}
      </Drawer>
    </>
  );
};

export default NotificationCenter;
