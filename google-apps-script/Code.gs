/**
 * Salon Manager - Google Apps Script Backend
 * Version: 1.0.0
 * 
 * This script serves as the backend API for the Salon Manager PWA
 * It handles CRUD operations with Google Sheets as the database
 */

// Configuration
const CONFIG = {
  SPREADSHEET_ID: '1dqxdNQTdIvf7mccYMW825Xiuck-vK3kOOcHkn-YCphU', // Set by Codex
  SHEET_NAME: 'Orders',
  GOOGLE_CLIENT_ID: '36454863313-tlsos46mj2a63sa6k4hjralerarugtku.apps.googleusercontent.com',
  ALLOWED_ORIGINS: [
    'http://localhost:5500',
    'http://127.0.0.1:5500',
    'http://localhost:8080',
    'http://127.0.0.1:8080',
    'https://vantuanleforwork.github.io' // Replace with your GitHub Pages URL
  ],
  MAX_ORDERS_PER_REQUEST: 100,
  TIMEZONE: 'Asia/Ho_Chi_Minh'
};

/** Verify Google ID Token and return email (or null) */
function verifyIdToken(idToken) {
  try {
    if (!idToken) return null;
    var url = 'https://oauth2.googleapis.com/tokeninfo?id_token=' + encodeURIComponent(idToken);
    var res = UrlFetchApp.fetch(url, { muteHttpExceptions: true });
    if (res.getResponseCode() !== 200) return null;
    var info = JSON.parse(res.getContentText() || '{}');
    var audOk = info && info.aud === CONFIG.GOOGLE_CLIENT_ID;
    var email = info && info.email;
    var verified = (info && (info.email_verified === true || info.email_verified === 'true'));
    if (audOk && email && verified) return String(email).toLowerCase();
    return null;
  } catch (e) {
    return null;
  }
}

// Column indices (0-based)
const COLUMNS = {
  ID: 0,           // A
  TIMESTAMP: 1,    // B
  EMPLOYEE: 2,     // C
  SERVICE: 3,      // D
  PRICE: 4,        // E
  NOTES: 5,        // F
  STATUS: 6,       // G
  CREATED_BY: 7,   // H
  MODIFIED_AT: 8   // I
};

/**
 * Initialize the spreadsheet with headers if empty
 */
function initializeSheet() {
  const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  let sheet = ss.getSheetByName(CONFIG.SHEET_NAME);
  
  if (!sheet) {
    sheet = ss.insertSheet(CONFIG.SHEET_NAME);
    const headers = [
      'ID',
      'Timestamp',
      'Employee',
      'Service',
      'Price',
      'Notes',
      'Status',
      'Created By',
      'Modified At'
    ];
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold');
    sheet.setFrozenRows(1);
  }
  
  return sheet;
}

/**
 * Handle GET requests
 */
function doGet(e) {
  try {
    const params = e.parameter;
    const action = params.action || 'orders';

    // Require valid idToken for protected endpoints
    if (action !== 'health') {
      var email = verifyIdToken(params && params.idToken);
      if (!email) return createResponse({ error: 'Unauthorized' }, 401);
      // attach for downstream filtering
      params._email = email;
    }
    
    let result;
    switch(action) {
      case 'orders':
        result = getOrders(params);
        break;
      case 'stats':
        result = getStats(params);
        break;
      case 'health':
        result = { status: 'OK', timestamp: new Date().toISOString() };
        break;
      default:
        result = { error: 'Invalid action' };
    }
    // Support JSONP to bypass CORS for static frontends
    if (params && params.callback) {
      var cb = String(params.callback).replace(/[^\w\.$]/g, '');
      var payload = cb + '(' + JSON.stringify(result) + ')';
      return ContentService.createTextOutput(payload)
        .setMimeType(ContentService.MimeType.JAVASCRIPT);
    }

    return createResponse(result);
  } catch (error) {
    console.error('Error in doGet:', error);
    return createResponse({ error: error.toString() }, 500);
  }
}

/**
 * Handle POST requests
 */
