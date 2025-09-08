// Google OAuth Authentication Module for Salon Manager
'use strict';

console.log('Auth module loading...');

// Global auth state
window.AUTH_STATE = {
    user: null,
    isLoggedIn: false,
    initialized: false
};

// Initialize authentication
window.initAuth = function(callbacks = {}) {
    console.log('Đang khởi tạo xác thực...');

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
                console.log('Khôi phục phiên cho:', user.email);
                // Auto-login with saved user
                if (callbacks.onLoginSuccess) {
                    callbacks.onLoginSuccess(user);
                }
                return;
            }
        } catch (e) {
            console.warn('Dữ liệu phiên lưu không hợp lệ');
        }
        // Clear invalid session
        localStorage.removeItem('user');
    }

    // Helper: robustly wait for GIS availability even if window 'load' already fired
    function waitForGoogleAndInit(maxAttempts = 40, intervalMs = 250) {
        let attempts = 0;
        const timer = setInterval(() => {
            attempts++;
            if (typeof google !== 'undefined' && google.accounts) {
                clearInterval(timer);
                initializeGoogleSignIn();
            } else if (attempts >= maxAttempts) {
                clearInterval(timer);
                console.warn('Google API không sẵn sàng sau khi chờ. Thử lại khi người dùng tương tác.');
            }
        }, intervalMs);
    }

    // Initialize Google Sign-In when API is ready
    if (typeof google !== 'undefined' && google.accounts) {
        initializeGoogleSignIn();
    } else {
        console.log('Đang chờ Google API...');
        // If load already fired, still try polling
        if (document.readyState === 'complete') {
            waitForGoogleAndInit();
        } else {
            window.addEventListener('load', () => {
                setTimeout(() => {
                    if (typeof google !== 'undefined' && google.accounts) {
                        initializeGoogleSignIn();
                    } else {
                        waitForGoogleAndInit();
                    }
                }, 500);
            });
        }
        // Also retry when tab becomes visible (PWA foreground)
        document.addEventListener('visibilitychange', () => {
            if (!window.AUTH_STATE.initialized && document.visibilityState === 'visible') {
                if (typeof google !== 'undefined' && google.accounts) {
                    initializeGoogleSignIn();
                }
            }
        });
    }
};

// Initialize Google Sign-In
function initializeGoogleSignIn() {
    // Check if Google API is loaded
    if (typeof google === 'undefined' || !google.accounts) {
        console.warn('Google API chưa sẵn sàng, thử lại sau 1s...');
        setTimeout(initializeGoogleSignIn, 1000);
        return;
    }

    // Check if config is loaded
    if (!window.APP_CONFIG) {
        console.warn('Config chưa sẵn sàng, thử lại sau 1s...');
        setTimeout(initializeGoogleSignIn, 1000);
        return;
    }

    // Check if Client ID exists
    if (!window.APP_CONFIG.GOOGLE_CLIENT_ID) {
        console.error('Thiếu Google Client ID trong config!');
        console.error('APP_CONFIG:', window.APP_CONFIG);
        showError('Thiếu cấu hình đăng nhập Google');
        return;
    }

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
        console.log('Đã khởi tạo Google Sign-In');

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

            // Compute numeric width for GIS button (px)
            let width = Math.round(buttonWrapper.getBoundingClientRect().width || 0);
            if (!width) width = Math.round(buttonContainer.getBoundingClientRect().width || 0);
            width = Math.max(240, Math.min(width || 360, 400));

            google.accounts.id.renderButton(buttonWrapper, {
                type: 'standard',
                theme: 'outline',
                size: 'large',
                text: 'signin_with',
                width: width,
                locale: 'vi'
            });

            // Re-render on resize to keep correct sizing
            let resizeTimer;
            window.addEventListener('resize', () => {
                clearTimeout(resizeTimer);
                resizeTimer = setTimeout(() => {
                    try {
                        buttonContainer.innerHTML = '';
                        const w = document.createElement('div');
                        w.style.width = '100%';
                        w.style.maxWidth = '400px';
                        w.style.margin = '0 auto';
                        buttonContainer.appendChild(w);
                        let ww = Math.round(w.getBoundingClientRect().width || 0);
                        if (!ww) ww = Math.round(buttonContainer.getBoundingClientRect().width || 0);
                        ww = Math.max(240, Math.min(ww || 360, 400));
                        google.accounts.id.renderButton(w, {
                            type: 'standard', theme: 'outline', size: 'large', text: 'signin_with', width: ww, locale: 'vi'
                        });
                    } catch (_) {}
                }, 200);
            });
            // Safety: if button not present after a while, try once more
            setTimeout(() => {
                if (!buttonContainer.querySelector('div[role="button"]')) {
                    try {
                        buttonContainer.innerHTML = '';
                        const w2 = document.createElement('div');
                        w2.style.width = '100%';
                        w2.style.maxWidth = '400px';
                        w2.style.margin = '0 auto';
                        buttonContainer.appendChild(w2);
                        let wpx = Math.round(w2.getBoundingClientRect().width || 0) || 360;
                        wpx = Math.max(240, Math.min(wpx, 400));
                        google.accounts.id.renderButton(w2, {
                            type: 'standard', theme: 'outline', size: 'large', text: 'signin_with', width: wpx, locale: 'vi'
                        });
                    } catch (_) {}
                }
            }, 1200);
        }

    } catch (error) {
        console.error('Không thể khởi tạo Google Sign-In:', error);
        showError('Không thể khởi tạo Google Sign-In');
    }
}

