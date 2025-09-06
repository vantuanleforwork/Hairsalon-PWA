/**
 * Storage Service for Hair Salon Management System
 * Handles LocalStorage and IndexedDB operations with offline support
 * 
 * @version 1.0.0
 */

class StorageService {
  constructor() {
    this.dbName = 'SalonOrdersDB';
    this.dbVersion = 1;
    this.db = null;
    this.isIndexedDBSupported = this.checkIndexedDBSupport();
    this.isInitialized = false;
    
    this.stores = {
      orders: 'orders',
      offlineQueue: 'offlineQueue',
      cache: 'cache'
    };
    
    console.log('💾 Storage Service initialized');
  }

  // =============  SIMPLE KEY/VALUE COMPAT LAYER =============
  // Provide simple get/set/remove to match existing call sites
  async get(key, defaultValue = null) {
    return this.getLocal(key, defaultValue);
  }

  async set(key, value) {
    return this.setLocal(key, value);
  }

  async remove(key) {
    return this.removeLocal(key);
  }
  
  /**
   * Initialize IndexedDB
   */
  async init() {
    if (this.isInitialized) {
      return true;
    }
    
    if (!this.isIndexedDBSupported) {
      console.warn('⚠️ IndexedDB not supported, using localStorage only');
      this.isInitialized = true;
      return true;
    }
    
    try {
      this.db = await this.openDatabase();
      this.isInitialized = true;
      console.log('✅ IndexedDB initialized successfully');
      return true;
      
    } catch (error) {
      console.error('❌ Failed to initialize IndexedDB:', error);
      this.isIndexedDBSupported = false;
      this.isInitialized = true;
      return false;
    }
  }
  
  /**
   * Check if IndexedDB is supported
   * @private
   */
  checkIndexedDBSupport() {
    return 'indexedDB' in window;
  }
  
  /**
   * Open IndexedDB database
   * @private
   */
  async openDatabase() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
      
      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        
        // Create orders store
        if (!db.objectStoreNames.contains(this.stores.orders)) {
          const ordersStore = db.createObjectStore(this.stores.orders, {
            keyPath: 'id'
          });
          ordersStore.createIndex('timestamp', 'timestamp');
          ordersStore.createIndex('staff', 'staff');
          ordersStore.createIndex('status', 'status');
        }
        
        // Create offline queue store
        if (!db.objectStoreNames.contains(this.stores.offlineQueue)) {
          const queueStore = db.createObjectStore(this.stores.offlineQueue, {
            keyPath: 'id'
          });
          queueStore.createIndex('timestamp', 'timestamp');
          queueStore.createIndex('action', 'action');
        }
        
