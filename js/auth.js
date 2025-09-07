// Google OAuth Authentication Module for Salon Manager
'use strict';

console.log('🔐 Auth module loading...');

// Global auth state
window.AUTH_STATE = {
    user: null,
    isLoggedIn: false,
    initialized: false
};

// Initialize authentication
window.initAuth = function(callbacks = {}) {
    console.log('🚀 Initializing authentication...');
    
    // Store callbacks
    window.authCallbacks = callbacks;
    
    // Check for saved user session
    const savedUser = localStorage.getItem('user');
    if (savedUser) {
        try {
            const user = JSON.parse(savedUser);
            // Validate saved user
            if (user && user.email && isEmailAllowed(user.email)) {
                window.AUTH_STATE.user = user;
                window.AUTH_STATE.isLoggedIn = true;
                console.log('✅ Restored session for:', user.email);
                
                // Auto-login with saved user
                if (callbacks.onLoginSuccess) {
                    callbacks.onLoginSuccess(user);
                }
                return;
            }
        } catch (e) {
            console.warn('Invalid saved user data');
        }
        // Clear invalid session
        localStorage.removeItem('user');
    }
    
    // Initialize Google Sign-In when API is ready
    if (typeof google !== 'undefined' && google.accounts) {
        initializeGoogleSignIn();
    } else {
        // Wait for Google API to load
        console.log('⏳ Waiting for Google API...');
        window.addEventListener('load', () => {
            setTimeout(initializeGoogleSignIn, 1000);
        });
    }
};

// Initialize Google Sign-In
function initializeGoogleSignIn() {
    console.log('🔍 Checking Google Sign-In prerequisites...');
    
    // Check if Google API is loaded
    if (typeof google === 'undefined' || !google.accounts) {
        console.warn('⏳ Google API not ready, retrying in 1s...');
        setTimeout(initializeGoogleSignIn, 1000);
        return;
    }
    
    // Check if config is loaded
    if (!window.APP_CONFIG) {
        console.warn('⏳ Config not loaded, retrying in 1s...');
        setTimeout(initializeGoogleSignIn, 1000);
        return;
    }
    
    // Check if Client ID exists
    if (!window.APP_CONFIG.GOOGLE_CLIENT_ID) {
        console.error('❌ No Google Client ID in config!');
        console.error('APP_CONFIG:', window.APP_CONFIG);
        return;
    }
    
    // Log config for debug
    console.log('📋 OAuth Config:', {
        clientId: window.APP_CONFIG.GOOGLE_CLIENT_ID.substring(0, 20) + '...',
        currentOrigin: window.location.origin,
        protocol: window.location.protocol
    });
    
    try {
        // Initialize the Google Sign-In client
        google.accounts.id.initialize({
            client_id: window.APP_CONFIG.GOOGLE_CLIENT_ID,
            callback: handleGoogleResponse,
            auto_select: false,
            cancel_on_tap_outside: true,
            context: 'signin',
            ux_mode: 'popup',
            itp_support: true
        });
        
        window.AUTH_STATE.initialized = true;
        console.log('✅ Google Sign-In initialized');
        
        // Render the sign-in button if container exists
        const buttonContainer = document.getElementById('googleLoginContainer');
        if (buttonContainer) {
            // Remove placeholder if exists
            const placeholder = document.getElementById('googleButtonPlaceholder');
            if (placeholder) {
                placeholder.remove();
            }
            
            // Clear any existing content first
            buttonContainer.innerHTML = '';
            
            // Create a wrapper div for better control
            const buttonWrapper = document.createElement('div');
            buttonWrapper.style.width = '100%';
            buttonWrapper.style.maxWidth = '400px';
            buttonWrapper.style.margin = '0 auto';
            buttonContainer.appendChild(buttonWrapper);
            
            google.accounts.id.renderButton(buttonWrapper, {
                type: 'standard',
                theme: 'outline',  // Keep original theme
                size: 'large',
                text: 'signin_with',
                width: '100%',  // Keep original width setting
                locale: 'vi'
            });
            // Adjust rendered button to fill container width (px)
            (function adjustGoogleButtonWidth(){
                const wrapperWidth = Math.round(buttonWrapper.getBoundingClientRect().width || 0);
                const buttonWidth = Math.max(240, Math.min(wrapperWidth || 360, 400));
                const googleBtn = buttonContainer.querySelector('div[role="button"]');
                if (googleBtn) {
                    googleBtn.style.width = buttonWidth + 'px';
                }
            })();
            // Re-adjust on resize/orientation
            window.addEventListener('resize', () => {
                const wrapperWidth = Math.round(buttonWrapper.getBoundingClientRect().width || 0);
                const buttonWidth = Math.max(240, Math.min(wrapperWidth || 360, 400));
                const googleBtn = buttonContainer.querySelector('div[role="button"]');
                if (googleBtn) {
                    googleBtn.style.width = buttonWidth + 'px';
                }
            });
            // Guard against late style changes by GIS
            try {
                const observer = new MutationObserver(() => {
                    const wrapperWidth = Math.round(buttonWrapper.getBoundingClientRect().width || 0);
                    const buttonWidth = Math.max(240, Math.min(wrapperWidth || 360, 400));
                    const googleBtn = buttonContainer.querySelector('div[role="button"]');
                    if (googleBtn) {
                        googleBtn.style.width = buttonWidth + 'px';
                    }
                });
                observer.observe(buttonContainer, { subtree: true, childList: true, attributes: true });
                setTimeout(() => observer.disconnect(), 2500);
            } catch (_) {}
            console.log('✅ Google button rendered');
        }
        
    } catch (error) {
        console.error('❌ Failed to initialize Google Sign-In:', error);
        showError('Không thể khởi tạo Google Sign-In');
    }
}