// Login with Google
window.loginWithGoogle = function() {
    console.log('Login button clicked');

    if (!window.AUTH_STATE.initialized) {
        console.log('Khởi tạo Google Sign-In trước...');
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
                console.log('One Tap không hiển thị, dùng nút đăng nhập');
                const googleBtn = document.querySelector('#googleLoginContainer > div[role="button"]');
                if (googleBtn) {
                    googleBtn.click();
                } else {
                    console.error('Không tìm thấy nút đăng nhập Google');
                    showError('Không tìm thấy nút đăng nhập Google');
                }
            }
        });
    } catch (error) {
        console.error('Lỗi khi kích hoạt đăng nhập:', error);
        showError('Lỗi khi mở cửa sổ đăng nhập');
    }
}

// Handle Google Sign-In response
function handleGoogleResponse(response) {
    console.log('Google response received');

    if (!response || !response.credential) {
        console.error('Không có credential trong phản hồi');
        showError('Không nhận được thông tin đăng nhập');
        return;
    }

    try {
        // Decode the JWT credential
        const credential = response.credential;
        const payload = parseJWT(credential);

        console.log('User info:', {
            email: payload.email,
            name: payload.name,
            verified: payload.email_verified
        });

        // Check if email is allowed
        if (!isEmailAllowed(payload.email)) {
            console.warn('Unauthorized email:', payload.email);
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
            loginTime: new Date().toISOString(),
            idToken: credential
        };

        // Update auth state
        window.AUTH_STATE.user = user;
        window.AUTH_STATE.isLoggedIn = true;

        // Save to localStorage for session persistence
        localStorage.setItem('user', JSON.stringify(user));

        console.log('Đăng nhập thành công:', user.email);

        // Trigger success callback
        if (window.authCallbacks && window.authCallbacks.onLoginSuccess) {
            window.authCallbacks.onLoginSuccess(user);
        }

    } catch (error) {
        console.error('Lỗi xử lý credential:', error);
        showError('Lỗi xử lý thông tin đăng nhập');
    }
}

// Logout function
window.logoutUser = function() {
    console.log('Đang đăng xuất...');
    const user = window.AUTH_STATE.user; // giữ lại trước khi xoá

    // Clear auth state
    window.AUTH_STATE.user = null;
    window.AUTH_STATE.isLoggedIn = false;

    // Clear localStorage
    localStorage.removeItem('user');

    // Revoke Google Sign-In
    if (typeof google !== 'undefined' && google.accounts && google.accounts.id) {
        google.accounts.id.disableAutoSelect();
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

    console.log('Đăng xuất hoàn tất');
};

// Check if email is allowed
function isEmailAllowed(email) {
    // Check config
    if (!window.APP_CONFIG || !window.APP_CONFIG.ALLOWED_EMAILS) {
        console.warn('Chưa cấu hình danh sách email cho phép (whitelist)');
        return true; // Allow all if no config
    }

    const allowed = window.APP_CONFIG.ALLOWED_EMAILS.includes(String(email || '').toLowerCase());
    console.log(`Email ${email} ${allowed ? 'được phép ✅' : 'không được phép ❌'}`);
    return allowed;
}

// Parse JWT token
function parseJWT(token) {
    try {
        // Split token and get payload
        const parts = String(token || '').split('.');
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

    // Prefer app toast if available
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
    getIdToken: () => window.AUTH_STATE.user?.idToken,
    getState: () => window.AUTH_STATE
};

// Debug info
if (window.APP_CONFIG && window.APP_CONFIG.DEBUG_MODE) {
    console.log('Auth module loaded');
    console.log('Available methods:', Object.keys(window.AUTH));
    console.log('Client ID configured:', !!(window.APP_CONFIG.GOOGLE_CLIENT_ID));
}
