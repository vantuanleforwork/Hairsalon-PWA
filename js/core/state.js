/**
 * State Management for Hair Salon Management System
 * Centralized state management with reactive updates
 * 
 * @version 1.0.0
 */

class StateManager {
  constructor() {
    this.state = {
      // =============  USER STATE =============
      user: {
        isAuthenticated: false,
        email: null,
        name: null,
        role: null,
        permissions: {},
        idToken: null,
        lastLogin: null
      },
      
      // =============  ORDERS STATE =============
      orders: {
        list: [],
        todayOrders: [],
        isLoading: false,
        lastFetch: null,
        error: null,
        selectedOrder: null,
        filter: {
          date: this.getTodayString(),
          service: null,
          sortBy: 'timestamp',
          sortOrder: 'desc'
        }
      },
      
      // =============  FORM STATE =============
      orderForm: {
        isSubmitting: false,
        data: {
          service: '',
          price: '',
          note: '',
          customService: ''
        },
        errors: {},
        isDirty: false,
        lastSaved: null
      },
      
      // =============  UI STATE =============
      ui: {
        isOnline: navigator.onLine,
        currentView: 'orders',
        isMobile: window.innerWidth < 768,
        showSidebar: false,
        notifications: [],
        loading: {
          global: false,
          orders: false,
          submit: false,
          sync: false
        },
        modal: {
          isOpen: false,
          type: null,
          data: null
        }
      },
      
      // =============  OFFLINE STATE =============
      offline: {
        queue: [],
        isProcessing: false,
        lastSync: null,
        syncStatus: 'idle' // idle, syncing, success, error
      },
      
      // =============  STATS STATE =============
      stats: {
        today: {
          totalOrders: 0,
          totalRevenue: 0,
          avgOrderValue: 0,
          services: {}
        },
        isLoading: false,
        lastUpdate: null
      },
      
      // =============  SETTINGS STATE =============
      settings: {
        autoRefresh: true,
        refreshInterval: 30000,
        soundEnabled: true,
        notifications: true,
        offlineMode: true
      }
    };
    
    this.listeners = {};
    this.middleware = [];
    
    // Initialize
    this.init();
  }
  
  /**
   * Initialize state manager
   */
  init() {
    // Load persisted state
    this.loadPersistedState();
    
    // Setup event listeners
    this.setupEventListeners();
    
    // Setup auto-save
    this.setupAutoSave();
    
    console.log('🔄 State Manager initialized');
  }
  
  /**
   * Get current state or specific path
   */
  get(path = null) {
    if (!path) {
      return { ...this.state };
    }
    
    return this.getNestedValue(this.state, path);
  }
  
  /**
   * Set state with automatic notifications
   */
  set(path, value, options = {}) {
    const oldValue = this.getNestedValue(this.state, path);
    
    // Apply middleware
    for (const middleware of this.middleware) {
      value = middleware(path, value, oldValue, this.state);
    }
    
    // Update state
    this.setNestedValue(this.state, path, value);
    
    // Notify listeners
    if (!options.silent) {
      this.notify(path, value, oldValue);
    }
    
    // Auto-save if needed
    if (options.persist !== false) {
      this.scheduleAutoSave();
    }
    
    return this;
  }
  
  /**
   * Update state with partial object
   */
  update(path, updates, options = {}) {
    const currentValue = this.get(path) || {};
    const newValue = { ...currentValue, ...updates };
    
    return this.set(path, newValue, options);
  }
  
  /**
   * Subscribe to state changes
   */
  subscribe(path, callback) {
    if (!this.listeners[path]) {
      this.listeners[path] = [];
    }
    
    this.listeners[path].push(callback);
    
    // Return unsubscribe function
    return () => {
      const index = this.listeners[path].indexOf(callback);
      if (index > -1) {
        this.listeners[path].splice(index, 1);
      }
    };
  }
  
  /**
   * Add middleware for state changes
   */
  addMiddleware(middleware) {
    this.middleware.push(middleware);
  }
  
  /**
   * Reset specific state branch
   */
  reset(path) {
    const initialValue = this.getInitialValue(path);
    return this.set(path, initialValue);
  }
  
  // =============  USER ACTIONS =============
  
  /**
   * Set authenticated user
   */
  setUser(userInfo) {
    return this.update('user', {
      ...userInfo,
      isAuthenticated: true,
      lastLogin: new Date().toISOString()
    });
  }
  
  /**
   * Clear user authentication
   */
  logout() {
    return this.set('user', {
      isAuthenticated: false,
      email: null,
      name: null,
      role: null,
      permissions: {},
      idToken: null,
      lastLogin: null
    });
  }
  
  // =============  ORDERS ACTIONS =============
  
  /**
   * Set orders list
   */
  setOrders(orders) {
    const todayOrders = orders.filter(order => 
      order.timestamp && 
      new Date(order.timestamp).toDateString() === new Date().toDateString()
    );
    
    this.set('orders.list', orders);
    this.set('orders.todayOrders', todayOrders);
    this.set('orders.lastFetch', new Date().toISOString());
    
    // Update stats
    this.updateTodayStats(todayOrders);
    
    return this;
  }
  
