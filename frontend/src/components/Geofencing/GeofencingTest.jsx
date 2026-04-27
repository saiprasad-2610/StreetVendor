import React, { useState, useEffect } from 'react';
import { Card, Button, message, Spin, Space } from 'antd';
import { zoneAPI } from '../../services/api';

const GeofencingTest = () => {
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState({});

  const testAPI = async (testName, apiCall) => {
    setLoading(true);
    try {
      const response = await apiCall;
      setResults(prev => ({
        ...prev,
        [testName]: {
          success: true,
          data: response.data
        }
      }));
      message.success(`${testName} - Success`);
    } catch (error) {
      setResults(prev => ({
        ...prev,
        [testName]: {
          success: false,
          error: error.message
        }
      }));
      message.error(`${testName} - Failed: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const runAllTests = () => {
    testAPI('Get Zones', () => zoneAPI.getAll());
    testAPI('Get Capacity', () => zoneAPI.getAllCapacity());
    testAPI('Nearest Zone', () => zoneAPI.findNearestZone(17.6599, 75.9064));
    testAPI('Zones Nearby', () => zoneAPI.getZonesWithinRadius(17.6599, 75.9064, 2000));
  };

  const testValidation = () => {
    testAPI('Validate Location', () => zoneAPI.validateLocation(1, 17.6599, 75.9064));
  };

  return (
    <div style={{ padding: '20px' }}>
      <h1>Geofencing API Test</h1>
      
      <Card title="API Tests" style={{ marginBottom: '20px' }}>
        <Space>
          <Button type="primary" onClick={runAllTests} loading={loading}>
            Run All Tests
          </Button>
          <Button onClick={testValidation} loading={loading}>
            Test Validation
          </Button>
        </Space>
      </Card>

      {Object.entries(results).map(([testName, result]) => (
        <Card 
          key={testName}
          title={testName}
          style={{ marginBottom: '10px' }}
        >
          {result.success ? (
            <div>
              <div style={{ color: 'green', marginBottom: '10px' }}>✓ Success</div>
              <pre style={{ background: '#f5f5f5', padding: '10px', fontSize: '12px' }}>
                {JSON.stringify(result.data, null, 2)}
              </pre>
            </div>
          ) : (
            <div style={{ color: 'red' }}>
              ✗ Failed: {result.error}
            </div>
          )}
        </Card>
      ))}
    </div>
  );
};

export default GeofencingTest;
