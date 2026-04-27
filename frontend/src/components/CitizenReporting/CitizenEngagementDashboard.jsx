import React, { useState, useEffect } from 'react';
import {
  Card,
  Row,
  Col,
  Button,
  Space,
  Spin,
  Alert,
  Modal,
  Form,
  Input,
  Select,
  Checkbox,
  Upload,
  List,
  Empty,
  Tag,
  Divider,
  Statistic,
} from 'antd';
import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  FileOutlined,
  UploadOutlined,
  EnvironmentOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import { MapContainer, TileLayer, Marker, Popup, Circle } from 'react-leaflet';
import L from 'leaflet';
import iconRetinaUrl from 'leaflet/dist/images/marker-icon-2x.png';
import iconUrl from 'leaflet/dist/images/marker-icon.png';
import shadowUrl from 'leaflet/dist/images/marker-shadow.png';
import { zoneAPI, reportAPI } from '../../services/api';
import 'leaflet/dist/leaflet.css';

// Fix Leaflet default icon
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: iconRetinaUrl,
  iconUrl: iconUrl,
  shadowUrl: shadowUrl,
});

const CitizenEngagementDashboard = () => {
  const [zones, setZones] = useState([]);
  const [userLocation, setUserLocation] = useState(null);
  const [loading, setLoading] = useState(false);
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [selectedZone, setSelectedZone] = useState(null);
  const [form] = Form.useForm();
  const [reports, setReports] = useState([]);
  const [solapurCenter] = useState([17.6599, 75.9064]);

  useEffect(() => {
    fetchZones();
    getUserLocation();
  }, []);

  const fetchZones = async () => {
    setLoading(true);
    try {
      const response = await zoneAPI.getAll();
      setZones(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.error('Failed to fetch zones:', error);
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
        },
        (error) => console.error('Geolocation error:', error)
      );
    }
  };

  const handleReportSubmit = async (values) => {
    try {
      setLoading(true);
      const reportData = {
        ...values,
        zoneId: selectedZone?.id,
        latitude: userLocation?.lat,
        longitude: userLocation?.lng,
      };
      await reportAPI.submitCitizenReport(reportData);
      Modal.success({
        title: 'Report Submitted',
        content: 'Thank you for your report. Our team will review it shortly.',
        onOk: () => {
          setReportModalOpen(false);
          form.resetFields();
          setSelectedZone(null);
        },
      });
    } catch (error) {
      Modal.error({
        title: 'Submission Failed',
        content: error.message || 'Failed to submit report. Please try again.',
      });
    } finally {
      setLoading(false);
    }
  };

  const openReportModal = (zone) => {
    setSelectedZone(zone);
    setReportModalOpen(true);
  };

  const getZoneStatusColor = (zone) => {
    if (zone.zoneType === 'ALLOWED') return 'green';
    if (zone.zoneType === 'RESTRICTED') return 'red';
    return 'blue';
  };

  const getZoneStatusText = (zone) => {
    if (zone.zoneType === 'ALLOWED') return 'Allowed Zone';
    if (zone.zoneType === 'RESTRICTED') return 'Restricted Zone';
    return zone.zoneType;
  };

  return (
    <div style={{ padding: '20px' }}>
      <h1>
        <EnvironmentOutlined /> Citizen Engagement & Vendor Tracking
      </h1>

      <Alert
        style={{ marginBottom: '20px' }}
        message="Help us maintain cleaner streets"
        description="Report illegal vending or zone violations directly to our enforcement team. Your reports help us create a better city."
        type="info"
        showIcon
      />

      {/* Statistics */}
      <Row gutter={16} style={{ marginBottom: '24px' }}>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Total Zones"
              value={zones.length}
              prefix={<EnvironmentOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Allowed Zones"
              value={zones.filter((z) => z.zoneType === 'ALLOWED').length}
              prefix={<CheckCircleOutlined />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Restricted Zones"
              value={zones.filter((z) => z.zoneType === 'RESTRICTED').length}
              prefix={<CloseCircleOutlined />}
              valueStyle={{ color: '#f5222d' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Your Location"
              value={userLocation ? 'Detected' : 'Not Detected'}
              valueStyle={{ color: userLocation ? '#52c41a' : '#faad14' }}
              prefix={userLocation ? <CheckCircleOutlined /> : <CloseCircleOutlined />}
            />
          </Card>
        </Col>
      </Row>

      {/* Refresh Button */}
      <Card style={{ marginBottom: '24px' }}>
        <Space>
          <Button
            type="primary"
            icon={<ReloadOutlined />}
            onClick={fetchZones}
            loading={loading}
          >
            Refresh Zones
          </Button>
          <Button
            icon={<EnvironmentOutlined />}
            onClick={getUserLocation}
          >
            Update My Location
          </Button>
        </Space>
      </Card>

      {/* Map View */}
      <Card style={{ marginBottom: '24px' }} title="Zone Map" loading={loading}>
        <div style={{ height: '500px', width: '100%', borderRadius: '8px', overflow: 'hidden' }}>
          <MapContainer
            center={userLocation ? [userLocation.lat, userLocation.lng] : solapurCenter}
            zoom={userLocation ? 15 : 13}
            style={{ height: '100%', width: '100%' }}
          >
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution='&copy; OpenStreetMap contributors'
            />

            {/* Current Location */}
            {userLocation && (
              <Marker position={[userLocation.lat, userLocation.lng]}>
                <Popup>
                  <strong>Your Location</strong>
                  <br />
                  {userLocation.lat.toFixed(4)}, {userLocation.lng.toFixed(4)}
                </Popup>
              </Marker>
            )}

            {/* Zones */}
            {zones.map((zone) => (
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
                    <Popup>
                      <strong>{zone.name}</strong>
                      <br />
                      Type: {zone.zoneType}
                    </Popup>
                  </Circle>
                )}

                <Marker position={[zone.latitude, zone.longitude]}>
                  <Popup>
                    <div>
                      <strong>{zone.name}</strong>
                      <br />
                      Type: {zone.zoneType}
                      <br />
                      <Button
                        size="small"
                        type="primary"
                        onClick={() => openReportModal(zone)}
                        style={{ marginTop: '8px' }}
                      >
                        Report Issue
                      </Button>
                    </div>
                  </Popup>
                </Marker>
              </div>
            ))}
          </MapContainer>
        </div>
      </Card>

      {/* Zones List */}
      <Card title="All Zones">
        <Spin spinning={loading}>
          {zones.length > 0 ? (
            <List
              dataSource={zones}
              renderItem={(zone) => (
                <List.Item
                  key={zone.id}
                  extra={
                    <Button
                      type="primary"
                      danger={zone.zoneType === 'RESTRICTED'}
                      onClick={() => openReportModal(zone)}
                    >
                      Report
                    </Button>
                  }
                >
                  <List.Item.Meta
                    title={
                      <span>
                        {zone.name}
                        <Tag color={getZoneStatusColor(zone)} style={{ marginLeft: '8px' }}>
                          {getZoneStatusText(zone)}
                        </Tag>
                      </span>
                    }
                    description={
                      <>
                        <p>Category: {zone.zoneCategory || 'General'}</p>
                        <p>Radius: {zone.radiusMeters}m</p>
                        <p>
                          Location: {zone.latitude.toFixed(4)}, {zone.longitude.toFixed(4)}
                        </p>
                      </>
                    }
                  />
                </List.Item>
              )}
            />
          ) : (
            <Empty description="No zones available" />
          )}
        </Spin>
      </Card>

      {/* Report Modal */}
      <Modal
        title={`Report Issue - ${selectedZone?.name || 'Zone'}`}
        open={reportModalOpen}
        onCancel={() => setReportModalOpen(false)}
        footer={null}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleReportSubmit}
        >
          <Form.Item
            name="issueType"
            label="Issue Type"
            rules={[{ required: true, message: 'Please select an issue type' }]}
          >
            <Select placeholder="Select issue type">
              <Select.Option value="ILLEGAL_VENDING">Illegal Vending</Select.Option>
              <Select.Option value="ZONE_VIOLATION">Zone Violation</Select.Option>
              <Select.Option value="OBSTRUCTION">Obstruction</Select.Option>
              <Select.Option value="UNSAFE_CONDITIONS">Unsafe Conditions</Select.Option>
              <Select.Option value="OTHER">Other</Select.Option>
            </Select>
          </Form.Item>

          <Form.Item
            name="description"
            label="Description"
            rules={[
              { required: true, message: 'Please provide details' },
              { min: 10, message: 'Description must be at least 10 characters' },
            ]}
          >
            <Input.TextArea
              rows={4}
              placeholder="Describe the issue in detail..."
            />
          </Form.Item>

          <Form.Item
            name="contactName"
            label="Your Name (Optional)"
          >
            <Input placeholder="Enter your name (optional)" />
          </Form.Item>

          <Form.Item
            name="contactPhone"
            label="Your Phone (Optional)"
          >
            <Input placeholder="Enter your phone number (optional)" />
          </Form.Item>

          <Form.Item
            name="attachPhoto"
            label="Attach Photo"
            valuePropName="fileList"
            getValueFromEvent={(e) => e?.fileList}
          >
            <Upload
              maxCount={1}
              beforeUpload={() => false}
            >
              <Button icon={<UploadOutlined />}>Click to Upload</Button>
            </Upload>
          </Form.Item>

          <Form.Item
            name="anonymous"
            valuePropName="checked"
          >
            <Checkbox>Submit anonymously</Checkbox>
          </Form.Item>

          <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
            <Button onClick={() => setReportModalOpen(false)}>
              Cancel
            </Button>
            <Button type="primary" htmlType="submit" loading={loading}>
              Submit Report
            </Button>
          </Space>
        </Form>
      </Modal>
    </div>
  );
};

export default CitizenEngagementDashboard;