  /**
   * Add new order to list
   */
  addOrder(order) {
    const orders = this.get('orders.list') || [];
    const newOrders = [order, ...orders];
    
    return this.setOrders(newOrders);
  }
  
  /**
   * Update existing order
   */
  updateOrder(orderId, updates) {
    const orders = this.get('orders.list') || [];
    const updatedOrders = orders.map(order => 
      order.id === orderId ? { ...order, ...updates } : order
    );
    
    return this.setOrders(updatedOrders);
  }
  
  /**
   * Remove order from list
   */
  removeOrder(orderId) {
    const orders = this.get('orders.list') || [];
    const filteredOrders = orders.filter(order => order.id !== orderId);
    
    return this.setOrders(filteredOrders);
  }
  
  /**
   * Set orders loading state
   */
  setOrdersLoading(isLoading, error = null) {
    this.set('orders.isLoading', isLoading);
    this.set('orders.error', error);
    return this;
  }
  
  // =============  FORM ACTIONS =============
  
  /**
   * Update form data
   */
  updateForm(field, value) {
    this.set(`orderForm.data.${field}`, value);
    this.set('orderForm.isDirty', true);
    return this;
  }
  
  /**
   * Set form errors
   */
  setFormErrors(errors) {
    return this.set('orderForm.errors', errors);
  }
  
  /**
   * Reset form
   */
  resetForm() {
    return this.set('orderForm', {
      isSubmitting: false,
      data: {
        service: '',
        price: '',
        note: '',
        customService: ''
      },
      errors: {},
      isDirty: false,
      lastSaved: null
    });
  }
  
  /**
   * Set form submitting state
   */
  setFormSubmitting(isSubmitting) {
    return this.set('orderForm.isSubmitting', isSubmitting);
  }
  
  // =============  UI ACTIONS =============
  
  /**
   * Set online status
   */
  setOnlineStatus(isOnline) {
    return this.set('ui.isOnline', isOnline);
  }
  
  /**
   * Show notification
   */
  showNotification(notification) {
    const notifications = this.get('ui.notifications') || [];
    const newNotification = {
      id: Date.now() + Math.random(),
      timestamp: new Date().toISOString(),
      ...notification
    };
    
    const updatedNotifications = [newNotification, ...notifications]
      .slice(0, CONFIG.NOTIFICATIONS.MAX_NOTIFICATIONS);
    
    return this.set('ui.notifications', updatedNotifications);
  }
  
  /**
   * Remove notification
   */
  removeNotification(notificationId) {
    const notifications = this.get('ui.notifications') || [];
    const filtered = notifications.filter(n => n.id !== notificationId);
    
    return this.set('ui.notifications', filtered);
  }
  
  /**
   * Set loading state
   */
  setLoading(key, isLoading) {
    return this.set(`ui.loading.${key}`, isLoading);
  }
  
  /**
   * Open modal
   */
  openModal(type, data = null) {
    return this.update('ui.modal', {
      isOpen: true,
      type: type,
      data: data
    });
  }
  
  /**
   * Close modal
   */
  closeModal() {
    return this.set('ui.modal', {
      isOpen: false,
      type: null,
      data: null
    });
  }
  
  // =============  OFFLINE ACTIONS =============
  
  /**
   * Add item to offline queue
   */
  addToOfflineQueue(item) {
    const queue = this.get('offline.queue') || [];
    const newQueue = [...queue, {
      id: Date.now() + Math.random(),
      timestamp: new Date().toISOString(),
      ...item
    }];
    
    return this.set('offline.queue', newQueue);
  }
  
  /**
   * Remove item from offline queue
   */
  removeFromOfflineQueue(itemId) {
    const queue = this.get('offline.queue') || [];
    const filtered = queue.filter(item => item.id !== itemId);
    
    return this.set('offline.queue', filtered);
  }
  
  /**
   * Clear offline queue
   */
  clearOfflineQueue() {
    return this.set('offline.queue', []);
  }
  
  /**
   * Set sync status
   */
  setSyncStatus(status, lastSync = null) {
    this.set('offline.syncStatus', status);
    if (lastSync) {
      this.set('offline.lastSync', lastSync);
    }
    return this;
  }
  
  // =============  HELPER METHODS =============
  
  /**
   * Get nested value from object
   */
  getNestedValue(obj, path) {
    return path.split('.').reduce((current, key) => 
      current && current[key] !== undefined ? current[key] : undefined, obj
    );
  }
  
  /**
   * Set nested value in object
   */
  setNestedValue(obj, path, value) {
    const keys = path.split('.');
    const lastKey = keys.pop();
    const target = keys.reduce((current, key) => {
      if (!current[key]) current[key] = {};
      return current[key];
    }, obj);
    
    target[lastKey] = value;
  }
  
