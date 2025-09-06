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
        window.APP_CONFIG.GOOGLE_CLIENT_ID.includes('DEMO')) {
        console.warn('⚠️ No valid client ID, using mock login');
        mockLogin();
        return;
    }
    
    try {
        // Initialize Google OAuth
        google.accounts.id.initialize({
            client_id: window.APP_CONFIG.GOOGLE_CLIENT_ID,
            callback: handleGoogleCallback
        });
        
        // Show One Tap or fallback
        google.accounts.id.prompt((notification) => {
            if (notification.isNotDisplayed()) {
                console.log('⚠️ One Tap not displayed, trying render button');
            }
        });
        
    } catch (error) {
        console.error('❌ Google login error:', error);
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
 * This function is called by Google OAuth when user completes login
 */
function handleCredentialResponse(response) {
    console.log('🔐 Google OAuth response received');
    
    if (!response || !response.credential) {
        console.error('❌ No credential received');
        if (AUTH.onLoginError) AUTH.onLoginError('No credential received');
        return;
    }
    
    try {
        // Parse JWT token from Google
        const token = response.credential;
        const payload = parseJwt(token);
        
        console.log('✅ JWT parsed, user email:', payload.email);
        
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
            console.warn('❌ Email not allowed:', user.email);
            const errorMsg = `Email ${user.email} không được phép truy cập ứng dụng. Liên hệ admin.`;
            if (AUTH.onLoginError) {
                AUTH.onLoginError(errorMsg);
            } else if (window.showToast) {
                window.showToast(errorMsg, 'error');
            } else {
                alert(errorMsg);
            }
            return;
        }
        
        // Save user
        AUTH.user = user;
        AUTH.accessToken = token;
        localStorage.setItem('user', JSON.stringify(user));
        
        console.log('✅ User authenticated successfully:', user.name);
        
        // Callback - try multiple ways to ensure it works
        if (AUTH.onLoginSuccess) {
            AUTH.onLoginSuccess(user);
        } else if (window.handleAuthSuccess) {
            window.handleAuthSuccess(user);
        } else {
            // Direct fallback
            console.log('📢 Calling direct login success');
            if (window.APP_STATE) {
                window.APP_STATE.user = user;
            }
            if (window.showMainApp) {
                window.showMainApp();
            }
            if (window.showToast) {
                window.showToast(`Xin chào ${user.name || user.email}!`, 'success');
            }
        }
        
    } catch (error) {
        console.error('❌ Error processing auth response:', error);
        const errorMsg = 'Lỗi xác thực. Vui lòng thử lại.';
        if (AUTH.onLoginError) {
            AUTH.onLoginError(errorMsg);
        } else if (window.showToast) {
            window.showToast(errorMsg, 'error');
        } else {
            alert(errorMsg);
        }
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

// Add functions to existing AUTH object
if (typeof window !== 'undefined' && window.AUTH) {
    // Add all functions to the existing AUTH object
    Object.assign(window.AUTH, {
        init: initAuth,
        login: login,
        logout: logout,
        renderLoginButton: renderLoginButton,
        getCurrentUser: getCurrentUser,
        isAuthenticated: isAuthenticated,
        isAllowedEmail: isAllowedEmail,
        handleCredentialResponse: handleCredentialResponse
    });
    
    // Also export individual functions for fallback
    window.initAuth = initAuth;
    window.handleCredentialResponse = handleCredentialResponse;
    
    console.log('✅ AUTH functions added:', Object.keys(window.AUTH));
    console.log('✅ AUTH.init type:', typeof window.AUTH.init);
    console.log('✅ AUTH.login type:', typeof window.AUTH.login);
} else {
    console.error('❌ AUTH object not found on window!');
}
