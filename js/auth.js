// Simple Authentication Module
'use strict';

console.log('🔐 Loading auth module...');

// Global auth state
window.AUTH_STATE = {
    user: null,
    isLoggedIn: false
};

// Simple init function
window.initAuth = function(callbacks = {}) {
    console.log('⚙️ Initializing simple auth...');
    
    // Store callbacks globally
    window.authCallbacks = callbacks;
    
    // Check for existing user
    const savedUser = localStorage.getItem('user');
    if (savedUser) {
        try {
            const user = JSON.parse(savedUser);
            // Check if email is allowed
            if (isEmailAllowed(user.email)) {
                window.AUTH_STATE.user = user;
                window.AUTH_STATE.isLoggedIn = true;
                console.log('✅ Found saved user:', user.email);
                if (callbacks.onLoginSuccess) {
                    callbacks.onLoginSuccess(user);
                }
                return;
            } else {
                // Remove invalid user
                localStorage.removeItem('user');
            }
        } catch (e) {
            localStorage.removeItem('user');
        }
    }
    
    console.log('📝 No valid saved user found');
};

// Simple login function
window.loginWithGoogle = function() {
    console.log('🚀 Starting Google login...');
    
    // Check if Google is available
    if (typeof google === 'undefined' || !google.accounts) {
        console.warn('⚠️ Google not available, using mock login');
        mockLogin();
        return;
    }
    
    // Check if we have client ID
    if (!window.APP_CONFIG || !window.APP_CONFIG.GOOGLE_CLIENT_ID || 
        window.APP_CONFIG.GOOGLE_CLIENT_ID.includes('DEMO_ID')) {  // Fixed: check for DEMO_ID not DEMO
        console.warn('⚠️ No valid client ID, using mock login');
        mockLogin();
        return;
    }
    
    try {
        console.log('⚙️ Initializing Google OAuth with Client ID:', window.APP_CONFIG.GOOGLE_CLIENT_ID.substring(0, 20) + '...');
        
        // Initialize Google OAuth
        google.accounts.id.initialize({
            client_id: window.APP_CONFIG.GOOGLE_CLIENT_ID,
            callback: window.handleGoogleCallback,
            auto_select: false,
            cancel_on_tap_outside: false
        });
        
        // Try popup flow first (more reliable than One Tap)
        try {
            // Create a temporary button for popup
            const tempDiv = document.createElement('div');
            tempDiv.style.display = 'none';
            document.body.appendChild(tempDiv);
            
            google.accounts.id.renderButton(tempDiv, {
                theme: 'outline',
                size: 'large',
                type: 'standard'
            });
            
            // Trigger the button click
            setTimeout(() => {
                const button = tempDiv.querySelector('div[role="button"]');
                if (button) {
                    button.click();
                } else {
                    // Fallback to One Tap if button render fails
                    console.log('🔄 Button render failed, trying One Tap...');
                    google.accounts.id.prompt((notification) => {
                        if (notification.isNotDisplayed()) {
                            console.log('⚠️ One Tap not displayed, creating custom popup');
                            // If One Tap also fails, create a custom popup
                            createCustomOAuthPopup();
                        }
                    });
                }
                document.body.removeChild(tempDiv);
            }, 100);
            
        } catch (buttonError) {
            console.log('⚠️ Button render failed, trying One Tap:', buttonError.message);
            // Fallback to One Tap
            google.accounts.id.prompt((notification) => {
                if (notification.isNotDisplayed()) {
                    console.log('⚠️ One Tap not displayed, using custom popup');
                    createCustomOAuthPopup();
                }
            });
        }
        
    } catch (error) {
        console.error('❌ Google login error:', error);
        console.log('🎭 Falling back to mock login due to OAuth error');
        mockLogin();
    }
};

// Google OAuth callback
window.handleGoogleCallback = function(response) {
    console.log('🔐 Google callback received');
    
    if (!response || !response.credential) {
        console.error('❌ No credential received');
        showError('Lỗi đăng nhập. Vui lòng thử lại.');
        return;
    }
    
    try {
        // Parse JWT
        const token = response.credential;
        const payload = parseJWT(token);
        
        console.log('📝 Parsed user email:', payload.email);
        
        // Check email whitelist
        if (!isEmailAllowed(payload.email)) {
            console.warn('❌ Email not allowed:', payload.email);
            showError(`Email ${payload.email} không được phép truy cập. Liên hệ admin.`);
            return;
        }
        
        // Create user object
        const user = {
            id: payload.sub,
            email: payload.email,
            name: payload.name || payload.email,
            picture: payload.picture,
            token: token
        };
        
        // Save user
        window.AUTH_STATE.user = user;
        window.AUTH_STATE.isLoggedIn = true;
        localStorage.setItem('user', JSON.stringify(user));
        
        console.log('✅ Login successful:', user.name);
        
        // Call success callback
        if (window.authCallbacks && window.authCallbacks.onLoginSuccess) {
            window.authCallbacks.onLoginSuccess(user);
        }
        
    } catch (error) {
        console.error('❌ Error processing login:', error);
        showError('Lỗi xử lý đăng nhập.');
    }
};

