import React, { useState, useEffect } from 'react';
import { Badge, Drawer, List, Button, Empty, Tag, notification, Typography, Space } from 'antd';
import { BellOutlined, DeleteOutlined, CheckOutlined, WarningOutlined, InfoCircleOutlined, CheckCircleOutlined, CloseCircleOutlined } from '@ant-design/icons';
import { alertAPI, violationAPI, zoneAPI } from '../../services/api';

const { Text } = Typography;

const NotificationCenter = () => {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadNotifications();
    // Poll for new notifications every 30 seconds
    const interval = setInterval(loadNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadNotifications = async () => {
    try {
      setLoading(true);
      const [alertsRes, violationsRes] = await Promise.all([
        alertAPI.getAll().catch(() => ({ data: [] })),
        violationAPI.getAll().catch(() => ({ data: [] }))
      ]);

      const alerts = Array.isArray(alertsRes.data) ? alertsRes.data : [];
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

  const handleNotificationClick = (notification) => {
    markAsRead(notification.id);
    
    if (notification.type === 'alert') {
      // Handle alert click - could navigate to alert details
      console.log('Alert clicked:', notification.data);
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
                    <div>
                      <Text type="secondary">{item.description}</Text>
                      <br />
                      <Text type="secondary" style={{ fontSize: '12px' }}>
                        {formatTime(item.timestamp)}
                      </Text>
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
