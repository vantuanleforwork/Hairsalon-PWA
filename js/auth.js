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
    
    // Check for existing user - DISABLED for testing fresh login
    /*
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
    */
    
    console.log('📝 No valid saved user found');
};

// Google login function - REAL OAUTH ONLY
window.loginWithGoogle = function() {
    console.log('🚀 Starting Google OAuth login...');
    
    // Check if Google API is loaded
    if (typeof google === 'undefined' || !google.accounts) {
        console.error('❌ Google Identity Services not loaded!');
        alert('Google login không khả dụng. Vui lòng refresh trang.');
        return;
    }
    
    // Check client ID
    if (!window.APP_CONFIG || !window.APP_CONFIG.GOOGLE_CLIENT_ID) {
        console.error('❌ No Google Client ID configured!');
        alert('OAuth chưa được cấu hình. Liên hệ admin.');
        return;
    }
    
    console.log('⚙️ Initializing Google OAuth...');
    
    try {
        // Initialize Google OAuth
        google.accounts.id.initialize({
            client_id: window.APP_CONFIG.GOOGLE_CLIENT_ID,
            callback: window.handleGoogleCallback,
            auto_select: false,
            cancel_on_tap_outside: false
        });
        
        // Show the One Tap prompt
        google.accounts.id.prompt((notification) => {
            if (notification.isNotDisplayed()) {
                console.log('⚠️ One Tap not displayed:', notification.getNotDisplayedReason());
                // Force show popup by creating button and clicking it
                showGoogleLoginPopup();
            }
        });
        
    } catch (error) {
        console.error('❌ Google OAuth initialization error:', error);
        alert('Lỗi khởi tạo Google OAuth: ' + error.message);
    }
};

// Show Google login popup
function showGoogleLoginPopup() {
    try {
        // Create temporary div for Google button
        const buttonDiv = document.createElement('div');
        buttonDiv.style.position = 'fixed';
        buttonDiv.style.top = '-1000px'; // Hide off-screen
        document.body.appendChild(buttonDiv);
        
        // Render Google button
        google.accounts.id.renderButton(buttonDiv, {
            theme: 'outline',
            size: 'large',
            type: 'standard',
            width: '200'
        });
        
        // Auto-click the button to trigger popup
        setTimeout(() => {
            const googleBtn = buttonDiv.querySelector('[role="button"]');
            if (googleBtn) {
                googleBtn.click();
            } else {
                console.error('❌ Could not find Google button to click');
                alert('Không thể tạo popup đăng nhập. Thử lại sau.');
            }
            // Clean up
            document.body.removeChild(buttonDiv);
        }, 100);
        
    } catch (error) {
        console.error('❌ Error creating Google popup:', error);
        alert('Lỗi tạo popup Google: ' + error.message);
    }
}

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
