import React, { useState, useEffect, useRef } from 'react';
import {
  Card,
  Row,
  Col,
  Button,
  Space,
  Spin,
  Alert,
  Tag,
  Progress,
  Empty,
  List,
  Divider,
  Badge,
  Statistic,
  Switch,
  Select,
  Timeline,
  notification,
  Tooltip,
  Drawer,
} from 'antd';
import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  EnvironmentOutlined,
  ReloadOutlined,
  WarningOutlined,
  ClockCircleOutlined,
  HistoryOutlined,
  BellOutlined,
  PauseCircleOutlined,
  PlayCircleOutlined,
} from '@ant-design/icons';
import { MapContainer, TileLayer, Marker, Popup, Circle, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import iconRetinaUrl from 'leaflet/dist/images/marker-icon-2x.png';
import iconUrl from 'leaflet/dist/images/marker-icon.png';
import shadowUrl from 'leaflet/dist/images/marker-shadow.png';
import { zoneAPI, vendorAPI } from '../../services/api';
import 'leaflet/dist/leaflet.css';

// Fix Leaflet default icon
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: iconRetinaUrl,
  iconUrl: iconUrl,
  shadowUrl: shadowUrl,
});

const VendorLocationTracker = () => {
  const [userLocation, setUserLocation] = useState(null);
  const [assignedZone, setAssignedZone] = useState(null);
  const [nearbyZones, setNearbyZones] = useState([]);
  const [validationResult, setValidationResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [vendorInfo, setVendorInfo] = useState(null);
  const [solapurCenter] = useState([17.6599, 75.9064]);
  const [isTracking, setIsTracking] = useState(false);
  const [trackingInterval, setTrackingInterval] = useState(null);
  const [locationHistory, setLocationHistory] = useState([]);
  const [historyDrawerVisible, setHistoryDrawerVisible] = useState(false);
  const [alertSettings, setAlertSettings] = useState({
    enableZoneAlerts: true,
    enableMovementAlerts: false,
    movementThreshold: 50,
  });
  const [mapLayer, setMapLayer] = useState('standard');
  const [previousLocation, setPreviousLocation] = useState(null);
  const mapRef = useRef(null);

  useEffect(() => {
    getVendorLocation();
    fetchVendorInfo();
    loadLocationHistory();
    return () => {
      if (trackingInterval) {
        clearInterval(trackingInterval);
      }
    };
  }, []);

  const fetchVendorInfo = async () => {
    try {
      const response = await vendorAPI.getById(1); // Get current vendor
      setVendorInfo(response.data?.data);
    } catch (error) {
      console.error('Failed to fetch vendor info:', error);
    }
  };

  const getVendorLocation = () => {
    setLoading(true);
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          const newLocation = { lat: latitude, lng: longitude, timestamp: new Date() };
          setUserLocation(newLocation);
          validateLocation(latitude, longitude);
          getNearbyZones(latitude, longitude);
          addToLocationHistory(newLocation);
          checkMovementAlerts(newLocation);
          setPreviousLocation(newLocation);
        },
        (error) => {
          console.error('Geolocation error:', error);
          setLoading(false);
          notification.error({
            message: 'Location Error',
            description: 'Could not retrieve your location. Please enable GPS.',
          });
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    }
  };

  const validateLocation = async (latitude, longitude) => {
    try {
      const response = await zoneAPI.validateLocation(1, latitude, longitude);
      setValidationResult(response.data);
      if (response.data?.valid) {
        setAssignedZone(response.data?.zoneName);
      } else if (alertSettings.enableZoneAlerts) {
        notification.warning({
          message: 'Zone Violation',
          description: response.data?.message || 'You are outside your assigned zone.',
          icon: <WarningOutlined style={{ color: '#faad14' }} />,
        });
      }
    } catch (error) {
      console.error('Validation failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const getNearbyZones = async (latitude, longitude) => {
    try {
      const response = await zoneAPI.getZonesWithinRadius(latitude, longitude, 1000);
      setNearbyZones(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.error('Failed to get nearby zones:', error);
    }
  };

  const handleRefreshLocation = () => {
    getVendorLocation();
  };

  const toggleTracking = () => {
    if (isTracking) {
      stopTracking();
    } else {
      startTracking();
    }
  };

  const startTracking = () => {
    setIsTracking(true);
    getVendorLocation();
    const interval = setInterval(() => {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            const { latitude, longitude } = position.coords;
            const newLocation = { lat: latitude, lng: longitude, timestamp: new Date() };
            setUserLocation(newLocation);
            validateLocation(latitude, longitude);
            addToLocationHistory(newLocation);
            checkMovementAlerts(newLocation);
            setPreviousLocation(newLocation);
          },
          (error) => console.error('Tracking error:', error),
          { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
        );
      }
    }, 5000);
    setTrackingInterval(interval);
    notification.success({
      message: 'Tracking Started',
      description: 'Real-time location tracking is now active.',
    });
  };

  const stopTracking = () => {
    setIsTracking(false);
    if (trackingInterval) {
      clearInterval(trackingInterval);
      setTrackingInterval(null);
    }
    notification.info({
      message: 'Tracking Stopped',
      description: 'Real-time location tracking has been paused.',
    });
  };

  const addToLocationHistory = (location) => {
    setLocationHistory((prev) => {
      const newHistory = [location, ...prev].slice(0, 100);
      localStorage.setItem('locationHistory', JSON.stringify(newHistory));
      return newHistory;
    });
  };

  const loadLocationHistory = () => {
    const saved = localStorage.getItem('locationHistory');
    if (saved) {
      try {
        setLocationHistory(JSON.parse(saved));
      } catch (e) {
        console.error('Failed to load location history:', e);
      }
    }
  };

  const clearLocationHistory = () => {
    setLocationHistory([]);
    localStorage.removeItem('locationHistory');
    notification.success({
      message: 'History Cleared',
      description: 'Location history has been cleared.',
    });
  };

  const checkMovementAlerts = (currentLocation) => {
    if (!alertSettings.enableMovementAlerts || !previousLocation) return;

    const distance = calculateDistance(
      previousLocation.lat,
      previousLocation.lng,
      currentLocation.lat,
      currentLocation.lng
    );

    if (distance > alertSettings.movementThreshold) {
      notification.warning({
        message: 'Movement Detected',
        description: `You have moved ${distance.toFixed(0)} meters from your previous location.`,
      });
    }
  };

  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371e3;
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lon2 - lon1) * Math.PI) / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  };

  const MapController = () => {
    const map = useMap();
    useEffect(() => {
      if (userLocation) {
        map.setView([userLocation.lat, userLocation.lng], 15);
      }
    }, [userLocation, map]);
    return null;
  };

  const getStatusColor = () => {
    if (!validationResult) return 'default';
    return validationResult.valid ? 'success' : 'error';
  };

  return (
    <div style={{ padding: '20px' }}>
      <h1>
        <EnvironmentOutlined /> Your Vending Location
      </h1>

      {/* Current Location Info */}
      <Row gutter={16} style={{ marginBottom: '24px' }}>
        <Col xs={24} sm={12} lg={8}>
          <Card>
            <Statistic
              title="Current Location"
              value={
                userLocation
                  ? `${userLocation.lat.toFixed(4)}, ${userLocation.lng.toFixed(4)}`
                  : 'Not detected'
              }
              prefix={<EnvironmentOutlined />}
              valueStyle={{ fontSize: '12px' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={8}>
          <Card>
            <Statistic
              title="Location Status"
              value={validationResult?.valid ? 'VALID' : 'INVALID'}
              valueStyle={{ color: validationResult?.valid ? '#52c41a' : '#f5222d' }}
              prefix={validationResult?.valid ? <CheckCircleOutlined /> : <CloseCircleOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={8}>
          <Card>
            <Statistic
              title="Nearby Zones"
              value={nearbyZones.length}
              prefix={<EnvironmentOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
      </Row>

      {/* Control Panel */}
      <Card style={{ marginBottom: '24px' }} title="Location Controls">
        <Row gutter={16}>
          <Col xs={24} sm={12} md={8}>
            <Space direction="vertical" style={{ width: '100%' }}>
              <Button
                type="primary"
                icon={isTracking ? <PauseCircleOutlined /> : <PlayCircleOutlined />}
                onClick={toggleTracking}
                size="large"
                danger={isTracking}
                style={{ width: '100%' }}
              >
                {isTracking ? 'Stop Tracking' : 'Start Real-time Tracking'}
              </Button>
              <Button
                icon={<ReloadOutlined />}
                onClick={handleRefreshLocation}
                loading={loading}
                size="large"
                style={{ width: '100%' }}
              >
                Refresh Location
              </Button>
            </Space>
          </Col>
          <Col xs={24} sm={12} md={8}>
            <Space direction="vertical" style={{ width: '100%' }}>
              <div>
                <span style={{ marginRight: 8 }}>Zone Alerts:</span>
                <Switch
                  checked={alertSettings.enableZoneAlerts}
                  onChange={(checked) =>
                    setAlertSettings({ ...alertSettings, enableZoneAlerts: checked })
                  }
                />
              </div>
              <div>
                <span style={{ marginRight: 8 }}>Movement Alerts:</span>
                <Switch
                  checked={alertSettings.enableMovementAlerts}
                  onChange={(checked) =>
                    setAlertSettings({ ...alertSettings, enableMovementAlerts: checked })
                  }
                />
              </div>
            </Space>
          </Col>
          <Col xs={24} sm={12} md={8}>
            <Space direction="vertical" style={{ width: '100%' }}>
              <Button
                icon={<HistoryOutlined />}
                onClick={() => setHistoryDrawerVisible(true)}
                size="large"
                style={{ width: '100%' }}
              >
                View Location History ({locationHistory.length})
              </Button>
              <div>
                <span style={{ marginRight: 8 }}>Map Layer:</span>
                <Select
                  value={mapLayer}
                  onChange={setMapLayer}
                  style={{ width: 150 }}
                >
                  <Select.Option value="standard">Standard</Select.Option>
                  <Select.Option value="satellite">Satellite</Select.Option>
                  <Select.Option value="terrain">Terrain</Select.Option>
                </Select>
              </div>
            </Space>
          </Col>
        </Row>
      </Card>

      {/* Validation Result Alert */}
      {validationResult && (
        <Alert
          style={{ marginBottom: '24px' }}
          message={validationResult.valid ? 'Location Validated ✓' : 'Location Not Valid ✗'}
          description={validationResult.message}
          type={validationResult.valid ? 'success' : 'error'}
          showIcon
          icon={validationResult.valid ? <CheckCircleOutlined /> : <CloseCircleOutlined />}
        />
      )}

      {/* Zone Information */}
      {assignedZone && (
        <Card style={{ marginBottom: '24px' }} title="Your Assigned Zone">
          <p>
            <strong>Zone Name:</strong> {assignedZone}
          </p>
          {validationResult?.distance && (
            <p>
              <strong>Distance from Zone Center:</strong> {validationResult.distance.toFixed(2)} meters
            </p>
          )}
        </Card>
      )}

      {/* Map View */}
      <Card style={{ marginBottom: '24px' }} title="Location Map" loading={loading}>
        <div style={{ height: '500px', width: '100%', borderRadius: '8px', overflow: 'hidden' }}>
          <MapContainer
            center={userLocation ? [userLocation.lat, userLocation.lng] : solapurCenter}
            zoom={userLocation ? 15 : 13}
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

            {/* Location History Path */}
            {locationHistory.length > 1 && (
              <Polyline
                positions={locationHistory.map((loc) => [loc.lat, loc.lng])}
                color="#1890ff"
                weight={3}
                opacity={0.7}
              />
            )}

            {/* Current Location */}
            {userLocation && (
              <Marker position={[userLocation.lat, userLocation.lng]}>
                <Popup>
                  <strong>Your Location</strong>
                  <br />
                  {userLocation.lat.toFixed(4)}, {userLocation.lng.toFixed(4)}
                  <br />
                  <small>{userLocation.timestamp ? new Date(userLocation.timestamp).toLocaleString() : ''}</small>
                </Popup>
              </Marker>
            )}

            {/* Nearby Zones */}
            {nearbyZones.map((zone) => (
              <div key={zone.id}>
                {zone.radiusMeters && (
                  <Circle
                    center={[zone.latitude, zone.longitude]}
                    radius={zone.radiusMeters}
                    fillColor={zone.zoneType === 'ALLOWED' ? '#52c41a' : '#f5222d'}
                    fillOpacity={0.2}
                    color={zone.zoneType === 'ALLOWED' ? '#52c41a' : '#f5222d'}
                    weight={2}
                  >
                    <Popup>{zone.name}</Popup>
                  </Circle>
                )}

                <Marker position={[zone.latitude, zone.longitude]}>
                  <Popup>
                    <strong>{zone.name}</strong>
                    <br />
                    Type: {zone.zoneType}
                  </Popup>
                </Marker>
              </div>
            ))}
          </MapContainer>
        </div>
      </Card>

      {/* Nearby Zones List */}
      <Card title="Nearby Zones">
        {nearbyZones.length > 0 ? (
          <List
            dataSource={nearbyZones}
            renderItem={(zone) => (
              <List.Item
                key={zone.id}
                extra={
                  <Tag color={zone.zoneType === 'ALLOWED' ? 'green' : 'red'}>
                    {zone.zoneType}
                  </Tag>
                }
              >
                <List.Item.Meta
                  title={zone.name}
                  description={
                    <>
                      <p>Radius: {zone.radiusMeters}m</p>
                      <p>Category: {zone.zoneCategory || 'General'}</p>
                    </>
                  }
                />
              </List.Item>
            )}
          />
        ) : (
          <Empty description="No zones nearby" />
        )}
      </Card>

      {/* Vendor Info */}
      {vendorInfo && (
        <>
          <Divider />
          <Card title="Your Vendor Information">
            <Row gutter={16}>
              <Col xs={24} sm={12}>
                <p>
                  <strong>Name:</strong> {vendorInfo.name}
                </p>
                <p>
                  <strong>Category:</strong> {vendorInfo.category}
                </p>
              </Col>
              <Col xs={24} sm={12}>
                <p>
                  <strong>Status:</strong>{' '}
                  <Badge
                    status={vendorInfo.approvalStatus === 'APPROVED' ? 'success' : 'processing'}
                    text={vendorInfo.approvalStatus}
                  />
                </p>
                <p>
                  <strong>Phone:</strong> {vendorInfo.phone}
                </p>
              </Col>
            </Row>
          </Card>
        </>
      )}

      {/* Location History Drawer */}
      <Drawer
        title="Location History"
        placement="right"
        width={400}
        onClose={() => setHistoryDrawerVisible(false)}
        open={historyDrawerVisible}
        extra={
          <Button onClick={clearLocationHistory} danger size="small">
            Clear History
          </Button>
        }
      >
        {locationHistory.length > 0 ? (
          <Timeline
            items={locationHistory.slice(0, 20).map((loc, index) => ({
              color: index === 0 ? 'green' : 'blue',
              dot: index === 0 ? <EnvironmentOutlined /> : <ClockCircleOutlined />,
              children: (
                <div>
                  <p style={{ margin: 0, fontWeight: 'bold' }}>
                    {loc.lat.toFixed(4)}, {loc.lng.toFixed(4)}
                  </p>
                  <p style={{ margin: 0, fontSize: '12px', color: '#999' }}>
                    {new Date(loc.timestamp).toLocaleString()}
                  </p>
                </div>
              ),
            }))}
          />
        ) : (
          <Empty description="No location history" />
        )}
      </Drawer>
    </div>
  );
};

export default VendorLocationTracker;