function doPost(e) {
  try {
    var data = {};
    try {
      var ct = (e && e.postData && e.postData.type) || '';
      if (ct.indexOf('application/x-www-form-urlencoded') >= 0) {
        data = e.parameter || {};
      } else if (ct.indexOf('application/json') >= 0) {
        data = JSON.parse(e.postData.contents || '{}');
      } else {
        // Fallback: try parameter first then JSON parse
        data = (e && e.parameter && Object.keys(e.parameter).length) ? e.parameter : JSON.parse(e.postData && e.postData.contents || '{}');
      }
    } catch (parseErr) {
      console.warn('POST body parse warning:', parseErr);
      data = (e && e.parameter) || {};
    }

    var action = data.action || 'create';

    // Check origin for CORS (best-effort)
    var origin = (e && e.parameter && e.parameter.origin) || (e && e.headers && e.headers.Origin);
    if (!isAllowedOrigin(origin)) {
      return createResponse({ error: 'Unauthorized origin' }, 403);
    }

    // Verify idToken and get caller email
    var callerEmail = verifyIdToken((data && data.idToken) || (e && e.parameter && e.parameter.idToken));
    if (!callerEmail) return createResponse({ error: 'Unauthorized' }, 401);
    
    var result;
    switch(action) {
      case 'create':
        result = createOrder({ ...data, _email: callerEmail });
        break;
      case 'update':
        result = updateOrder({ ...data, _email: callerEmail });
        break;
      case 'delete':
        result = deleteOrder({ ...data, _email: callerEmail });
        break;
      default:
        result = { error: 'Invalid action' };
    }
    
    return createResponse(result);
  } catch (error) {
    console.error('Error in doPost:', error);
    return createResponse({ error: error.toString() }, 500);
  }
}

/**
 * Create a new order
 */
function createOrder(data) {
  const sheet = initializeSheet();
  const id = generateOrderId();
  const timestamp = new Date().toLocaleString('vi-VN', { timeZone: CONFIG.TIMEZONE });
  var createdBy = (data && data._email) || (data && data.createdBy) || (data && data.employee) || 'Unknown';
  
  const newRow = [
    id,
    timestamp,
    data.employee || createdBy || 'Unknown',
    data.service || '',
    data.price || 0,
    data.notes || '',
    'active',
    createdBy,
    timestamp
  ];
  
  sheet.appendRow(newRow);
  
  return {
    success: true,
    order: {
      id: id,
      timestamp: timestamp,
      employee: data.employee || createdBy,
      service: data.service,
      price: data.price,
      notes: data.notes,
      status: 'active'
    }
  };
}

/**
 * Get orders with optional filters
 */
function getOrders(params) {
  const sheet = initializeSheet();
  const data = sheet.getDataRange().getValues();
  var requester = params && params._email;
  
  if (data.length <= 1) {
    return { orders: [], total: 0 };
  }
  
  // Skip header row
  const orders = [];
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    
    // Skip if deleted
    if (row[COLUMNS.STATUS] === 'deleted') continue;

    // Enforce ownership: only return caller's orders
    if (requester && String(row[COLUMNS.CREATED_BY]).toLowerCase() !== String(requester).toLowerCase()) {
      continue;
    }
    
    // Apply date filter if provided
    if (params.date) {
      const orderDate = new Date(row[COLUMNS.TIMESTAMP]).toDateString();
      const filterDate = new Date(params.date).toDateString();
      if (orderDate !== filterDate) continue;
    }
    
    // Apply employee filter if provided
    if (params.employee && row[COLUMNS.EMPLOYEE] !== params.employee) {
      continue;
    }
    
    orders.push({
      id: row[COLUMNS.ID],
      timestamp: row[COLUMNS.TIMESTAMP],
      employee: row[COLUMNS.EMPLOYEE],
      service: row[COLUMNS.SERVICE],
      price: row[COLUMNS.PRICE],
      notes: row[COLUMNS.NOTES],
      status: row[COLUMNS.STATUS]
    });
    
    // Limit results
    if (orders.length >= CONFIG.MAX_ORDERS_PER_REQUEST) break;
  }
  
  // Sort by timestamp descending (newest first)
  orders.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  
  return {
    orders: orders,
    total: orders.length
  };
}

/**
 * Get statistics
 */
