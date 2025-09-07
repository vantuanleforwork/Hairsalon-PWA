// Salon Manager PWA Configuration

const APP_CONFIG = {
    // Google OAuth 2.0 Client ID
    GOOGLE_CLIENT_ID: '36454863313-tlsos46mj2a63sa6k4hjralerarugtku.apps.googleusercontent.com',
    
    // Google Apps Script Web App URL (sau khi deploy)
    API_BASE_URL: 'https://script.google.com/macros/s/AKfycbzEZneloVbMU027zmziwnr0TCDj5hkZppFHaUoORyPybQN6IO8xCakqrhzue74jfHiE/exec',
    
    // Danh sách email được phép truy cập (whitelist)
    ALLOWED_EMAILS: [
        'vantuanleforwork@gmail.com',
        'vantuanle2002@gmail.com', 
        'v4ntu4nl3@gmail.com',
        'phonghominh8@gmail.com'
        // Add more emails as needed
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
    PRODUCTION_URL: 'https://vantuanleforwork.github.io/Hairsalon-PWA/',
    
    // Development mode
    DEBUG_MODE: false
};

// Freeze config to prevent modifications
Object.freeze(APP_CONFIG);

// Expose config globally so other scripts (auth.js, api.js) can access it
// Note: const/let do not attach to window in browsers; assign explicitly.
try {
    if (typeof window !== 'undefined') {
        window.APP_CONFIG = APP_CONFIG;
    } else if (typeof globalThis !== 'undefined') {
        globalThis.APP_CONFIG = APP_CONFIG;
    }
} catch (_) {
    // Ignore if window/globalThis not available in current context
}

// Debug info
console.log('🔧 Config loaded:', {
    hasClientId: !!APP_CONFIG.GOOGLE_CLIENT_ID && !APP_CONFIG.GOOGLE_CLIENT_ID.includes('DEMO'),
    clientIdPreview: APP_CONFIG.GOOGLE_CLIENT_ID?.substring(0, 20) + '...',
    allowedEmails: APP_CONFIG.ALLOWED_EMAILS?.length || 0,
    productionUrl: APP_CONFIG.PRODUCTION_URL,
    currentUrl: window.location.href,
    isDemo: APP_CONFIG.DEBUG_MODE
});
