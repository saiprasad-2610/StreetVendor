import AsyncStorage from '@react-native-async-storage/async-storage';
import SQLite from 'react-native-sqlite-storage';
import NetInfo from '@react-native-community/netinfo';

class OfflineStorageService {
  constructor() {
    this.db = null;
    this.isOnline = true;
    this.syncQueue = [];
    this.initDatabase();
    this.setupNetworkListener();
  }

  async initDatabase() {
    try {
      this.db = SQLite.openDatabase({
        name: 'SMCOffline.db',
        location: 'default',
      });
      
      await this.createTables();
      console.log('Offline database initialized');
    } catch (error) {
      console.error('Failed to initialize offline database:', error);
    }
  }

  async createTables() {
    const queries = [
      `CREATE TABLE IF NOT EXISTS vendors (
        id INTEGER PRIMARY KEY,
        vendor_id TEXT UNIQUE,
        name TEXT,
        category TEXT,
        status TEXT,
        latitude REAL,
        longitude REAL,
        qr_code_url TEXT,
        face_image_url TEXT,
        last_updated TEXT,
        sync_status TEXT DEFAULT 'synced'
      )`,
      
      `CREATE TABLE IF NOT EXISTS zones (
        id INTEGER PRIMARY KEY,
        name TEXT,
        zone_type TEXT,
        polygon_coordinates TEXT,
        max_vendors INTEGER,
        last_updated TEXT,
        sync_status TEXT DEFAULT 'synced'
      )`,
      
      `CREATE TABLE IF NOT EXISTS violation_reports (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        vendor_id TEXT,
        violation_type TEXT,
        description TEXT,
        latitude REAL,
        longitude REAL,
        image_path TEXT,
        reporter_name TEXT,
        reporter_phone TEXT,
        timestamp TEXT,
        sync_status TEXT DEFAULT 'pending'
      )`,
      
      `CREATE TABLE IF NOT EXISTS sync_queue (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        entity_type TEXT,
        entity_id TEXT,
        operation TEXT,
        entity_data TEXT,
        timestamp TEXT,
        retry_count INTEGER DEFAULT 0
      )`
    ];

    for (const query of queries) {
      await this.executeSQL(query);
    }
  }

  setupNetworkListener() {
    NetInfo.addEventListener(state => {
      this.isOnline = state.isConnected;
      if (this.isOnline) {
        this.processSyncQueue();
      }
    });
  }

  // Vendor operations
  async getVendor(vendorId) {
    try {
      const result = await this.executeSQL(
        'SELECT * FROM vendors WHERE vendor_id = ?',
        [vendorId]
      );
      return result.rows.length > 0 ? result.rows.item(0) : null;
    } catch (error) {
      console.error('Failed to get vendor:', error);
      return null;
    }
  }

  async getAllVendors() {
    try {
      const result = await this.executeSQL('SELECT * FROM vendors ORDER BY name');
      const vendors = [];
      for (let i = 0; i < result.rows.length; i++) {
        vendors.push(result.rows.item(i));
      }
      return vendors;
    } catch (error) {
      console.error('Failed to get all vendors:', error);
      return [];
    }
  }

