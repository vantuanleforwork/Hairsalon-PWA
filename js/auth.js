// Authentication module using Google Identity Services (GIS)
'use strict';

const AUTH = {
    // User data
    user: null,
    accessToken: null,
    // State
    isInitialized: false,
    isAuthenticating: false,
    // Callbacks
    onLoginSuccess: null,
    onLoginError: null,
    onLogout: null
};

/**
 * Initialize Google OAuth
 */
async function initAuth(callbacks = {}) {
    // Skip if already initialized
    if (AUTH.isInitialized) return;
    
    console.log('Initializing Google Auth...');
    
    // Set callbacks
    AUTH.onLoginSuccess = callbacks.onLoginSuccess || function(user) {
        console.log('Login successful:', user);
    };
    
    AUTH.onLoginError = callbacks.onLoginError || function(error) {
        console.error('Login error:', error);
    };
    
    AUTH.onLogout = callbacks.onLogout || function() {
        console.log('User logged out');
    };
    
    // Check if Google Identity Services is loaded
    if (typeof google === 'undefined' || !google.accounts) {
        console.warn('Google Identity Services not loaded yet');
        // Will be loaded from script tag with async defer
        // We'll initialize in a callback later
        return;
    }
    
    try {
        // Get user from localStorage
        const storedUser = localStorage.getItem('user');
        if (storedUser) {
            AUTH.user = JSON.parse(storedUser);
            // Validate token here (optional)
        }
        
        // Check if config exists (might be a local test)
        if (typeof APP_CONFIG === 'undefined') {
            console.warn('App config not found, using demo mode');
            AUTH.isInitialized = true;
            return;
        }
        
        // Check if we have a client ID
        if (!APP_CONFIG.GOOGLE_CLIENT_ID || APP_CONFIG.GOOGLE_CLIENT_ID.includes('DEMO_CLIENT_ID')) {
            console.warn('Missing or demo Google Client ID');
            AUTH.isInitialized = true;
            return;
        }
        
        // Initialize Google Identity Services
        google.accounts.id.initialize({
            client_id: APP_CONFIG.GOOGLE_CLIENT_ID,
            callback: handleCredentialResponse,
            auto_select: true,
            cancel_on_tap_outside: true
        });
        
        // Ready
        AUTH.isInitialized = true;
        console.log('Auth initialized successfully');
        
        // Check if user is in allowed emails
        if (AUTH.user && isAllowedEmail(AUTH.user.email)) {
            AUTH.onLoginSuccess(AUTH.user);
        } else if (AUTH.user) {
            // User not in whitelist
            console.warn('User not in whitelist:', AUTH.user.email);
            logout();
        }
        
    } catch (error) {
        console.error('Error initializing auth:', error);
    }
}

/**
 * Handle Google Identity Services credential response
 */
function handleCredentialResponse(response) {
    console.log('Google auth response received');
    
    if (!response || !response.credential) {
        AUTH.onLoginError('No credential received');
        return;
    }
    
    try {
        // Parse JWT token from Google
        const token = response.credential;
        const payload = parseJwt(token);
        
        // Create user object
        const user = {
            id: payload.sub,
            email: payload.email,
            name: payload.name,
            picture: payload.picture,
            givenName: payload.given_name,
            familyName: payload.family_name,
            locale: payload.locale,
            token: token
        };
        
        // Check if email is allowed
        if (!isAllowedEmail(user.email)) {
            console.warn('Email not allowed:', user.email);
            AUTH.onLoginError(`Email ${user.email} không được phép truy cập ứng dụng. Liên hệ admin.`);
            return;
        }
        
        // Save user
        AUTH.user = user;
        AUTH.accessToken = token;
        localStorage.setItem('user', JSON.stringify(user));
        
        // Callback
        AUTH.onLoginSuccess(user);
        
    } catch (error) {
        console.error('Error processing auth response:', error);
        AUTH.onLoginError('Lỗi xác thực. Vui lòng thử lại.');
    }
}