// Simple logout
window.logoutUser = function() {
    console.log('💪 Logging out...');
    
    // Clear state
    window.AUTH_STATE.user = null;
    window.AUTH_STATE.isLoggedIn = false;
    localStorage.removeItem('user');
    
    // Google logout
    if (typeof google !== 'undefined' && google.accounts) {
        google.accounts.id.disableAutoSelect();
    }
    
    // Call logout callback
    if (window.authCallbacks && window.authCallbacks.onLogout) {
        window.authCallbacks.onLogout();
    }
    
    console.log('✅ Logout complete');
};

// Check if email is allowed
function isEmailAllowed(email) {
    if (!window.APP_CONFIG || !window.APP_CONFIG.ALLOWED_EMAILS) {
        return true; // Allow all if no config
    }
    return window.APP_CONFIG.ALLOWED_EMAILS.includes(email);
}

// Parse JWT token
function parseJWT(token) {
    try {
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(
            atob(base64)
                .split('')
                .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
                .join('')
        );
        return JSON.parse(jsonPayload);
    } catch (error) {
        throw new Error('Invalid JWT token');
    }
}

// Custom OAuth popup for fallback
function createCustomOAuthPopup() {
    console.log('📱 Creating custom OAuth popup...');
    
    try {
        // Create OAuth URL
        const oauthUrl = `https://accounts.google.com/oauth/authorize?` +
            `client_id=${encodeURIComponent(window.APP_CONFIG.GOOGLE_CLIENT_ID)}&` +
            `redirect_uri=${encodeURIComponent(window.location.origin)}&` +
            `response_type=id_token&` +
            `scope=openid email profile&` +
            `nonce=${Date.now()}`;
        
        // Open popup
        const popup = window.open(
            oauthUrl,
            'googleOAuth',
            'width=500,height=600,scrollbars=yes,resizable=yes'
        );
        
        if (popup) {
            console.log('✅ OAuth popup opened');
            
            // Check for popup closure
            const checkClosed = setInterval(() => {
                if (popup.closed) {
                    clearInterval(checkClosed);
                    console.log('⚠️ OAuth popup closed without completing login');
                    // Don't auto-fallback to mock - let user try again
                }
            }, 1000);
            
            // Auto-close popup after 60 seconds
            setTimeout(() => {
                if (!popup.closed) {
                    popup.close();
                    clearInterval(checkClosed);
                    console.log('⏰ OAuth popup timed out');
                }
            }, 60000);
        } else {
            throw new Error('Popup blocked by browser');
        }
        
    } catch (error) {
        console.error('❌ Custom OAuth popup failed:', error);
        console.log('🎭 Falling back to mock login');
        mockLogin();
    }
}

// Mock login for development
function mockLogin() {
    console.log('🎭 Using mock login');
    
    const mockUser = {
        id: 'mock-123',
        email: 'demo@salon.com',
        name: 'Demo User',
        picture: null,
        token: 'mock-token'
    };
    
    window.AUTH_STATE.user = mockUser;
    window.AUTH_STATE.isLoggedIn = true;
    localStorage.setItem('user', JSON.stringify(mockUser));
    
    if (window.authCallbacks && window.authCallbacks.onLoginSuccess) {
        window.authCallbacks.onLoginSuccess(mockUser);
    }
}

// Show error message
function showError(message) {
    if (window.showToast) {
        window.showToast(message, 'error');
    } else if (window.authCallbacks && window.authCallbacks.onLoginError) {
        window.authCallbacks.onLoginError(message);
    } else {
        alert(message);
    }
}

// Create AUTH object for backward compatibility
window.AUTH = {
    init: window.initAuth,
    login: window.loginWithGoogle,
    logout: window.logoutUser,
    isAuthenticated: () => window.AUTH_STATE.isLoggedIn,
    getCurrentUser: () => window.AUTH_STATE.user
};

console.log('✅ Simple auth module loaded');
console.log('✅ Available functions:', Object.keys(window.AUTH));
