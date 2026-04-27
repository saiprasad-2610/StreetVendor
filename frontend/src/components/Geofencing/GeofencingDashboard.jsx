import React, { useState, useEffect, useRef } from 'react';
import {
  Card,
  Row,
  Col,
  Statistic,
  Button,
  Space,
  Spin,
  Alert,
  Tag,
  Progress,
  Modal,
  Form,
  InputNumber,
  message,
  Table,
  Empty,
  Divider,
  Badge,
  Tooltip,
  Select,
  Switch,
  Drawer,
  Timeline,
  notification,
} from 'antd';
import {
  Navigation,
  CheckCircle,
  XCircle,
  AlertTriangle,
  MapPin,
  Compass,
  Layers,
  Activity,
  Clock,
  Zap,
  Shield,
} from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup, Circle, Polygon as LeafletPolygon, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import iconRetinaUrl from 'leaflet/dist/images/marker-icon-2x.png';
import iconUrl from 'leaflet/dist/images/marker-icon.png';
import shadowUrl from 'leaflet/dist/images/marker-shadow.png';
import { zoneAPI } from '../../services/api';
import 'leaflet/dist/leaflet.css';

// Fix Leaflet default icon
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: iconRetinaUrl,
  iconUrl: iconUrl,
  shadowUrl: shadowUrl,
});

