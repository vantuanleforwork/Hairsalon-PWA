/**
 * Configuration file for Hair Salon Management System - Frontend
 * ONLY PUBLIC configuration - NO sensitive data here!
 * 
 * @version 1.0.0
 */

const CONFIG = {
  // =============  API ENDPOINTS =============
  
  // Google Apps Script Web App URL (REPLACE WITH YOUR ACTUAL URL)
  APPS_SCRIPT_URL: 'https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec',
  
  // Google OAuth 2.0 Client ID (project-specific)
  GOOGLE_CLIENT_ID: '36454863313-7bd5r8eem67t4ru8fcjai66i1dabl4ap.apps.googleusercontent.com',
  
  // =============  APPLICATION SETTINGS =============
  
  APP_NAME: 'Salon Orders',
  APP_VERSION: '1.0.0',
  APP_DESCRIPTION: 'Hair Salon Order Management System',
  
  // =============  SERVICE CONFIGURATION =============
  
  // Available services
  SERVICES: [
    'Cắt tóc',
    'Xả', 
    'Uốn',
    'Nhuộm',
    'Tẩy',
    'Duỗi',
    'Khác'
  ],
  
  // Service with icons (for better UX)
  SERVICE_ICONS: {
    'Cắt tóc': '✂️',
    'Xả': '🚿',
    'Uốn': '🌀',
    'Nhuộm': '🎨',
    'Tẩy': '🧴',
    'Duỗi': '📏',
    'Khác': '✨'
  },
  
  // =============  PRICE SETTINGS =============
  
  PRICE: {
    MIN: 0,
    MAX: 10000000, // 10 million VND
    DEFAULT: 100000,
    STEP: 5000, // Step for number input
    CURRENCY: 'VND',
    CURRENCY_SYMBOL: '₫'
  },
  
  // Common price presets for quick selection
  PRICE_PRESETS: [
    { label: '50K', value: 50000 },
    { label: '100K', value: 100000 },
    { label: '150K', value: 150000 },
    { label: '200K', value: 200000 },
    { label: '300K', value: 300000 },
    { label: '500K', value: 500000 }
  ],
  
  // =============  UI SETTINGS =============
  
  THEME: {
    PRIMARY_COLOR: '#8B5CF6',     // Purple
    SECONDARY_COLOR: '#EC4899',   // Pink  
    SUCCESS_COLOR: '#10B981',     // Green
    WARNING_COLOR: '#F59E0B',     // Amber
    ERROR_COLOR: '#EF4444',       // Red
    BACKGROUND_COLOR: '#F8FAFC',  // Light gray
    TEXT_COLOR: '#1F2937'         // Dark gray
  },
  
  // =============  FORM SETTINGS =============
  
  FORM: {
    MAX_NOTE_LENGTH: 500,
    DEBOUNCE_DELAY: 300, // milliseconds
    AUTO_SAVE_DELAY: 2000 // milliseconds
  },
  
  // =============  ORDER SETTINGS =============
  
  ORDER: {
    ITEMS_PER_PAGE: 20,
    MAX_ORDERS_DISPLAY: 100,
    REFRESH_INTERVAL: 30000, // 30 seconds
    AUTO_REFRESH: true
  },
  
  // =============  OFFLINE SETTINGS =============
  
  OFFLINE: {
    MAX_QUEUE_SIZE: 50,
    RETRY_INTERVAL: 5000, // 5 seconds
    MAX_RETRY_ATTEMPTS: 3,
    STORAGE_KEY: 'salon_offline_queue'
  },
  
  // =============  NOTIFICATION SETTINGS =============
  
  NOTIFICATIONS: {
    DURATION: {
      SUCCESS: 3000,   // 3 seconds
      ERROR: 5000,     // 5 seconds  
      WARNING: 4000,   // 4 seconds
      INFO: 2000       // 2 seconds
    },
    POSITION: 'top-right',
    MAX_NOTIFICATIONS: 3
  },
  
  // =============  CACHE SETTINGS =============
  
  CACHE: {
    ORDERS_TTL: 60000,        // 1 minute
    USER_INFO_TTL: 3600000,   // 1 hour
    STAFF_LIST_TTL: 1800000   // 30 minutes
  },
  
  // =============  VALIDATION SETTINGS =============
  
  VALIDATION: {
    PRICE_WARNINGS: {
      LOW_THRESHOLD: 10000,    // Below 10K VND
      HIGH_THRESHOLD: 5000000  // Above 5M VND
    },
    NOTE_WARNING_LENGTH: 200   // Warn if note is very long
  },
  
  // =============  PWA SETTINGS =============
  
  PWA: {
    THEME_COLOR: '#8B5CF6',
    BACKGROUND_COLOR: '#FFFFFF',
    DISPLAY: 'standalone',
    ORIENTATION: 'portrait',
    START_URL: '/',
    SCOPE: '/'
  },
  
  // =============  DEVELOPMENT SETTINGS =============
  
  DEV: {
    ENABLE_LOGS: true,
    LOG_LEVEL: 'DEBUG', // DEBUG, INFO, WARN, ERROR
    MOCK_API: false,
    SHOW_PERFORMANCE: false
  },
  
  // =============  FEATURE FLAGS =============
  
  FEATURES: {
    OFFLINE_MODE: true,
    AUTO_SYNC: true,
    PUSH_NOTIFICATIONS: false, // Not implemented yet
    DARK_MODE: false,          // Future feature
    VOICE_INPUT: false,        // Future feature
    BARCODE_SCANNER: false,    // Future feature
    ANALYTICS: false           // Future feature
  },
  
  // =============  API TIMEOUTS =============
  
  API: {
    TIMEOUT: 10000,         // 10 seconds
    RETRY_ATTEMPTS: 2,
    RETRY_DELAY: 1000       // 1 second
  },
  
  // =============  STORAGE KEYS =============
  
  STORAGE_KEYS: {
    USER_TOKEN: 'salon_user_token',
    USER_INFO: 'salon_user_info',
    OFFLINE_QUEUE: 'salon_offline_queue',
    SETTINGS: 'salon_settings',
    LAST_SYNC: 'salon_last_sync',
    ORDERS_CACHE: 'salon_orders_cache'
  },
  
  // =============  DATE/TIME SETTINGS =============
  
  DATETIME: {
    TIMEZONE: 'Asia/Ho_Chi_Minh',
    DATE_FORMAT: 'DD/MM/YYYY',
    TIME_FORMAT: 'HH:mm',
    DATETIME_FORMAT: 'DD/MM/YYYY HH:mm'
  },
  
  // =============  RESPONSIVE BREAKPOINTS =============
  
  BREAKPOINTS: {
    MOBILE: 640,    // sm
    TABLET: 768,    // md  
    DESKTOP: 1024,  // lg
    LARGE: 1280     // xl
  }
};