// Login with Google
window.loginWithGoogle = function() {
    console.log('🔐 Login button clicked');
    
    if (!window.AUTH_STATE.initialized) {
        console.log('Initializing Google Sign-In first...');
        initializeGoogleSignIn();
        setTimeout(() => {
            if (window.AUTH_STATE.initialized) {
                triggerGoogleSignIn();
            }
        }, 500);
        return;
    }
    
    triggerGoogleSignIn();
};

// Trigger Google Sign-In flow
function triggerGoogleSignIn() {
    try {
        // Try One Tap first
        google.accounts.id.prompt((notification) => {
            console.log('One Tap status:', notification);
            if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
                // Fallback to button click
                console.log('One Tap not shown, using button click');
                const googleBtn = document.querySelector('#googleLoginContainer > div[role="button"]');
                if (googleBtn) {
                    googleBtn.click();
                } else {
                    console.error('Google button not found');
                    showError('Không tìm thấy nút đăng nhập Google');
                }
            }
        });
    } catch (error) {
        console.error('Error triggering sign-in:', error);
        showError('Lỗi khi mở cửa sổ đăng nhập');
    }
}

// Handle Google Sign-In response
function handleGoogleResponse(response) {
    console.log('📨 Google response received');
    
    if (!response || !response.credential) {
        console.error('No credential in response');
        showError('Không nhận được thông tin đăng nhập');
        return;
    }
    
    try {
        // Decode the JWT credential
        const credential = response.credential;
        const payload = parseJWT(credential);
        
        console.log('👤 User info:', {
            email: payload.email,
            name: payload.name,
            verified: payload.email_verified
        });
        
        // Check if email is allowed
        if (!isEmailAllowed(payload.email)) {
            console.warn('⛔ Unauthorized email:', payload.email);
            showError(`Email ${payload.email} không được phép sử dụng hệ thống.\nVui lòng liên hệ quản trị viên.`);
            // Sign out from Google
            google.accounts.id.disableAutoSelect();
            return;
        }
        
        // Create user object
        const user = {
            id: payload.sub,
            email: payload.email,
            name: payload.name || payload.email.split('@')[0],
            picture: payload.picture || null,
            loginTime: new Date().toISOString()
        };
        
        // Update auth state
        window.AUTH_STATE.user = user;
        window.AUTH_STATE.isLoggedIn = true;
        
        // Save to localStorage for session persistence
        localStorage.setItem('user', JSON.stringify(user));
        
        console.log('✅ Login successful for:', user.email);
        
        // Trigger success callback
        if (window.authCallbacks && window.authCallbacks.onLoginSuccess) {
            window.authCallbacks.onLoginSuccess(user);
        }
        
    } catch (error) {
        console.error('❌ Error processing credential:', error);
        showError('Lỗi xử lý thông tin đăng nhập');
    }
}

