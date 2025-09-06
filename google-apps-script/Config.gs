/**
 * Configuration file for Hair Salon Management System
 * IMPORTANT: Keep this file private - contains sensitive data
 * 
 * @version 1.0.0
 */

const CONFIG = {
  // Environment
  ENV: 'development', // 'development' or 'production'
  
  // Google Sheets Configuration
  SPREADSHEET_ID: 'YOUR_SPREADSHEET_ID_HERE', // Replace with your actual spreadsheet ID
  SHEET_NAMES: {
    ORDERS: 'Orders',
    STAFF: 'Staff'
  },
  
  // Column mappings for Orders sheet
  ORDER_COLUMNS: {
    ID: 0,           // Column A
    TIMESTAMP: 1,    // Column B
    STAFF: 2,        // Column C
    SERVICE: 3,      // Column D
    PRICE: 4,        // Column E
    NOTE: 5,         // Column F
    STATUS: 6        // Column G
  },
  
  // Column mappings for Staff sheet
  STAFF_COLUMNS: {
    EMAIL: 0,        // Column A
    NAME: 1,         // Column B
    ROLE: 2,         // Column C
    ACTIVE: 3        // Column D
  },
  
  // Allowed email addresses (whitelist)
  ALLOWED_EMAILS: [
    'owner@gmail.com',      // Owner/Admin
    'staff1@gmail.com',     // Staff 1
    'staff2@gmail.com',     // Staff 2
    'staff3@gmail.com',     // Staff 3
    'staff4@gmail.com',     // Staff 4
    // Add more staff emails as needed
  ],
  
  // Admin emails (have special permissions)
  ADMIN_EMAILS: [
    'owner@gmail.com'
  ],
  
  // Allowed domains for CORS
  ALLOWED_DOMAINS: [
    'https://yourusername.github.io', // Replace with your GitHub Pages URL
    'http://localhost:8080',          // For local development
    'http://127.0.0.1:8080'          // For local development
  ],
  
  // Rate limiting
  MAX_REQUESTS_PER_MINUTE: 30,
  
  // Service options
  SERVICES: [
    'Cắt tóc',
    'Xả',
    'Uốn',
    'Nhuộm',
    'Tẩy',
    'Duỗi',
    'Khác'
  ],
  
  // Price constraints (VND)
  PRICE: {
    MIN: 0,
    MAX: 10000000, // 10 million VND
    DEFAULT: 100000
  },
  
  // Order constraints
  ORDER: {
    MAX_NOTE_LENGTH: 500,
    MAX_ORDERS_PER_DAY: 100,
    ALLOW_FUTURE_ORDERS: false
  },
  
  // Time zone
  TIMEZONE: 'Asia/Ho_Chi_Minh',
  
  // Logging
  ENABLE_LOGGING: true,
  LOG_LEVEL: 'INFO', // 'DEBUG', 'INFO', 'WARN', 'ERROR'
  
  // Cache settings (in seconds)
  CACHE_DURATION: {
    STAFF: 3600,    // 1 hour
    ORDERS: 60,     // 1 minute
    STATS: 300      // 5 minutes
  }
};

/**
 * Get spreadsheet instance
 */
function getSpreadsheet() {
  try {
    return SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  } catch (error) {
    console.error('Error opening spreadsheet:', error);
    throw new Error('Failed to open spreadsheet. Check SPREADSHEET_ID in Config.gs');
  }
}

/**
 * Get sheet by name
 */
function getSheet(sheetName) {
  const spreadsheet = getSpreadsheet();
  const sheet = spreadsheet.getSheetByName(sheetName);
  
  if (!sheet) {
    throw new Error(`Sheet "${sheetName}" not found`);
  }
  
  return sheet;
}

/**
 * Initialize sheets if they don't exist
 */