        // Create cache store
        if (!db.objectStoreNames.contains(this.stores.cache)) {
          const cacheStore = db.createObjectStore(this.stores.cache, {
            keyPath: 'key'
          });
          cacheStore.createIndex('expiresAt', 'expiresAt');
        }
      };
    });
  }
  
  // =============  LOCALSTORAGE OPERATIONS =============
  
  /**
   * Set item in localStorage with JSON stringification
   */
  setLocal(key, value) {
    try {
      const serializedValue = JSON.stringify({
        data: value,
        timestamp: Date.now()
      });
      
      localStorage.setItem(key, serializedValue);
      return true;
      
    } catch (error) {
      console.error('LocalStorage setItem failed:', error);
      
      // Handle quota exceeded
      if (error.name === 'QuotaExceededError') {
        this.clearExpiredLocalItems();
        
        // Try again after cleanup
        try {
          localStorage.setItem(key, serializedValue);
          return true;
        } catch (retryError) {
          console.error('LocalStorage still full after cleanup:', retryError);
        }
      }
      
      return false;
    }
  }
  
  /**
   * Get item from localStorage with JSON parsing
   */
  getLocal(key, defaultValue = null) {
    try {
      const item = localStorage.getItem(key);
      
      if (item === null) {
        return defaultValue;
      }
      
      const parsed = JSON.parse(item);
      return parsed.data !== undefined ? parsed.data : parsed;
      
    } catch (error) {
      console.error('LocalStorage getItem failed:', error);
      return defaultValue;
    }
  }
  
  /**
   * Remove item from localStorage
   */
  removeLocal(key) {
    try {
      localStorage.removeItem(key);
      return true;
    } catch (error) {
      console.error('LocalStorage removeItem failed:', error);
      return false;
    }
  }
  
  /**
   * Clear expired items from localStorage
   * @private
   */
  clearExpiredLocalItems() {
    const keysToRemove = [];
    
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      
      if (key && key.startsWith('salon_')) {
        try {
          const item = localStorage.getItem(key);
          const parsed = JSON.parse(item);
          
          // Remove items older than 7 days
          if (parsed.timestamp && Date.now() - parsed.timestamp > 7 * 24 * 60 * 60 * 1000) {
            keysToRemove.push(key);
          }
        } catch (error) {
          // Invalid JSON, remove it
          keysToRemove.push(key);
        }
      }
    }
    
    keysToRemove.forEach(key => localStorage.removeItem(key));
    console.log(`🧹 Cleaned up ${keysToRemove.length} expired localStorage items`);
  }
  
  // =============  INDEXEDDB OPERATIONS =============
  
  /**
   * Set item in IndexedDB
   */
  async setIndexed(storeName, data) {
    if (!this.isIndexedDBSupported || !this.db) {
      return false;
    }
    
    try {
      const transaction = this.db.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      
      await new Promise((resolve, reject) => {
        const request = store.put(data);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
      
      return true;
      
    } catch (error) {
      console.error('IndexedDB setItem failed:', error);
      return false;
    }
  }
  
  /**
   * Get item from IndexedDB
   */
  async getIndexed(storeName, key) {
    if (!this.isIndexedDBSupported || !this.db) {
      return null;
    }
    
    try {
      const transaction = this.db.transaction([storeName], 'readonly');
      const store = transaction.objectStore(storeName);
      
      return await new Promise((resolve, reject) => {
        const request = store.get(key);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
      
    } catch (error) {
      console.error('IndexedDB getItem failed:', error);
      return null;
    }
  }
  
  /**
   * Get all items from IndexedDB store
   */
  async getAllIndexed(storeName, indexName = null, query = null) {
    if (!this.isIndexedDBSupported || !this.db) {
      return [];
    }
    
    try {
      const transaction = this.db.transaction([storeName], 'readonly');
      const store = transaction.objectStore(storeName);
      const source = indexName ? store.index(indexName) : store;
      
      return await new Promise((resolve, reject) => {
        const request = query ? source.getAll(query) : source.getAll();
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
      
    } catch (error) {
      console.error('IndexedDB getAll failed:', error);
      return [];
    }
  }
  
  /**
   * Remove item from IndexedDB
   */
  async removeIndexed(storeName, key) {
    if (!this.isIndexedDBSupported || !this.db) {
      return false;
    }
    
    try {
      const transaction = this.db.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      
      await new Promise((resolve, reject) => {
        const request = store.delete(key);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
      
      return true;
      
    } catch (error) {
      console.error('IndexedDB removeItem failed:', error);
      return false;
    }
  }
  
  /**
   * Clear all items from IndexedDB store
   */
  async clearIndexed(storeName) {
    if (!this.isIndexedDBSupported || !this.db) {
      return false;
    }
    
    try {
      const transaction = this.db.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      
      await new Promise((resolve, reject) => {
        const request = store.clear();
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
      
      return true;
      
    } catch (error) {
      console.error('IndexedDB clear failed:', error);
      return false;
    }
  }
  
  // =============  HIGH-LEVEL OPERATIONS =============
  
  /**
   * Store orders with automatic fallback
   */
  async storeOrders(orders) {
    try {
      // Try IndexedDB first
      if (this.isIndexedDBSupported && this.db) {
        const success = await Promise.all(
          orders.map(order => this.setIndexed(this.stores.orders, {
            ...order,
            storedAt: Date.now()
          }))
        );
        
        if (success.every(s => s)) {
          console.log(`💾 Stored ${orders.length} orders in IndexedDB`);
          return true;
        }
      }
      
      // Fallback to localStorage
      return this.setLocal(CONFIG.STORAGE_KEYS.ORDERS_CACHE, orders);
      
    } catch (error) {
      console.error('Failed to store orders:', error);
      return false;
    }
  }
  
  /**
   * Retrieve orders with automatic fallback
   */
  async getStoredOrders() {
    try {
      // Try IndexedDB first
      if (this.isIndexedDBSupported && this.db) {
        const orders = await this.getAllIndexed(this.stores.orders);
        if (orders.length > 0) {
          console.log(`📥 Retrieved ${orders.length} orders from IndexedDB`);
          return orders;
        }
      }
      
      // Fallback to localStorage
      const localOrders = this.getLocal(CONFIG.STORAGE_KEYS.ORDERS_CACHE, []);
      console.log(`📥 Retrieved ${localOrders.length} orders from localStorage`);
      return localOrders;
      
    } catch (error) {
      console.error('Failed to retrieve orders:', error);
      return [];
    }
  }
  
  /**
   * Store offline queue
   */
  async storeOfflineQueue(queue) {
    try {
      // Try IndexedDB first
      if (this.isIndexedDBSupported && this.db) {
        await this.clearIndexed(this.stores.offlineQueue);
        
        const success = await Promise.all(
          queue.map(item => this.setIndexed(this.stores.offlineQueue, item))
        );
        
        if (success.every(s => s)) {
          console.log(`💾 Stored ${queue.length} items in offline queue (IndexedDB)`);
          return true;
        }
      }
      
      // Fallback to localStorage
      return this.setLocal(CONFIG.STORAGE_KEYS.OFFLINE_QUEUE, queue);
      
    } catch (error) {
      console.error('Failed to store offline queue:', error);
      return false;
    }
  }
  
  /**
   * Get offline queue
   */
  async getOfflineQueue() {
    try {
      // Try IndexedDB first
      if (this.isIndexedDBSupported && this.db) {
        const queue = await this.getAllIndexed(this.stores.offlineQueue);
        if (queue.length > 0) {
          console.log(`📥 Retrieved ${queue.length} items from offline queue (IndexedDB)`);
          return queue;
        }
      }
      
      // Fallback to localStorage
      const localQueue = this.getLocal(CONFIG.STORAGE_KEYS.OFFLINE_QUEUE, []);
      console.log(`📥 Retrieved ${localQueue.length} items from offline queue (localStorage)`);
      return localQueue;
      
    } catch (error) {
      console.error('Failed to retrieve offline queue:', error);
      return [];
    }
  }
  
  /**
   * Cache data with expiration
   */
  async setCache(key, data, ttl = CONFIG.CACHE.ORDERS_TTL) {
    const cacheItem = {
      key: key,
      data: data,
      createdAt: Date.now(),
      expiresAt: Date.now() + ttl
    };
    
    try {
      // Try IndexedDB first
      if (this.isIndexedDBSupported && this.db) {
        if (await this.setIndexed(this.stores.cache, cacheItem)) {
          return true;
        }
      }
      
      // Fallback to localStorage
      return this.setLocal(`cache_${key}`, cacheItem);
      
    } catch (error) {
      console.error('Failed to set cache:', error);
      return false;
    }
  }
  
  /**
   * Get cached data
   */
  async getCache(key) {
    try {
      let cacheItem = null;
      
      // Try IndexedDB first
      if (this.isIndexedDBSupported && this.db) {
        cacheItem = await this.getIndexed(this.stores.cache, key);
      }
      
      // Fallback to localStorage
      if (!cacheItem) {
        cacheItem = this.getLocal(`cache_${key}`);
      }
      
      if (!cacheItem) {
        return null;
      }
      
      // Check if expired
      if (Date.now() > cacheItem.expiresAt) {
        this.removeCache(key);
        return null;
      }
      
      return cacheItem.data;
      
    } catch (error) {
      console.error('Failed to get cache:', error);
      return null;
    }
  }
  
  /**
   * Remove cached data
   */
  async removeCache(key) {
    try {
      // Remove from IndexedDB
      if (this.isIndexedDBSupported && this.db) {
        await this.removeIndexed(this.stores.cache, key);
      }
      
      // Remove from localStorage
      this.removeLocal(`cache_${key}`);
      
      return true;
      
    } catch (error) {
      console.error('Failed to remove cache:', error);
      return false;
    }
  }
  
  /**
   * Clear expired cache items
   */
  async clearExpiredCache() {
    try {
      let clearedCount = 0;
      
      // Clear IndexedDB cache
      if (this.isIndexedDBSupported && this.db) {
        const cacheItems = await this.getAllIndexed(this.stores.cache);
        const now = Date.now();
        
        for (const item of cacheItems) {
          if (now > item.expiresAt) {
            await this.removeIndexed(this.stores.cache, item.key);
            clearedCount++;
          }
        }
      }
      
      // Clear localStorage cache
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        
        if (key && key.startsWith('cache_')) {
          try {
            const item = this.getLocal(key);
            if (item && Date.now() > item.expiresAt) {
              localStorage.removeItem(key);
              clearedCount++;
            }
          } catch (error) {
            // Invalid cache item, remove it
            localStorage.removeItem(key);
            clearedCount++;
          }
        }
      }
      
      if (clearedCount > 0) {
        console.log(`🧹 Cleared ${clearedCount} expired cache items`);
      }
      
      return clearedCount;
      
    } catch (error) {
      console.error('Failed to clear expired cache:', error);
      return 0;
    }
  }
  
  /**
   * Get storage statistics
   */
  async getStorageStats() {
    const stats = {
      localStorage: {
        used: 0,
        available: 0,
        items: 0
      },
      indexedDB: {
        supported: this.isIndexedDBSupported,
        initialized: this.isInitialized,
        orders: 0,
        offlineQueue: 0,
        cache: 0
      }
    };
    
    try {
      // LocalStorage stats
      let localStorageSize = 0;
      for (let key in localStorage) {
        if (localStorage.hasOwnProperty(key)) {
          localStorageSize += localStorage[key].length;
          stats.localStorage.items++;
        }
      }
      stats.localStorage.used = Math.round(localStorageSize / 1024); // KB
      
      // Rough estimate of localStorage quota (usually 5-10MB)
      stats.localStorage.available = 5000; // KB
      
      // IndexedDB stats
      if (this.isIndexedDBSupported && this.db) {
        const orders = await this.getAllIndexed(this.stores.orders);
        const queue = await this.getAllIndexed(this.stores.offlineQueue);
        const cache = await this.getAllIndexed(this.stores.cache);
        
        stats.indexedDB.orders = orders.length;
        stats.indexedDB.offlineQueue = queue.length;
        stats.indexedDB.cache = cache.length;
      }
      
    } catch (error) {
      console.error('Failed to get storage stats:', error);
    }
    
    return stats;
  }
  
  /**
   * Clear all storage
   */
  async clearAll() {
    try {
      // Clear localStorage
      Object.values(CONFIG.STORAGE_KEYS).forEach(key => {
        localStorage.removeItem(key);
      });
      
      // Clear cache keys
      for (let i = localStorage.length - 1; i >= 0; i--) {
        const key = localStorage.key(i);
        if (key && (key.startsWith('salon_') || key.startsWith('cache_'))) {
          localStorage.removeItem(key);
        }
      }
      
      // Clear IndexedDB
      if (this.isIndexedDBSupported && this.db) {
        await this.clearIndexed(this.stores.orders);
        await this.clearIndexed(this.stores.offlineQueue);
        await this.clearIndexed(this.stores.cache);
      }
      
      console.log('🧹 Cleared all storage');
      return true;
      
    } catch (error) {
      console.error('Failed to clear storage:', error);
      return false;
    }
  }
  
  /**
   * Export data for backup
   */
  async exportData() {
    try {
      const data = {
        timestamp: new Date().toISOString(),
        localStorage: {},
        indexedDB: {}
      };
      
      // Export localStorage
      Object.values(CONFIG.STORAGE_KEYS).forEach(key => {
        const value = this.getLocal(key);
        if (value !== null) {
          data.localStorage[key] = value;
        }
      });
      
      // Export IndexedDB
      if (this.isIndexedDBSupported && this.db) {
        data.indexedDB.orders = await this.getAllIndexed(this.stores.orders);
        data.indexedDB.offlineQueue = await this.getAllIndexed(this.stores.offlineQueue);
        data.indexedDB.cache = await this.getAllIndexed(this.stores.cache);
      }
      
      return data;
      
    } catch (error) {
      console.error('Failed to export data:', error);
      return null;
    }
  }
}

// =============  AUTO-INITIALIZATION =============

let storageInitialized = false;

async function initStorageService() {
  if (storageInitialized) return;
  
  try {
    await Storage.init();
    
    // Clear expired items on startup
    await Storage.clearExpiredCache();
    Storage.clearExpiredLocalItems();
    
    storageInitialized = true;
    
  } catch (error) {
    console.error('Storage service initialization failed:', error);
  }
}

// =============  CREATE GLOBAL INSTANCE =============

const Storage = new StorageService();

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initStorageService);
} else {
  initStorageService();
}

// Make available globally
window.Storage = Storage;

// Export for ESM consumers
export { StorageService };
export default Storage;

// Export for CommonJS (optional environments)
if (typeof module !== 'undefined' && module.exports) {
  module.exports = Storage;
}

console.log('💾 Storage Service ready');