/**
 * Render the Google Sign In button
 */
function renderLoginButton(element) {
    if (!AUTH.isInitialized || !google?.accounts?.id) {
        console.warn('Auth not initialized yet');
        return;
    }
    
    try {
        google.accounts.id.renderButton(element, {
            type: 'standard',
            size: 'large',
            text: 'signin_with',
            shape: 'rectangular',
            logo_alignment: 'left',
            theme: 'outline'
        });
    } catch (error) {
        console.error('Error rendering login button:', error);
    }
}

/**
 * Log in with Google (prompt)
 */
function login() {
    if (!AUTH.isInitialized) {
        console.warn('Auth not initialized');
        return;
    }
    
    if (AUTH.isAuthenticating) {
        console.warn('Authentication already in progress');
        return;
    }
    
    AUTH.isAuthenticating = true;
    
    try {
        if (typeof google !== 'undefined' && google.accounts) {
            google.accounts.id.prompt((notification) => {
                if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
                    // Try to display the UI manually
                    console.log('OAuth prompt not displayed, showing manual login');
                    // Alternative: use One Tap UI or redirect to Google login
                    AUTH.isAuthenticating = false;
                }
            });
        } else {
            // Fallback to mock login for development
            console.warn('Google Identity Services not available, using mock login');
            mockLogin();
            AUTH.isAuthenticating = false;
        }
    } catch (error) {
        console.error('Error during login:', error);
        AUTH.isAuthenticating = false;
        AUTH.onLoginError('Lỗi đăng nhập. Vui lòng thử lại.');
    }
}

/**
 * Log out
 */
function logout() {
    // Clear auth state
    AUTH.user = null;
    AUTH.accessToken = null;
    
    // Clear localStorage
    localStorage.removeItem('user');
    
    // Google logout (optional)
    if (typeof google !== 'undefined' && google.accounts) {
        google.accounts.id.disableAutoSelect();
    }
    
    // Callback
    AUTH.onLogout();
}

/**
 * Get current user
 */
function getCurrentUser() {
    return AUTH.user;
}

/**
 * Check if user is authenticated
 */
function isAuthenticated() {
    return !!AUTH.user;
}

/**
 * Check if email is allowed
 */
function isAllowedEmail(email) {
    // If no config or no whitelist, allow all emails
    if (typeof APP_CONFIG === 'undefined' || !APP_CONFIG.ALLOWED_EMAILS) {
        return true;
    }
    
    // Check whitelist
    return APP_CONFIG.ALLOWED_EMAILS.includes(email);
}

/**
 * Parse JWT token
 */
function parseJwt(token) {
    try {
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
            return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
        }).join(''));

        return JSON.parse(jsonPayload);
    } catch (error) {
        console.error('Error parsing JWT token:', error);
        return {};
    }
}

/**
 * Mock login for development
 */
function mockLogin() {
    console.warn('Using mock login - FOR DEVELOPMENT ONLY');
    
    const mockUser = {
        id: 'mock-123',
        email: 'demo@salon.com',
        name: 'Demo User',
        picture: 'https://via.placeholder.com/100',
        givenName: 'Demo',
        familyName: 'User',
        locale: 'vi',
        token: 'mock-token'
    };
    
    AUTH.user = mockUser;
    localStorage.setItem('user', JSON.stringify(mockUser));
    AUTH.onLoginSuccess(mockUser);
}

// Export functions to global scope
window.AUTH = {
    init: initAuth,
    login: login,
    logout: logout,
    renderLoginButton: renderLoginButton,
    getCurrentUser: getCurrentUser,
    isAuthenticated: isAuthenticated,
    isAllowedEmail: isAllowedEmail,
    handleCredentialResponse: handleCredentialResponse
};

// Also export individual functions
window.initAuth = initAuth;
window.handleCredentialResponse = handleCredentialResponse;