  async saveVendor(vendorData) {
    try {
      await this.executeSQL(
        `INSERT OR REPLACE INTO vendors 
        (vendor_id, name, category, status, latitude, longitude, qr_code_url, face_image_url, last_updated, sync_status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          vendorData.vendorId,
          vendorData.name,
          vendorData.category,
          vendorData.status,
          vendorData.latitude,
          vendorData.longitude,
          vendorData.qrCodeUrl,
          vendorData.faceImageUrl,
          new Date().toISOString(),
          'synced'
        ]
      );
    } catch (error) {
      console.error('Failed to save vendor:', error);
    }
  }

  // Zone operations
  async getZones() {
    try {
      const result = await this.executeSQL('SELECT * FROM zones ORDER BY name');
      const zones = [];
      for (let i = 0; i < result.rows.length; i++) {
        const zone = result.rows.item(i);
        if (zone.polygon_coordinates) {
          zone.polygon_coordinates = JSON.parse(zone.polygon_coordinates);
        }
        zones.push(zone);
      }
      return zones;
    } catch (error) {
      console.error('Failed to get zones:', error);
      return [];
    }
  }

  async saveZone(zoneData) {
    try {
      await this.executeSQL(
        `INSERT OR REPLACE INTO zones 
        (id, name, zone_type, polygon_coordinates, max_vendors, last_updated, sync_status)
        VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          zoneData.id,
          zoneData.name,
          zoneData.zoneType,
          JSON.stringify(zoneData.polygonCoordinates),
          zoneData.maxVendors,
          new Date().toISOString(),
          'synced'
        ]
      );
    } catch (error) {
      console.error('Failed to save zone:', error);
    }
  }

  // Violation reporting (offline)
  async reportViolation(violationData) {
    try {
      // Save to local database
      const result = await this.executeSQL(
        `INSERT INTO violation_reports 
        (vendor_id, violation_type, description, latitude, longitude, image_path, reporter_name, reporter_phone, timestamp, sync_status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          violationData.vendorId,
          violationData.violationType,
          violationData.description,
          violationData.latitude,
          violationData.longitude,
          violationData.imagePath,
          violationData.reporterName,
          violationData.reporterPhone,
          new Date().toISOString(),
          'pending'
        ]
      );

      const reportId = result.insertId;

      // Add to sync queue
      await this.addToSyncQueue({
        entityType: 'violation_report',
        entityId: reportId.toString(),
        operation: 'create',
        entityData: JSON.stringify(violationData),
        timestamp: new Date().toISOString()
      });

      return { success: true, reportId };
    } catch (error) {
      console.error('Failed to report violation:', error);
      return { success: false, error: error.message };
    }
  }

  // Sync queue management
  async addToSyncQueue(item) {
    try {
      await this.executeSQL(
        `INSERT INTO sync_queue 
        (entity_type, entity_id, operation, entity_data, timestamp)
        VALUES (?, ?, ?, ?, ?)`,
        [
          item.entityType,
          item.entityId,
          item.operation,
          item.entityData,
          item.timestamp
        ]
      );
    } catch (error) {
      console.error('Failed to add to sync queue:', error);
    }
  }

  async processSyncQueue() {
    if (!this.isOnline) return;

    try {
      const queueResult = await this.executeSQL(
        'SELECT * FROM sync_queue WHERE retry_count < 3 ORDER BY timestamp ASC'
      );

      for (let i = 0; i < queueResult.rows.length; i++) {
        const item = queueResult.rows.item(i);
        await this.syncItem(item);
      }
    } catch (error) {
      console.error('Failed to process sync queue:', error);
    }
  }

  async syncItem(item) {
    try {
      const entityData = JSON.parse(item.entity_data);
      
      let response;
      switch (item.entity_type) {
        case 'violation_report':
          response = await this.apiService.submitViolationReport(entityData);
          break;
        default:
          console.warn('Unknown entity type:', item.entity_type);
          return;
      }

      if (response.success) {
        // Mark as synced
        await this.executeSQL(
          'DELETE FROM sync_queue WHERE id = ?',
          [item.id]
        );
        
        // Update local record
        if (item.entity_type === 'violation_report') {
          await this.executeSQL(
            'UPDATE violation_reports SET sync_status = ? WHERE id = ?',
            ['synced', item.entity_id]
          );
        }
      } else {
        // Increment retry count
        await this.executeSQL(
          'UPDATE sync_queue SET retry_count = retry_count + 1 WHERE id = ?',
          [item.id]
        );
      }
    } catch (error) {
      console.error('Failed to sync item:', item.id, error);
    }
  }

  // Data preloading for offline use
  async preloadEssentialData() {
    try {
      if (!this.isOnline) {
        console.log('Cannot preload data - offline');
        return;
      }

      // Preload vendors
      const vendorsResponse = await this.apiService.getAllVendors();
      if (vendorsResponse.success) {
        for (const vendor of vendorsResponse.data) {
          await this.saveVendor(vendor);
        }
      }

      // Preload zones
      const zonesResponse = await this.apiService.getAllZones();
      if (zonesResponse.success) {
        for (const zone of zonesResponse.data) {
          await this.saveZone(zone);
        }
      }

      console.log('Essential data preloaded for offline use');
    } catch (error) {
      console.error('Failed to preload essential data:', error);
    }
  }

  // Utility methods
  async executeSQL(query, params = []) {
    return new Promise((resolve, reject) => {
      this.db.transaction(tx => {
        tx.executeSql(
          query,
          params,
          (tx, results) => resolve(results),
          (tx, error) => reject(error)
        );
      });
    });
  }

  async getSyncQueueCount() {
    try {
      const result = await this.executeSQL('SELECT COUNT(*) as count FROM sync_queue');
      return result.rows.item(0).count;
    } catch (error) {
      console.error('Failed to get sync queue count:', error);
      return 0;
    }
  }

  async clearCache() {
    try {
      await this.executeSQL('DELETE FROM vendors');
      await this.executeSQL('DELETE FROM zones');
      await this.executeSQL('DELETE FROM sync_queue WHERE sync_status = "completed"');
      console.log('Cache cleared');
    } catch (error) {
      console.error('Failed to clear cache:', error);
    }
  }

  // Set API service reference
  setApiService(apiService) {
    this.apiService = apiService;
  }
}

export default new OfflineStorageService();