// Logout function
window.logoutUser = function() {
    console.log('👋 Logging out...');
    
    // Clear auth state
    window.AUTH_STATE.user = null;
    window.AUTH_STATE.isLoggedIn = false;
    
    // Clear localStorage
    localStorage.removeItem('user');
    
    // Revoke Google Sign-In
    if (typeof google !== 'undefined' && google.accounts && google.accounts.id) {
        google.accounts.id.disableAutoSelect();
        // Optional: revoke token
        const user = window.AUTH_STATE.user;
        if (user && user.email) {
            google.accounts.id.revoke(user.email, done => {
                console.log('Token revoked:', done);
            });
        }
    }
    
    // Trigger logout callback
    if (window.authCallbacks && window.authCallbacks.onLogout) {
        window.authCallbacks.onLogout();
    }
    
    console.log('✅ Logout completed');
};

// Check if email is allowed
function isEmailAllowed(email) {
    // Check config
    if (!window.APP_CONFIG || !window.APP_CONFIG.ALLOWED_EMAILS) {
        console.warn('No email whitelist configured');
        return true; // Allow all if no config
    }
    
    const allowed = window.APP_CONFIG.ALLOWED_EMAILS.includes(email.toLowerCase());
    console.log(`Email ${email} is ${allowed ? 'allowed ✅' : 'blocked ⛔'}`);
    return allowed;
}

// Parse JWT token
function parseJWT(token) {
    try {
        // Split token and get payload
        const parts = token.split('.');
        if (parts.length !== 3) {
            throw new Error('Invalid token format');
        }
        
        // Decode base64url
        const base64 = parts[1]
            .replace(/-/g, '+')
            .replace(/_/g, '/');
        
        // Pad with = if needed
        const padded = base64 + '=='.substring(0, (4 - base64.length % 4) % 4);
        
        // Decode and parse
        const decoded = atob(padded);
        return JSON.parse(decoded);
        
    } catch (error) {
        console.error('JWT parse error:', error);
        throw new Error('Invalid JWT token');
    }
}


// Show error message
function showError(message) {
    console.error('Auth error:', message);
    
    // Try different methods to show error
    if (typeof window.showToast === 'function') {
        window.showToast(message, 'error');
    } else if (window.authCallbacks && window.authCallbacks.onLoginError) {
        window.authCallbacks.onLoginError(message);
    } else {
        // Fallback to alert
        alert(message);
    }
}

// Public API
window.AUTH = {
    init: window.initAuth,
    login: window.loginWithGoogle,
    logout: window.logoutUser,
    isAuthenticated: () => window.AUTH_STATE.isLoggedIn,
    getCurrentUser: () => window.AUTH_STATE.user,
    getState: () => window.AUTH_STATE
};

// Debug info
if (window.APP_CONFIG && window.APP_CONFIG.DEBUG_MODE) {
    console.log('✅ Auth module loaded successfully');
    console.log('📚 Available methods:', Object.keys(window.AUTH));
    console.log('🔑 Client ID configured:', 
        !!(window.APP_CONFIG.GOOGLE_CLIENT_ID && 
           !window.APP_CONFIG.GOOGLE_CLIENT_ID.includes('YOUR_ACTUAL')));
}
