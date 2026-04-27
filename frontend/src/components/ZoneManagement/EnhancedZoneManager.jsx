import React, { useState, useEffect } from 'react';
import { 
  Card, 
  Button, 
  Table, 
  Modal, 
  Form, 
  Input, 
  Select, 
  InputNumber, 
  message, 
  Tabs, 
  Tag, 
  Space,
  Tooltip,
  Row,
  Col,
  Statistic,
  Progress
} from 'antd';
import { 
  PlusOutlined, 
  EditOutlined, 
  DeleteOutlined, 
  EyeOutlined,
  EnvironmentOutlined,
  UserOutlined,
  ClockCircleOutlined
} from '@ant-design/icons';
import { MapContainer, TileLayer, Polygon, Marker, Popup, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import iconRetinaUrl from 'leaflet/dist/images/marker-icon-2x.png';
import iconUrl from 'leaflet/dist/images/marker-icon.png';
import shadowUrl from 'leaflet/dist/images/marker-shadow.png';
import api from '../../services/api';

const { TabPane } = Tabs;
const { Option } = Select;
const { TextArea } = Input;

// Fix Leaflet default icon
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: iconRetinaUrl,
  iconUrl: iconUrl,
  shadowUrl: shadowUrl,
});

const EnhancedZoneManager = () => {
  const [zones, setZones] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingZone, setEditingZone] = useState(null);
  const [mapModalVisible, setMapModalVisible] = useState(false);
  const [selectedZone, setSelectedZone] = useState(null);
  const [polygonPoints, setPolygonPoints] = useState([]);
  const [form] = Form.useForm();
  const [zoneStats, setZoneStats] = useState({});

  useEffect(() => {
    fetchZones();
    fetchZoneStats();
  }, []);

  const fetchZones = async () => {
    setLoading(true);
    try {
      const response = await api.get('/api/zones');
      setZones(response.data.data);
    } catch (error) {
      message.error('Failed to fetch zones');
    } finally {
      setLoading(false);
    }
  };

  const fetchZoneStats = async () => {
    try {
      const response = await api.get('/api/zones/capacity/all');
      setZoneStats(response.data.data.reduce((acc, stat) => {
        acc[stat.zoneId] = stat;
        return acc;
      }, {}));
    } catch (error) {
      console.error('Failed to fetch zone stats:', error);
    }
  };

  const handleCreate = () => {
    setEditingZone(null);
    setPolygonPoints([]);
    form.resetFields();
    setModalVisible(true);
  };

  const handleEdit = (zone) => {
    setEditingZone(zone);
    form.setFieldsValue({
      ...zone,
      centerLatitude: zone.latitude,
      centerLongitude: zone.longitude,
      maxVendors: zone.maxVendors,
      zoneCategory: zone.zoneCategory,
      managerEmail: zone.managerEmail,
      managerPhone: zone.managerPhone
    });
    
    // Parse polygon coordinates if exists
    if (zone.polygonCoordinates) {
      try {
        const coords = JSON.parse(zone.polygonCoordinates);
        setPolygonPoints(coords);
      } catch (e) {
        console.error('Failed to parse polygon coordinates:', e);
      }
    }
    
    setModalVisible(true);
  };

  const handleSubmit = async (values) => {
    try {
      const zoneData = {
        ...values,
        polygonCoordinates: polygonPoints.length > 0 ? JSON.stringify(polygonPoints) : null
      };

      if (editingZone) {
        await api.put(`/api/zones/${editingZone.id}`, zoneData);
        message.success('Zone updated successfully');
      } else {
        await api.post('/api/zones', zoneData);
        message.success('Zone created successfully');
      }

      setModalVisible(false);
      fetchZones();
      fetchZoneStats();
    } catch (error) {
      message.error('Failed to save zone');
    }
  };

  const handleDelete = async (zoneId) => {
    try {
      await api.put(`/api/zones/${zoneId}/deactivate`);
      message.success('Zone deactivated successfully');
      fetchZones();
    } catch (error) {
      message.error('Failed to deactivate zone');
    }
  };

  const handleViewMap = (zone) => {
    setSelectedZone(zone);
    setMapModalVisible(true);
  };

  const ZoneMap = ({ zone, onPolygonChange }) => {
    const [mapCenter, setMapCenter] = useState([17.6599, 75.9064]); // Solapur center
    const [drawingMode, setDrawingMode] = useState(false);

    useEffect(() => {
      if (zone) {
        setMapCenter([zone.latitude, zone.longitude]);
      }
    }, [zone]);

    const MapEvents = () => {
      useMapEvents({
        click: (e) => {
          if (drawingMode) {
            const newPoints = [...polygonPoints, [e.latlng.lat, e.latlng.lng]];
            setPolygonPoints(newPoints);
            onPolygonChange(newPoints);
          }
        }
      });
      return null;
    };

    return (
      <div style={{ height: '400px', width: '100%' }}>
        <MapContainer
          center={mapCenter}
          zoom={13}
          style={{ height: '100%', width: '100%' }}
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          />
          
          <MapEvents />
          
          {/* Center marker */}
          {zone && (
            <Marker position={[zone.latitude, zone.longitude]}>
              <Popup>
                <div>
                  <strong>{zone.name}</strong><br />
                  Type: {zone.zoneType}<br />
                  Category: {zone.zoneCategory || 'N/A'}
                </div>
              </Popup>
            </Marker>
          )}
          
          {/* Polygon */}
          {polygonPoints.length > 2 && (
            <Polygon
              positions={polygonPoints}
              pathOptions={{ color: 'blue', weight: 2, fillOpacity: 0.3 }}
            />
          )}
          
          {/* Drawing mode indicator */}
          {drawingMode && (
            <div style={{ position: 'absolute', top: '10px', left: '10px', zIndex: 1000 }}>
              <Tag color="blue">Drawing Mode - Click to add points</Tag>
            </div>
          )}
        </MapContainer>
        
        <div style={{ marginTop: '10px' }}>
          <Button
            type={drawingMode ? 'primary' : 'default'}
            onClick={() => setDrawingMode(!drawingMode)}
            style={{ marginRight: '10px' }}
          >
            {drawingMode ? 'Stop Drawing' : 'Start Drawing Polygon'}
          </Button>
          <Button onClick={() => setPolygonPoints([])} disabled={polygonPoints.length === 0}>
            Clear Polygon
          </Button>
          <span style={{ marginLeft: '10px' }}>
            Points: {polygonPoints.length}
          </span>
        </div>
      </div>
    );
  };

  const columns = [
    {
      title: 'Zone Name',
      dataIndex: 'name',
      key: 'name',
      render: (text, record) => (
        <Space>
          <strong>{text}</strong>
          {record.zoneCategory && (
            <Tag color="blue">{record.zoneCategory}</Tag>
          )}
        </Space>
      )
    },
    {
      title: 'Type',
      dataIndex: 'zoneType',
      key: 'zoneType',
      render: (type) => (
        <Tag color={type === 'ALLOWED' ? 'green' : type === 'RESTRICTED' ? 'red' : 'orange'}>
          {type}
        </Tag>
      )
    },
    {
      title: 'Capacity',
      key: 'capacity',
      render: (_, record) => {
        const stats = zoneStats[record.id];
        if (!stats) return '-';
        
        return (
          <div>
            <Progress
              percent={stats.utilizationRate * 100}
              size="small"
              status={stats.isFull ? 'exception' : 'normal'}
              format={() => `${stats.currentVendors}/${stats.maxVendors}`}
            />
            <small>{Math.round(stats.utilizationRate * 100)}% utilized</small>
          </div>
        );
      }
    },
    {
      title: 'Location',
      key: 'location',
      render: (_, record) => (
        <Space>
          <span>{record.latitude?.toFixed(4)}, {record.longitude?.toFixed(4)}</span>
          {record.hasPolygon && <Tag color="purple">Polygon</Tag>}
        </Space>
      )
    },
    {
      title: 'Manager',
      key: 'manager',
      render: (_, record) => (
        <div>
          {record.managerEmail && <div>{record.managerEmail}</div>}
          {record.managerPhone && <small>{record.managerPhone}</small>}
        </div>
      )
    },
    {
      title: 'Status',
      dataIndex: 'isActive',
      key: 'isActive',
      render: (isActive) => (
        <Tag color={isActive ? 'green' : 'red'}>
          {isActive ? 'Active' : 'Inactive'}
        </Tag>
      )
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => (
        <Space>
          <Tooltip title="View on Map">
            <Button
              type="link"
              icon={<EnvironmentOutlined />}
              onClick={() => handleViewMap(record)}
            />
          </Tooltip>
          <Tooltip title="Edit">
            <Button
              type="link"
              icon={<EditOutlined />}
              onClick={() => handleEdit(record)}
            />
          </Tooltip>
          <Tooltip title="Deactivate">
            <Button
              type="link"
              danger
              icon={<DeleteOutlined />}
              onClick={() => handleDelete(record.id)}
            />
          </Tooltip>
        </Space>
      )
    }
  ];

  const ZoneStatsCard = () => {
    const totalZones = zones.length;
    const activeZones = zones.filter(z => z.isActive).length;
    const zonesWithCapacity = zones.filter(z => zoneStats[z.id]?.hasCapacityLimit).length;
    const averageUtilization = Object.values(zoneStats)
      .filter(stat => stat.utilizationRate > 0)
      .reduce((sum, stat, _, arr) => sum + stat.utilizationRate / arr.length, 0);

    return (
      <Row gutter={16} style={{ marginBottom: '20px' }}>
        <Col span={6}>
          <Card>
            <Statistic
              title="Total Zones"
              value={totalZones}
              prefix={<EnvironmentOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Active Zones"
              value={activeZones}
              prefix={<ClockCircleOutlined />}
              valueStyle={{ color: '#3f8600' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Zones with Capacity"
              value={zonesWithCapacity}
              prefix={<UserOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Avg Utilization"
              value={averageUtilization * 100}
              precision={1}
              suffix="%"
              prefix={<UserOutlined />}
              valueStyle={{ color: averageUtilization > 0.8 ? '#cf1322' : '#3f8600' }}
            />
          </Card>
        </Col>
      </Row>
    );
  };

  return (
    <div>
      <ZoneStatsCard />
      
      <Card
        title="Zone Management"
        extra={
          <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>
            Create Zone
          </Button>
        }
      >
        <Table
          columns={columns}
          dataSource={zones}
          rowKey="id"
          loading={loading}
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showQuickJumper: true
          }}
        />
      </Card>

      {/* Create/Edit Modal */}
      <Modal
        title={editingZone ? 'Edit Zone' : 'Create Zone'}
        visible={modalVisible}
        onCancel={() => setModalVisible(false)}
        onOk={() => form.submit()}
        width={800}
        footer={null}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
        >
          <Tabs defaultActiveKey="1">
            <TabPane tab="Basic Info" key="1">
              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item
                    name="name"
                    label="Zone Name"
                    rules={[{ required: true, message: 'Please enter zone name' }]}
                  >
                    <Input placeholder="Enter zone name" />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item
                    name="zoneType"
                    label="Zone Type"
                    rules={[{ required: true, message: 'Please select zone type' }]}
                  >
                    <Select placeholder="Select zone type">
                      <Option value="ALLOWED">Allowed</Option>
                      <Option value="RESTRICTED">Restricted</Option>
                      <Option value="TIME_RESTRICTED">Time Restricted</Option>
                      <Option value="EVENT_ONLY">Event Only</Option>
                    </Select>
                  </Form.Item>
                </Col>
              </Row>
              
              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item
                    name="zoneCategory"
                    label="Zone Category"
                  >
                    <Select placeholder="Select zone category">
                      <Option value="PERMANENT">Permanent</Option>
                      <Option value="TEMPORARY">Temporary</Option>
                      <Option value="EVENT_BASED">Event Based</Option>
                      <Option value="PREMIUM">Premium</Option>
                    </Select>
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item
                    name="maxVendors"
                    label="Max Vendors"
                  >
                    <InputNumber
                      min={1}
                      placeholder="Maximum vendors allowed"
                      style={{ width: '100%' }}
                    />
                  </Form.Item>
                </Col>
              </Row>
              
              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item
                    name="centerLatitude"
                    label="Center Latitude"
                    rules={[{ required: true, message: 'Please enter latitude' }]}
                  >
                    <InputNumber
                      step={0.000001}
                      placeholder="17.6599"
                      style={{ width: '100%' }}
                    />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item
                    name="centerLongitude"
                    label="Center Longitude"
                    rules={[{ required: true, message: 'Please enter longitude' }]}
                  >
                    <InputNumber
                      step={0.000001}
                      placeholder="75.9064"
                      style={{ width: '100%' }}
                    />
                  </Form.Item>
                </Col>
              </Row>
              
              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item
                    name="radiusMeters"
                    label="Radius (meters)"
                  >
                    <InputNumber
                      min={1}
                      placeholder="100"
                      style={{ width: '100%' }}
                    />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item
                    name="managerEmail"
                    label="Manager Email"
                    rules={[{ type: 'email', message: 'Please enter valid email' }]}
                  >
                    <Input placeholder="manager@solapur.gov.in" />
                  </Form.Item>
                </Col>
              </Row>
              
              <Form.Item
                name="managerPhone"
                label="Manager Phone"
                rules={[
                  { pattern: /^[6-9]\d{9}$/, message: 'Please enter valid phone number' }
                ]}
              >
                <Input placeholder="9876543210" />
              </Form.Item>
            </TabPane>
            
            <TabPane tab="Polygon Boundary" key="2">
              <ZoneMap
                zone={editingZone}
                onPolygonChange={setPolygonPoints}
              />
            </TabPane>
            
            <TabPane tab="Time Restrictions" key="3">
              <Form.Item
                name="timeRestrictions"
                label="Time Restrictions (JSON)"
              >
                <TextArea
                  rows={4}
                  placeholder='{"allowedDays": ["MONDAY", "TUESDAY"], "timeRange": {"start": "06:00", "end": "22:00"}}'
                />
              </Form.Item>
            </TabPane>
          </Tabs>
          
          <div style={{ textAlign: 'right', marginTop: '20px' }}>
            <Space>
              <Button onClick={() => setModalVisible(false)}>
                Cancel
              </Button>
              <Button type="primary" htmlType="submit">
                {editingZone ? 'Update' : 'Create'}
              </Button>
            </Space>
          </div>
        </Form>
      </Modal>

      {/* View Map Modal */}
      <Modal
        title={`Zone Map - ${selectedZone?.name}`}
        visible={mapModalVisible}
        onCancel={() => setMapModalVisible(false)}
        footer={null}
        width={800}
      >
        {selectedZone && (
          <ZoneMap
            zone={selectedZone}
            onPolygonChange={() => {}}
          />
        )}
      </Modal>
    </div>
  );
};

export default EnhancedZoneManager;