const GeofencingDashboard = () => {
  const [zones, setZones] = useState([]);
  const [zonesCapacity, setZonesCapacity] = useState({});
  const [loading, setLoading] = useState(false);
  const [userLocation, setUserLocation] = useState(null);
  const [validationResult, setValidationResult] = useState(null);
  const [nearestZone, setNearestZone] = useState(null);
  const [zonesNearby, setZonesNearby] = useState([]);
  const [validationModalVisible, setValidationModalVisible] = useState(false);
  const [locationForm] = Form.useForm();
  const [solapurCenter] = useState([17.6599, 75.9064]);
  const [mapLayer, setMapLayer] = useState('standard');
  const [showAllZones, setShowAllZones] = useState(true);
  const [showAllowedOnly, setShowAllowedOnly] = useState(false);
  const [showRestrictedOnly, setShowRestrictedOnly] = useState(false);
  const [selectedZone, setSelectedZone] = useState(null);
  const [zoneDrawerVisible, setZoneDrawerVisible] = useState(false);
  const [validationHistory, setValidationHistory] = useState([]);
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [monitoringInterval, setMonitoringInterval] = useState(null);
  const mapRef = useRef(null);

  useEffect(() => {
    fetchData();
    getUserLocation();
    loadValidationHistory();
    return () => {
      if (monitoringInterval) {
        clearInterval(monitoringInterval);
      }
    };
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [zonesRes, capacityRes] = await Promise.all([
        zoneAPI.getAll(),
        zoneAPI.getAllCapacity(),
      ]);
      // Handle the wrapped response structure
      setZones(zonesRes.data?.data || []);
      if (capacityRes.data?.data) {
        const capacityMap = {};
        (Array.isArray(capacityRes.data.data) ? capacityRes.data.data : []).forEach(cap => {
          capacityMap[cap.zoneId] = cap;
        });
        setZonesCapacity(capacityMap);
      }
    } catch (error) {
      console.error('API Error:', error);
      message.error('Failed to fetch zone data');
    } finally {
      setLoading(false);
    }
  };

  const getUserLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          setUserLocation({ lat: latitude, lng: longitude });
          findNearestZone(latitude, longitude);
          findZonesNearby(latitude, longitude);
        },
        (error) => console.warn('Could not get location:', error)
      );
    }
  };

  const findNearestZone = async (latitude, longitude) => {
    try {
      const response = await zoneAPI.findNearestZone(latitude, longitude);
      if (response.data?.data) {
        setNearestZone(response.data.data);
      }
    } catch (error) {
      console.error('Failed to find nearest zone:', error);
    }
  };

  const findZonesNearby = async (latitude, longitude) => {
    try {
      const response = await zoneAPI.getZonesWithinRadius(latitude, longitude, 2000);
      if (response.data?.data) {
        setZonesNearby(Array.isArray(response.data.data) ? response.data.data : []);
      }
    } catch (error) {
      console.error('Failed to find nearby zones:', error);
    }
  };

  const handleValidateLocation = async (values) => {
    try {
      const response = await zoneAPI.validateLocation(
        values.vendorId || 1,
        values.latitude,
        values.longitude
      );
      const validationResult = response.data?.data;
      setValidationResult(validationResult);
      
      // Add to validation history
      const historyEntry = {
        id: Date.now(),
        latitude: values.latitude,
        longitude: values.longitude,
        valid: validationResult?.valid || false,
        zoneName: validationResult?.zoneName || 'Unknown',
        timestamp: new Date(),
      };
      setValidationHistory(prev => [historyEntry, ...prev].slice(0, 50));
      localStorage.setItem('validationHistory', JSON.stringify([historyEntry, ...validationHistory].slice(0, 50)));
      
      message.success('Location validated');
    } catch (error) {
      console.error('Validation error:', error);
      message.error('Validation failed');
    }
  };

  const loadValidationHistory = () => {
    const saved = localStorage.getItem('validationHistory');
    if (saved) {
      try {
        setValidationHistory(JSON.parse(saved));
      } catch (e) {
        console.error('Failed to load validation history:', e);
      }
    }
  };

  const toggleMonitoring = () => {
    if (isMonitoring) {
      stopMonitoring();
    } else {
      startMonitoring();
    }
  };

  const startMonitoring = () => {
    setIsMonitoring(true);
    const interval = setInterval(() => {
      if (userLocation) {
        zoneAPI.validateLocation(1, userLocation.lat, userLocation.lng)
          .then(response => {
            const validationResult = response.data?.data;
            setValidationResult(validationResult);
            if (!validationResult?.valid) {
              notification.warning({
                message: 'Zone Violation Detected',
                description: validationResult?.message || 'You are outside the allowed zone.',
                icon: <AlertTriangle style={{ color: '#faad14' }} />,
              });
            }
          })
          .catch(err => console.error('Monitoring error:', err));
      }
    }, 10000);
    setMonitoringInterval(interval);
    notification.success({
      message: 'Monitoring Started',
      description: 'Zone validation is now active.',
    });
  };

  const stopMonitoring = () => {
    setIsMonitoring(false);
    if (monitoringInterval) {
      clearInterval(monitoringInterval);
      setMonitoringInterval(null);
    }
    notification.info({
      message: 'Monitoring Stopped',
      description: 'Zone validation has been paused.',
    });
  };

  const MapController = () => {
    const map = useMap();
    useEffect(() => {
      if (selectedZone) {
        map.setView([selectedZone.latitude, selectedZone.longitude], 16);
      }
    }, [selectedZone, map]);
    return null;
  };

  const filteredZones = Array.isArray(zones) ? zones.filter(zone => {
    if (showAllowedOnly && zone.zoneType !== 'ALLOWED') return false;
    if (showRestrictedOnly && zone.zoneType !== 'RESTRICTED') return false;
    return true;
  }) : [];

  const getCapacityStatus = (capacity) => {
    if (!capacity) return 'UNKNOWN';
    const utilization = capacity.currentVendors / capacity.maxVendors;
    if (utilization >= 0.9) return 'FULL';
    if (utilization >= 0.7) return 'CROWDED';
    return 'AVAILABLE';
  };

  const getCapacityColor = (status) => {
    switch (status) {
      case 'FULL':
        return 'red';
      case 'CROWDED':
        return 'orange';
      case 'AVAILABLE':
        return 'green';
      default:
        return 'default';
    }
  };

  const zoneColumns = [
    {
      title: 'Zone Name',
      dataIndex: 'name',
      key: 'name',
      render: (text) => <strong>{text}</strong>,
    },
    {
      title: 'Type',
      dataIndex: 'zoneType',
      key: 'zoneType',
      render: (type) => (
        <Tag color={type === 'ALLOWED' ? 'green' : 'red'}>{type}</Tag>
      ),
    },
    {
      title: 'Capacity',
      dataIndex: 'id',
      key: 'capacity',
      render: (id) => {
        const cap = zonesCapacity[id];
        if (!cap) return '-';
        const status = getCapacityStatus(cap);
        const percentage = (cap.currentVendors / cap.maxVendors) * 100;
        return (
          <Space direction="vertical" style={{ width: '100%' }}>
            <Progress
              percent={percentage}
              status={status === 'FULL' ? 'exception' : status === 'CROWDED' ? 'active' : 'success'}
              size="small"
            />
            <span>
              {cap.currentVendors}/{cap.maxVendors}
            </span>
          </Space>
        );
      },
    },
    {
      title: 'Status',
      dataIndex: 'id',
      key: 'status',
      render: (id) => {
        const cap = zonesCapacity[id];
        if (!cap) return 'UNKNOWN';
        const status = getCapacityStatus(cap);
        return (
          <Badge
            status={status === 'FULL' ? 'error' : status === 'CROWDED' ? 'warning' : 'success'}
            text={status}
          />
        );
      },
    },
  ];

  return (
    <div style={{ padding: '20px' }}>
      <h1>
        <Navigation size={24} style={{ display: 'inline', marginRight: '8px' }} /> Geofencing & Zone Management
      </h1>

      {/* Key Metrics */}
      <Row gutter={16} style={{ marginBottom: '24px' }}>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Total Zones"
              value={zones.length}
              prefix={<Navigation size={18} />}
              styles={{ content: { color: '#1890ff' } }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Nearby Zones"
              value={zonesNearby.length}
              prefix={<Compass size={18} />}
              styles={{ content: { color: '#1890ff' } }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Nearest Zone Distance"
              value={
                nearestZone && userLocation
                  ? (
                      Math.sqrt(
                        Math.pow(nearestZone.latitude - userLocation.lat, 2) +
                          Math.pow(nearestZone.longitude - userLocation.lng, 2)
                      ) * 111000
                    ).toFixed(0)
                  : '-'
              }
              suffix={userLocation ? 'm' : ''}
              prefix={<MapPin size={18} />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Total Vendors Allocated"
              value={Object.values(zonesCapacity).reduce((sum, cap) => sum + cap.currentVendors, 0)}
              prefix={<CheckCircle size={18} />}
              styles={{ content: { color: '#52c41a' } }}
            />
          </Card>
        </Col>
      </Row>

      {/* Control Panel */}
      <Card style={{ marginBottom: '24px' }} title="Map Controls">
        <Row gutter={16}>
          <Col xs={24} sm={12} md={6}>
            <Space orientation="vertical" style={{ width: '100%' }}>
              <Button
                type={isMonitoring ? 'primary' : 'default'}
                danger={isMonitoring}
                icon={<Zap size={18} />}
                onClick={toggleMonitoring}
                style={{ width: '100%' }}
              >
                {isMonitoring ? 'Stop Monitoring' : 'Start Zone Monitoring'}
              </Button>
              <Button
                icon={<Activity size={18} />}
                onClick={() => setZoneDrawerVisible(true)}
                style={{ width: '100%' }}
              >
                Validation History ({validationHistory.length})
              </Button>
            </Space>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Space orientation="vertical" style={{ width: '100%' }}>
              <div>
                <span style={{ marginRight: 8 }}>Show All Zones:</span>
                <Switch checked={showAllZones} onChange={setShowAllZones} />
              </div>
              <div>
                <span style={{ marginRight: 8 }}>Allowed Only:</span>
                <Switch checked={showAllowedOnly} onChange={setShowAllowedOnly} />
              </div>
              <div>
                <span style={{ marginRight: 8 }}>Restricted Only:</span>
                <Switch checked={showRestrictedOnly} onChange={setShowRestrictedOnly} />
              </div>
            </Space>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Space orientation="vertical" style={{ width: '100%' }}>
              <span style={{ marginRight: 8 }}>Map Layer:</span>
              <Select
                value={mapLayer}
                onChange={setMapLayer}
                style={{ width: '100%' }}
              >
                <Select.Option value="standard">Standard</Select.Option>
                <Select.Option value="satellite">Satellite</Select.Option>
                <Select.Option value="terrain">Terrain</Select.Option>
              </Select>
            </Space>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Space orientation="vertical" style={{ width: '100%' }}>
              <Button
                icon={<Navigation size={18} />}
                onClick={getUserLocation}
                style={{ width: '100%' }}
              >
                Refresh Location
              </Button>
            </Space>
          </Col>
        </Row>
      </Card>

      {/* Nearest Zone Info */}
      {nearestZone && (
        <Card style={{ marginBottom: '24px' }} title="Nearest Zone" type="inner">
          <Row gutter={16}>
            <Col xs={24} sm={12} md={8}>
              <p>
                <strong>Zone:</strong> {nearestZone.name}
              </p>
              <p>
                <strong>Type:</strong>{' '}
                <Tag color={nearestZone.zoneType === 'ALLOWED' ? 'green' : 'red'}>
                  {nearestZone.zoneType}
                </Tag>
              </p>
            </Col>
            <Col xs={24} sm={12} md={8}>
              <p>
                <strong>Radius:</strong> {nearestZone.radiusMeters}m
              </p>
              <p>
                <strong>Coordinates:</strong> {nearestZone.latitude?.toFixed(4) || 'N/A'},
                {nearestZone.longitude?.toFixed(4) || 'N/A'}
              </p>
            </Col>
            <Col xs={24} sm={12} md={8}>
              {zonesCapacity[nearestZone.id] && (
                <p>
                  <strong>Capacity:</strong>{' '}
                  <Tag color={getCapacityColor(getCapacityStatus(zonesCapacity[nearestZone.id]))}>
                    {zonesCapacity[nearestZone.id].currentVendors}/
                    {zonesCapacity[nearestZone.id].maxVendors}
                  </Tag>
                </p>
              )}
            </Col>
          </Row>
        </Card>
      )}

      {/* Location Validation */}
      <Card style={{ marginBottom: '24px' }} title="Validate Vendor Location">
        <Button
          type="primary"
          onClick={() => setValidationModalVisible(true)}
          icon={<MapPin size={18} />}
        >
          Check Location
        </Button>

        {validationResult && (
          <Alert
            style={{ marginTop: '16px' }}
            message={validationResult.valid ? 'Valid Location' : 'Invalid Location'}
            description={validationResult.message}
            type={validationResult.valid ? 'success' : 'error'}
            showIcon
            icon={validationResult.valid ? <CheckCircle size={18} /> : <XCircle size={18} />}
          />
        )}
      </Card>

      {/* Map View */}
      <Card style={{ marginBottom: '24px' }} title="Zone Map View" loading={loading}>
        <div style={{ height: '600px', width: '100%', borderRadius: '8px', overflow: 'hidden' }}>
          <MapContainer
            center={solapurCenter}
            zoom={13}
            style={{ height: '100%', width: '100%' }}
            ref={mapRef}
          >
            <MapController />
            <TileLayer
              url={
                mapLayer === 'satellite'
                  ? 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
                  : mapLayer === 'terrain'
                  ? 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png'
                  : 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
              }
              attribution={
                mapLayer === 'satellite'
                  ? '&copy; Esri'
                  : mapLayer === 'terrain'
                  ? '&copy; OpenTopoMap'
                  : '&copy; OpenStreetMap'
              }
            />

            {/* Current User Location */}
            {userLocation && (
              <Marker position={[userLocation.lat, userLocation.lng]}>
                <Popup>
                  <strong>Your Location</strong>
                </Popup>
              </Marker>
            )}

            {/* Zones */}
            {filteredZones.map((zone) => (
              <div key={zone.id}>
                {zone.radiusMeters && (
                  <Circle
                    center={[zone.latitude, zone.longitude]}
                    radius={zone.radiusMeters}
                    fillColor={zone.zoneType === 'ALLOWED' ? '#52c41a' : '#f5222d'}
                    fillOpacity={0.3}
                    color={zone.zoneType === 'ALLOWED' ? '#52c41a' : '#f5222d'}
                    weight={2}
                    eventHandlers={{
                      click: () => {
                        setSelectedZone(zone);
                        setZoneDrawerVisible(true);
                      },
                    }}
                  >
                    <Popup>
                      <strong>{zone.name}</strong>
                      <br />
                      Type: {zone.zoneType}
                      <br />
                      <Button
                        size="small"
                        onClick={() => {
                          setSelectedZone(zone);
                          setZoneDrawerVisible(true);
                        }}
                      >
                        View Details
                      </Button>
                    </Popup>
                  </Circle>
                )}

                {zone.polygonCoordinates && (
                  <LeafletPolygon
                    positions={typeof zone.polygonCoordinates === 'string' ? JSON.parse(zone.polygonCoordinates) : zone.polygonCoordinates}
                    fillColor={zone.zoneType === 'ALLOWED' ? '#1890ff' : '#faad14'}
                    fillOpacity={0.3}
                    color={zone.zoneType === 'ALLOWED' ? '#1890ff' : '#faad14'}
                    weight={2}
                    eventHandlers={{
                      click: () => {
                        setSelectedZone(zone);
                        setZoneDrawerVisible(true);
                      },
                    }}
                  >
                    <Popup>
                      <strong>{zone.name}</strong>
                      <br />
                      Type: {zone.zoneType}
                      <br />
                      <Button
                        size="small"
                        onClick={() => {
                          setSelectedZone(zone);
                          setZoneDrawerVisible(true);
                        }}
                      >
                        View Details
                      </Button>
                    </Popup>
                  </LeafletPolygon>
                )}

                <Marker
                  position={[zone.latitude, zone.longitude]}
                  eventHandlers={{
                    click: () => {
                      setSelectedZone(zone);
                      setZoneDrawerVisible(true);
                    },
                  }}
                >
                  <Popup>
                    <strong>{zone.name}</strong>
                    <br />
                    Type: {zone.zoneType}
                    <br />
                    <Button
                      size="small"
                      onClick={() => {
                        setSelectedZone(zone);
                        setZoneDrawerVisible(true);
                      }}
                    >
                      View Details
                    </Button>
                  </Popup>
                </Marker>
              </div>
            ))}
          </MapContainer>
        </div>
      </Card>

      {/* Zones List */}
      <Card title="Zone Details & Capacity">
        <Table
          columns={zoneColumns}
          dataSource={Array.isArray(zones) ? zones.map((z) => ({ ...z, key: z.id })) : []}
          loading={loading}
          pagination={{ pageSize: 10 }}
          scroll={{ x: 768 }}
        />
      </Card>

      {/* Location Validation Modal */}
      <Modal
        title="Validate Vendor Location"
        open={validationModalVisible}
        onOk={() => {
          locationForm
            .validateFields()
            .then((values) => {
              handleValidateLocation(values);
              setValidationModalVisible(false);
            })
            .catch((info) => console.log('Validate Failed:', info));
        }}
        onCancel={() => setValidationModalVisible(false)}
      >
        <Form
          form={locationForm}
          layout="vertical"
          initialValues={{
            latitude: userLocation?.lat || 17.6599,
            longitude: userLocation?.lng || 75.9064,
            vendorId: 1,
          }}
        >
          <Form.Item
            label="Latitude"
            name="latitude"
            rules={[{ required: true, message: 'Please enter latitude' }]}
          >
            <InputNumber step={0.0001} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item
            label="Longitude"
            name="longitude"
            rules={[{ required: true, message: 'Please enter longitude' }]}
          >
            <InputNumber step={0.0001} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item
            label="Vendor ID"
            name="vendorId"
            rules={[{ required: true, message: 'Please enter vendor ID' }]}
          >
            <InputNumber style={{ width: '100%' }} />
          </Form.Item>
        </Form>
      </Modal>

      {/* Zone Details Drawer */}
      <Drawer
        title={selectedZone ? `Zone: ${selectedZone.name}` : 'Zone Details'}
        placement="right"
        size="large"
        onClose={() => setZoneDrawerVisible(false)}
        open={zoneDrawerVisible}
      >
        {selectedZone ? (
          <Space orientation="vertical" style={{ width: '100%' }} size="large">
            <div>
              <Tag color={selectedZone.zoneType === 'ALLOWED' ? 'green' : 'red'}>
                {selectedZone.zoneType}
              </Tag>
              <p style={{ marginTop: 8 }}>
                <strong>Category:</strong> {selectedZone.zoneCategory || 'General'}
              </p>
              <p>
                <strong>Coordinates:</strong> {selectedZone.latitude?.toFixed(4) || 'N/A'}, {selectedZone.longitude?.toFixed(4) || 'N/A'}
              </p>
              {selectedZone.radiusMeters && (
                <p>
                  <strong>Radius:</strong> {selectedZone.radiusMeters} meters
                </p>
              )}
              <p>
                <strong>Monthly Rent:</strong> ₹{selectedZone.monthlyRent || 0}
              </p>
            </div>
            {zonesCapacity[selectedZone.id] && (
              <div>
                <h4>Capacity Information</h4>
                <Progress
                  percent={
                    (zonesCapacity[selectedZone.id].currentVendors / zonesCapacity[selectedZone.id].maxVendors) * 100
                  }
                  status={
                    zonesCapacity[selectedZone.id].currentVendors / zonesCapacity[selectedZone.id].maxVendors >= 0.9
                      ? 'exception'
                      : 'active'
                  }
                />
                <p>
                  {zonesCapacity[selectedZone.id].currentVendors} / {zonesCapacity[selectedZone.id].maxVendors} vendors
                </p>
              </div>
            )}
          </Space>
        ) : (
          <Empty description="Select a zone to view details" />
        )}
      </Drawer>

      {/* Validation History Drawer */}
      <Drawer
        title="Validation History"
        placement="right"
        size="large"
        onClose={() => setZoneDrawerVisible(false)}
        open={zoneDrawerVisible && !selectedZone}
      >
        {validationHistory.length > 0 ? (
          <Timeline
            items={validationHistory.map((entry) => ({
              color: entry.valid ? 'green' : 'red',
              dot: entry.valid ? <CheckCircle /> : <XCircle />,
              children: (
                <div>
                  <p style={{ margin: 0, fontWeight: 'bold' }}>
                    {entry.valid ? 'Valid' : 'Invalid'}
                  </p>
                  <p style={{ margin: 0, fontSize: '12px' }}>
                    {entry.latitude.toFixed(4)}, {entry.longitude.toFixed(4)}
                  </p>
                  <p style={{ margin: 0, fontSize: '12px', color: '#999' }}>
                    {entry.zoneName || 'No zone'}
                  </p>
                  <p style={{ margin: 0, fontSize: '12px', color: '#999' }}>
                    <Clock size={12} /> {new Date(entry.timestamp).toLocaleString()}
                  </p>
                </div>
              ),
            }))}
          />
        ) : (
          <Empty description="No validation history" />
        )}
      </Drawer>
    </div>
  );
};

export default GeofencingDashboard;