// =============  COMPUTED VALUES =============

// Generate service options for select elements
CONFIG.SERVICE_OPTIONS = CONFIG.SERVICES.map(service => ({
  value: service,
  label: `${CONFIG.SERVICE_ICONS[service] || '🔸'} ${service}`,
  icon: CONFIG.SERVICE_ICONS[service]
}));

// =============  VALIDATION FUNCTIONS =============

/**
 * Validate configuration on load
 */
function validateConfig() {
  const errors = [];
  
  // Check required URLs
  if (CONFIG.APPS_SCRIPT_URL.includes('YOUR_DEPLOYMENT_ID')) {
    errors.push('APPS_SCRIPT_URL not configured - update with your actual Google Apps Script URL');
  }
  
  if (CONFIG.GOOGLE_CLIENT_ID.includes('YOUR_CLIENT_ID')) {
    errors.push('GOOGLE_CLIENT_ID not configured - update with your actual Google OAuth Client ID');
  }
  
  // Check services list
  if (!CONFIG.SERVICES.length) {
    errors.push('No services configured');
  }
  
  // Check price settings
  if (CONFIG.PRICE.MIN >= CONFIG.PRICE.MAX) {
    errors.push('Invalid price range: MIN should be less than MAX');
  }
  
  // Log errors if any
  if (errors.length > 0) {
    console.error('❌ Configuration Errors:');
    errors.forEach(error => console.error(`  • ${error}`));
    return false;
  }
  
  console.log('✅ Configuration validated successfully');
  return true;
}

// =============  UTILITY FUNCTIONS =============

/**
 * Get current environment
 */
function getEnvironment() {
  if (location.hostname === 'localhost' || location.hostname === '127.0.0.1') {
    return 'development';
  } else if (location.hostname.includes('github.io')) {
    return 'production';
  } else {
    return 'staging';
  }
}

/**
 * Check if feature is enabled
 */
function isFeatureEnabled(featureName) {
  return CONFIG.FEATURES[featureName] === true;
}

/**
 * Get responsive breakpoint
 */
function getCurrentBreakpoint() {
  const width = window.innerWidth;
  
  if (width < CONFIG.BREAKPOINTS.MOBILE) return 'xs';
  if (width < CONFIG.BREAKPOINTS.TABLET) return 'sm'; 
  if (width < CONFIG.BREAKPOINTS.DESKTOP) return 'md';
  if (width < CONFIG.BREAKPOINTS.LARGE) return 'lg';
  return 'xl';
}

/**
 * Format currency
 */
function formatCurrency(amount) {
  if (typeof amount !== 'number') {
    amount = parseFloat(amount) || 0;
  }
  
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: CONFIG.PRICE.CURRENCY,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount);
}

/**
 * Parse currency string to number
 */
function parseCurrency(currencyString) {
  if (typeof currencyString === 'number') {
    return currencyString;
  }
  
  if (typeof currencyString === 'string') {
    // Remove currency symbols, dots, commas, spaces
    const cleaned = currencyString
      .replace(/[₫,.]/g, '')
      .replace(/\s/g, '')
      .trim();
    
    return parseFloat(cleaned) || 0;
  }
  
  return 0;
}

// =============  EXPORT FOR MODULES =============

// Make config available globally
window.CONFIG = CONFIG;
window.validateConfig = validateConfig;
window.getEnvironment = getEnvironment;
window.isFeatureEnabled = isFeatureEnabled;
window.getCurrentBreakpoint = getCurrentBreakpoint;
window.formatCurrency = formatCurrency;
window.parseCurrency = parseCurrency;

// Auto-validate config when loaded
document.addEventListener('DOMContentLoaded', () => {
  validateConfig();
  
  // Log environment info
  console.log(`🚀 Hair Salon PWA v${CONFIG.APP_VERSION}`);
  console.log(`📱 Environment: ${getEnvironment()}`);
  console.log(`🖥️  Breakpoint: ${getCurrentBreakpoint()}`);
  
  // Log feature flags
  const enabledFeatures = Object.keys(CONFIG.FEATURES)
    .filter(key => CONFIG.FEATURES[key])
    .join(', ');
  
  if (enabledFeatures) {
    console.log(`✨ Enabled features: ${enabledFeatures}`);
  }
});