function getStats(params) {
  const sheet = initializeSheet();
  const data = sheet.getDataRange().getValues();
  var requester = params && params._email;
  
  if (data.length <= 1) {
    return {
      todayCount: 0,
      todayRevenue: 0,
      monthRevenue: 0,
      totalOrders: 0
    };
  }
  
  const today = new Date().toDateString();
  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();
  
  let todayCount = 0;
  let todayRevenue = 0;
  let monthRevenue = 0;
  let totalOrders = 0;
  
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    
    // Skip deleted orders
    if (row[COLUMNS.STATUS] === 'deleted') continue;

    // Enforce ownership
    if (requester && String(row[COLUMNS.CREATED_BY]).toLowerCase() !== String(requester).toLowerCase()) {
      continue;
    }
    
    const orderDate = new Date(row[COLUMNS.TIMESTAMP]);
    var priceRaw = row[COLUMNS.PRICE];
    var price = 0;
    if (typeof priceRaw === 'number') {
      price = priceRaw;
    } else if (priceRaw != null) {
      var digits = String(priceRaw).replace(/\D+/g, '');
      price = digits ? parseInt(digits, 10) : 0;
    }
    
    totalOrders++;
    
    // Today's stats
    if (orderDate.toDateString() === today) {
      todayCount++;
      todayRevenue += price;
    }
    
    // Month's stats
    if (orderDate.getMonth() === currentMonth && orderDate.getFullYear() === currentYear) {
      monthRevenue += price;
    }
  }
  
  return {
    todayCount: todayCount,
    todayRevenue: todayRevenue,
    monthRevenue: monthRevenue,
    totalOrders: totalOrders,
    lastUpdated: new Date().toISOString()
  };
}

/**
 * Update an order (mainly for marking as deleted)
 */
function updateOrder(data) {
  const sheet = initializeSheet();
  const dataRange = sheet.getDataRange();
  const values = dataRange.getValues();
  
  for (let i = 1; i < values.length; i++) {
    if (values[i][COLUMNS.ID] === data.id) {
      // Update status to deleted (soft delete)
      sheet.getRange(i + 1, COLUMNS.STATUS + 1).setValue('deleted');
      sheet.getRange(i + 1, COLUMNS.MODIFIED_AT + 1).setValue(
        new Date().toLocaleString('vi-VN', { timeZone: CONFIG.TIMEZONE })
      );
      
      return {
        success: true,
        message: 'Order marked as deleted',
        id: data.id
      };
    }
  }
  
  return {
    success: false,
    error: 'Order not found'
  };
}

/**
 * Delete an order (soft delete)
 */
function deleteOrder(data) {
  var sheet = initializeSheet();
  var values = sheet.getDataRange().getValues();
  var requester = data && data._email;

  for (var i = 1; i < values.length; i++) {
    if (values[i][COLUMNS.ID] === data.id) {
      // Only owner can delete
      if (requester && String(values[i][COLUMNS.CREATED_BY]).toLowerCase() !== String(requester).toLowerCase()) {
        return { success: false, error: 'Forbidden' };
      }
      sheet.deleteRow(i + 1);
      return { success: true, message: 'Order row deleted', id: data.id };
    }
  }

  return { success: false, error: 'Order not found' };
}

/**
 * Generate unique order ID
 */
function generateOrderId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
}

/**
 * Check if origin is allowed (CORS)
 */
function isAllowedOrigin(origin) {
  if (!origin) return true; // Allow if no origin (e.g., direct access)
  return CONFIG.ALLOWED_ORIGINS.some(allowed => origin.startsWith(allowed));
}

/**
 * Create JSON response with CORS headers
 */
function createResponse(data, status = 200) {
  const output = ContentService.createTextOutput(JSON.stringify(data));
  output.setMimeType(ContentService.MimeType.JSON);
  
  // Add CORS headers
  return output;
}

/**
 * Handle CORS preflight requests
 */
function doOptions(e) {
  return ContentService.createTextOutput('')
    .setMimeType(ContentService.MimeType.TEXT);
}

/**
 * Test function for development
 */
function testAPI() {
  // Initialize sheet
  initializeSheet();
  
  // Test create order
  const testOrder = {
    employee: 'test@salon.com',
    service: 'Cắt tóc',
    price: 150000,
    notes: 'Test order',
    createdBy: 'test@salon.com'
  };
  
  const result = createOrder(testOrder);
  console.log('Create result:', result);
  
  // Test get orders
  const orders = getOrders({});
  console.log('Orders:', orders);
  
  // Test get stats
  const stats = getStats({});
  console.log('Stats:', stats);
}