  /**
   * Notify listeners of state changes
   */
  notify(path, newValue, oldValue) {
    const pathParts = path.split('.');
    
    // Notify exact path listeners
    if (this.listeners[path]) {
      this.listeners[path].forEach(callback => {
        try {
          callback(newValue, oldValue, path);
        } catch (error) {
          console.error('Error in state listener:', error);
        }
      });
    }
    
    // Notify parent path listeners
    for (let i = pathParts.length - 1; i > 0; i--) {
      const parentPath = pathParts.slice(0, i).join('.');
      if (this.listeners[parentPath]) {
        this.listeners[parentPath].forEach(callback => {
          try {
            callback(this.get(parentPath), null, parentPath);
          } catch (error) {
            console.error('Error in state listener:', error);
          }
        });
      }
    }
  }
  
  /**
   * Setup event listeners
   */
  setupEventListeners() {
    // Online/offline detection
    window.addEventListener('online', () => this.setOnlineStatus(true));
    window.addEventListener('offline', () => this.setOnlineStatus(false));
    
    // Window resize
    window.addEventListener('resize', () => {
      this.set('ui.isMobile', window.innerWidth < 768);
    });
    
    // Visibility change (for auto-refresh)
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden && this.get('settings.autoRefresh')) {
        this.notify('visibility', 'visible', 'hidden');
      }
    });
  }
  
  /**
   * Load persisted state from localStorage
   */
  loadPersistedState() {
    try {
      // Load user info
      const userInfo = localStorage.getItem(CONFIG.STORAGE_KEYS.USER_INFO);
      if (userInfo) {
        this.set('user', JSON.parse(userInfo), { silent: true });
      }
      
      // Load settings
      const settings = localStorage.getItem(CONFIG.STORAGE_KEYS.SETTINGS);
      if (settings) {
        this.set('settings', { ...this.state.settings, ...JSON.parse(settings) }, { silent: true });
      }
      
      // Load offline queue
      const offlineQueue = localStorage.getItem(CONFIG.STORAGE_KEYS.OFFLINE_QUEUE);
      if (offlineQueue) {
        this.set('offline.queue', JSON.parse(offlineQueue), { silent: true });
      }
      
    } catch (error) {
      console.error('Error loading persisted state:', error);
    }
  }
  
  /**
   * Setup auto-save to localStorage
   */
  setupAutoSave() {
    this.autoSaveTimeout = null;
    
    // Subscribe to changes that should be persisted
    this.subscribe('user', (user) => {
      if (user.isAuthenticated) {
        localStorage.setItem(CONFIG.STORAGE_KEYS.USER_INFO, JSON.stringify(user));
      } else {
        localStorage.removeItem(CONFIG.STORAGE_KEYS.USER_INFO);
      }
    });
    
    this.subscribe('settings', (settings) => {
      localStorage.setItem(CONFIG.STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
    });
    
    this.subscribe('offline.queue', (queue) => {
      localStorage.setItem(CONFIG.STORAGE_KEYS.OFFLINE_QUEUE, JSON.stringify(queue));
    });
  }
  
  /**
   * Schedule auto-save
   */
  scheduleAutoSave() {
    if (this.autoSaveTimeout) {
      clearTimeout(this.autoSaveTimeout);
    }
    
    this.autoSaveTimeout = setTimeout(() => {
      // Auto-save logic here if needed
    }, 1000);
  }
  
  /**
   * Get today's date string
   */
  getTodayString() {
    return new Date().toISOString().split('T')[0];
  }
  
  /**
   * Update today's stats
   */
  updateTodayStats(todayOrders) {
    const stats = {
      totalOrders: todayOrders.length,
      totalRevenue: 0,
      avgOrderValue: 0,
      services: {}
    };
    
    todayOrders.forEach(order => {
      const price = parseInt(order.price) || 0;
      stats.totalRevenue += price;
      
      // Service breakdown
      if (order.service) {
        if (!stats.services[order.service]) {
          stats.services[order.service] = { count: 0, revenue: 0 };
        }
        stats.services[order.service].count++;
        stats.services[order.service].revenue += price;
      }
    });
    
    stats.avgOrderValue = stats.totalOrders > 0 ? 
      Math.round(stats.totalRevenue / stats.totalOrders) : 0;
    
    this.set('stats.today', stats);
    this.set('stats.lastUpdate', new Date().toISOString());
  }
  
  /**
   * Get initial value for reset
   */
  getInitialValue(path) {
    // Return appropriate initial values based on path
    const initialValues = {
      'orderForm': {
        isSubmitting: false,
        data: { service: '', price: '', note: '', customService: '' },
        errors: {},
        isDirty: false,
        lastSaved: null
      },
      'orders.filter': {
        date: this.getTodayString(),
        service: null,
        sortBy: 'timestamp',
        sortOrder: 'desc'
      }
    };
    
    return initialValues[path] || null;
  }
}

// =============  CREATE GLOBAL INSTANCE =============

const State = new StateManager();

// Make available globally
window.State = State;

// Export for modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = State;
}

console.log('🗄️ State Manager ready');
