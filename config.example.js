// Configuration cho GitHub Pages
// Rename file này thành config.js và điền thông tin thực

const APP_CONFIG = {
    // Google OAuth 2.0 Client ID (từ Google Cloud Console)
    GOOGLE_CLIENT_ID: 'YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com',
    
    // Google Apps Script Web App URL (sau khi deploy)
    API_BASE_URL: 'https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec',
    
    // Danh sách email được phép truy cập (whitelist)
    ALLOWED_EMAILS: [
        'employee1@gmail.com',
        'employee2@gmail.com',
        'employee3@gmail.com',
        'employee4@gmail.com',
        'owner@gmail.com'
    ],
    
    // App Settings
    APP_NAME: 'Salon Manager',
    APP_VERSION: '1.0.0',
    
    // Cache Settings cho PWA
    CACHE_NAME: 'salon-cache-v1',
    CACHE_DURATION: 24 * 60 * 60 * 1000, // 24 hours
    
    // UI Settings
    CURRENCY: 'VNĐ',
    THOUSAND_SEPARATOR: ',',
    DECIMAL_SEPARATOR: '.',
    
    // Services list
    DEFAULT_SERVICES: [
        'Cắt tóc',
        'Gội',
        'Uốn',
        'Nhuộm',
        'Tẩy',
        'Khác'
    ],
    
    // GitHub Pages URL (để CORS whitelist)
    PRODUCTION_URL: 'https://yourusername.github.io/salon-app/',
    
    // Development mode
    DEBUG_MODE: false
};

// Freeze config to prevent modifications
Object.freeze(APP_CONFIG);