function initializeSheets() {
  const spreadsheet = getSpreadsheet();
  
  // Check and create Orders sheet
  let ordersSheet = spreadsheet.getSheetByName(CONFIG.SHEET_NAMES.ORDERS);
  if (!ordersSheet) {
    ordersSheet = spreadsheet.insertSheet(CONFIG.SHEET_NAMES.ORDERS);
    
    // Set headers
    const headers = ['ID', 'Timestamp', 'Staff', 'Service', 'Price', 'Note', 'Status'];
    ordersSheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    
    // Format headers
    ordersSheet.getRange(1, 1, 1, headers.length)
      .setBackground('#4A5568')
      .setFontColor('#FFFFFF')
      .setFontWeight('bold');
    
    // Set column widths
    ordersSheet.setColumnWidth(1, 150); // ID
    ordersSheet.setColumnWidth(2, 180); // Timestamp
    ordersSheet.setColumnWidth(3, 200); // Staff
    ordersSheet.setColumnWidth(4, 150); // Service
    ordersSheet.setColumnWidth(5, 120); // Price
    ordersSheet.setColumnWidth(6, 300); // Note
    ordersSheet.setColumnWidth(7, 100); // Status
  }
  
  // Check and create Staff sheet
  let staffSheet = spreadsheet.getSheetByName(CONFIG.SHEET_NAMES.STAFF);
  if (!staffSheet) {
    staffSheet = spreadsheet.insertSheet(CONFIG.SHEET_NAMES.STAFF);
    
    // Set headers
    const headers = ['Email', 'Name', 'Role', 'Active'];
    staffSheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    
    // Format headers
    staffSheet.getRange(1, 1, 1, headers.length)
      .setBackground('#4A5568')
      .setFontColor('#FFFFFF')
      .setFontWeight('bold');
    
    // Set column widths
    staffSheet.setColumnWidth(1, 250); // Email
    staffSheet.setColumnWidth(2, 200); // Name
    staffSheet.setColumnWidth(3, 150); // Role
    staffSheet.setColumnWidth(4, 100); // Active
    
    // Add sample staff data
    const sampleStaff = CONFIG.ALLOWED_EMAILS.map(email => [
      email,
      email.split('@')[0], // Use email prefix as name
      email === CONFIG.ADMIN_EMAILS[0] ? 'Admin' : 'Staff',
      'TRUE'
    ]);
    
    if (sampleStaff.length > 0) {
      staffSheet.getRange(2, 1, sampleStaff.length, 4).setValues(sampleStaff);
    }
  }
  
  return {
    ordersSheet,
    staffSheet
  };
}

/**
 * Format currency (VND)
 */
function formatCurrency(amount) {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND'
  }).format(amount);
}

/**
 * Get current timestamp in configured timezone
 */
function getCurrentTimestamp() {
  return Utilities.formatDate(
    new Date(),
    CONFIG.TIMEZONE,
    "yyyy-MM-dd'T'HH:mm:ss"
  );
}

/**
 * Generate unique ID
 */
function generateId() {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 9);
  return `ORD-${timestamp}-${random}`.toUpperCase();
}

/**
 * Logger utility
 */
const Logger = {
  debug: function(message, data) {
    if (CONFIG.ENABLE_LOGGING && ['DEBUG'].includes(CONFIG.LOG_LEVEL)) {
      console.log('[DEBUG]', message, data || '');
    }
  },
  
  info: function(message, data) {
    if (CONFIG.ENABLE_LOGGING && ['DEBUG', 'INFO'].includes(CONFIG.LOG_LEVEL)) {
      console.info('[INFO]', message, data || '');
    }
  },
  
  warn: function(message, data) {
    if (CONFIG.ENABLE_LOGGING && ['DEBUG', 'INFO', 'WARN'].includes(CONFIG.LOG_LEVEL)) {
      console.warn('[WARN]', message, data || '');
    }
  },
  
  error: function(message, data) {
    if (CONFIG.ENABLE_LOGGING) {
      console.error('[ERROR]', message, data || '');
    }
  }
};
