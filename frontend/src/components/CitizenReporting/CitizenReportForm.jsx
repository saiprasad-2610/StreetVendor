import React, { useState } from 'react';
import { 
  Card, 
  Form, 
  Input, 
  Select, 
  Button, 
  Upload, 
  message, 
  Row, 
  Col, 
  Tag, 
  Progress,
  Alert,
  Space,
  Divider
} from 'antd';
import { 
  UploadOutlined, 
  CameraOutlined, 
  EnvironmentOutlined,
  PhoneOutlined,
  UserOutlined,
  FileTextOutlined
} from '@ant-design/icons';
import api from '../../services/api';

const { TextArea } = Input;
const { Option } = Select;

const CitizenReportForm = () => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [location, setLocation] = useState(null);
  const [imageList, setImageList] = useState([]);
  const [validationScore, setValidationScore] = useState(null);
  const [reportSubmitted, setReportSubmitted] = useState(false);
  const [submittedReportId, setSubmittedReportId] = useState(null);

  const getCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const locationData = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy
          };
          setLocation(locationData);
          form.setFieldsValue({
            latitude: locationData.latitude,
            longitude: locationData.longitude
          });
          message.success('Location captured successfully');
        },
        (error) => {
          message.error('Failed to get location. Please enable location services.');
        },
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 }
      );
    } else {
      message.error('Geolocation is not supported by your browser');
    }
  };

  const handleSubmit = async (values) => {
    if (!location && !values.locationAddress) {
      message.error('Please provide either GPS location or address');
      return;
    }

    setLoading(true);
    try {
      const formData = new FormData();
      
      // Add form fields
      Object.keys(values).forEach(key => {
        if (key !== 'imageFile' && key !== 'additionalImages') {
          formData.append(key, values[key]);
        }
      });

      // Add location data
      if (location) {
        formData.append('latitude', location.latitude);
        formData.append('longitude', location.longitude);
      }

      // Add images
      if (imageList.length > 0) {
        formData.append('imageFile', imageList[0].originFileObj);
      }

      // Add additional images
      if (values.additionalImages && values.additionalImages.length > 0) {
        values.additionalImages.forEach((file, index) => {
          formData.append(`additionalImages[${index}]`, file.originFileObj);
        });
      }

      const response = await api.post('/api/citizen-reports/submit', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      const result = response.data.data;
      setSubmittedReportId(result.reportId);
      setValidationScore(result.validationScore);
      setReportSubmitted(true);
      
      message.success('Report submitted successfully!');
      form.resetFields();
      setImageList([]);
      setLocation(null);
      
    } catch (error) {
      console.error('Failed to submit report:', error);
      message.error(error.response?.data?.message || 'Failed to submit report');
    } finally {
      setLoading(false);
    }
  };

  const beforeUpload = (file) => {
    const isImage = file.type.startsWith('image/');
    if (!isImage) {
      message.error('You can only upload image files!');
      return false;
    }
    
    const isLt5M = file.size / 1024 / 1024 < 5;
    if (!isLt5M) {
      message.error('Image must be smaller than 5MB!');
      return false;
    }
    
    return false; // Prevent automatic upload
  };

  const handleImageChange = ({ fileList }) => {
    setImageList(fileList);
  };

  const getValidationColor = (score) => {
    if (score >= 0.8) return '#52c41a';
    if (score >= 0.6) return '#faad14';
    if (score >= 0.4) return '#fa8c16';
    return '#f5222d';
  };

  const getValidationText = (score) => {
    if (score >= 0.8) return 'High Confidence';
    if (score >= 0.6) return 'Medium Confidence';
    if (score >= 0.4) return 'Low Confidence';
    return 'Very Low Confidence';
  };

  if (reportSubmitted) {
    return (
      <Card title="Report Submitted Successfully">
        <div style={{ textAlign: 'center', padding: '40px' }}>
          <div style={{ fontSize: '48px', color: '#52c41a', marginBottom: '20px' }}>
            <FileTextOutlined />
          </div>
          
          <h2>Thank You for Your Report!</h2>
          <p style={{ fontSize: '16px', color: '#666', marginBottom: '30px' }}>
            Your report has been submitted and is being reviewed by our team.
          </p>
          
          <div style={{ marginBottom: '30px' }}>
            <Space direction="vertical" size="large">
              <div>
                <Tag color="blue">Report ID: {submittedReportId}</Tag>
              </div>
              
              {validationScore && (
                <div>
                  <span style={{ marginRight: '10px' }}>Validation Score:</span>
                  <Progress
                    percent={validationScore * 100}
                    size="small"
                    strokeColor={getValidationColor(validationScore)}
                    format={() => getValidationText(validationScore)}
                    style={{ width: '200px', display: 'inline-block' }}
                  />
                </div>
              )}
            </Space>
          </div>
          
          <Alert
            message="What happens next?"
            description="Your report will be reviewed by our team. If it meets our criteria, it will be converted to a formal violation. You can track the status using your report ID."
            type="info"
            showIcon
            style={{ textAlign: 'left', marginBottom: '30px' }}
          />
          
          <Button
            type="primary"
            size="large"
            onClick={() => {
              setReportSubmitted(false);
              setSubmittedReportId(null);
              setValidationScore(null);
            }}
          >
            Submit Another Report
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <div>
      <Card title="Submit Citizen Report">
        <Alert
          message="Report Guidelines"
          description="Please provide accurate and detailed information. False reports may affect your credibility score. Location and photo evidence significantly improve report validation."
          type="info"
          showIcon
          style={{ marginBottom: '20px' }}
        />

        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
        >
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="reporterName"
                label="Your Name"
                rules={[{ required: true, message: 'Please enter your name' }]}
              >
                <Input
                  prefix={<UserOutlined />}
                  placeholder="Enter your full name"
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="reporterPhone"
                label="Phone Number"
                rules={[
                  { required: true, message: 'Please enter your phone number' },
                  { pattern: /^[6-9]\d{9}$/, message: 'Please enter a valid 10-digit phone number' }
                ]}
              >
                <Input
                  prefix={<PhoneOutlined />}
                  placeholder="Enter your 10-digit phone number"
                  maxLength={10}
                />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name="reporterEmail"
            label="Email (Optional)"
            rules={[{ type: 'email', message: 'Please enter a valid email' }]}
          >
            <Input placeholder="Enter your email address" />
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="reportType"
                label="Report Type"
                rules={[{ required: true, message: 'Please select report type' }]}
              >
                <Select placeholder="Select type of violation">
                  <Option value="LOCATION_VIOLATION">Location Violation</Option>
                  <Option value="TIME_VIOLATION">Time Restriction Violation</Option>
                  <Option value="OVERCROWDING">Overcrowding</Option>
                  <Option value="UNAUTHORIZED_VENDOR">Unauthorized Vendor</Option>
                  <Option value="HYGIENE_ISSUE">Hygiene Issue</Option>
                  <Option value="PRICE_COMPLAINT">Price Complaint</Option>
                  <Option value="BEHAVIOR_ISSUE">Behavior Issue</Option>
                  <Option value="OTHER">Other</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="vendorId"
                label="Vendor ID (Optional)"
              >
                <Input placeholder="Enter vendor ID if known" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name="description"
            label="Description"
            rules={[
              { required: true, message: 'Please describe the issue' },
              { min: 10, message: 'Description must be at least 10 characters' },
              { max: 1000, message: 'Description must not exceed 1000 characters' }
            ]}
          >
            <TextArea
              rows={4}
              placeholder="Please provide detailed description of the issue. Include specific details like time, location, vendor details, etc."
              showCount
              maxLength={1000}
            />
          </Form.Item>

          <Divider>Location Information</Divider>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item label="GPS Location">
                <Space>
                  <Button
                    icon={<EnvironmentOutlined />}
                    onClick={getCurrentLocation}
                    type="primary"
                    ghost
                  >
                    Get Current Location
                  </Button>
                  {location && (
                    <Tag color="green">
                      {location.latitude.toFixed(6)}, {location.longitude.toFixed(6)}
                    </Tag>
                  )}
                </Space>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="locationAddress" label="Address">
                <Input placeholder="Enter address if GPS not available" />
              </Form.Item>
            </Col>
          </Row>

          {location && (
            <Form.Item name="latitude" hidden>
              <Input />
            </Form.Item>
          )}
          {location && (
            <Form.Item name="longitude" hidden>
              <Input />
            </Form.Item>
          )}

          <Divider>Evidence</Divider>

          <Form.Item
            name="imageFile"
            label="Photo Evidence"
            extra="Upload a clear photo of the violation (max 5MB)"
          >
            <Upload
              listType="picture-card"
              fileList={imageList}
              onChange={handleImageChange}
              beforeUpload={beforeUpload}
              maxCount={1}
            >
              {imageList.length === 0 && (
                <div>
                  <CameraOutlined />
                  <div style={{ marginTop: 8 }}>Upload Photo</div>
                </div>
              )}
            </Upload>
          </Form.Item>

          <Form.Item
            name="additionalImages"
            label="Additional Photos (Optional)"
            extra="Upload up to 3 additional photos for better evidence"
          >
            <Upload
              listType="picture"
              fileList={[]}
              beforeUpload={beforeUpload}
              maxCount={3}
              multiple
            >
              <Button icon={<UploadOutlined />}>Select Additional Photos</Button>
            </Upload>
          </Form.Item>

          <Alert
            message="Privacy Notice"
            description="Your personal information will be kept confidential and used only for report processing. Location data is used for verification purposes only."
            type="warning"
            showIcon
            style={{ marginBottom: '20px' }}
          />

          <Form.Item>
            <Button
              type="primary"
              htmlType="submit"
              loading={loading}
              size="large"
              block
            >
              Submit Report
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
};

export default CitizenReportForm;
