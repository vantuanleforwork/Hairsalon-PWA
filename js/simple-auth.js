// Simple Authentication Module (No OAuth Required)
'use strict';

console.log('🔐 Simple Auth Module Loading...');

// Auth configuration
const SIMPLE_AUTH_CONFIG = {
    // Allowed users with passwords
    USERS: {
        'vantuanleforwork@gmail.com': 'salon2025',
        'vantuanle2002@gmail.com': 'salon2025',
        'v4ntu4nl3@gmail.com': 'salon2025',
        'phonghominh8@gmail.com': 'salon2025',
        'admin@salon.com': 'admin123'
    },
    
    // Session duration (24 hours)
    SESSION_DURATION: 24 * 60 * 60 * 1000
};

// Auth state
window.SIMPLE_AUTH_STATE = {
    user: null,
    isLoggedIn: false
};

// Initialize simple auth
window.initSimpleAuth = function(callbacks = {}) {
    console.log('🚀 Initializing simple authentication...');
    
    window.authCallbacks = callbacks;
    
    // Check for existing session
    const savedSession = localStorage.getItem('simpleAuthSession');
    if (savedSession) {
        try {
            const session = JSON.parse(savedSession);
            
            // Check if session is still valid
            if (session.expiry && new Date(session.expiry) > new Date()) {
                window.SIMPLE_AUTH_STATE.user = session.user;
                window.SIMPLE_AUTH_STATE.isLoggedIn = true;
                
                console.log('✅ Session restored for:', session.user.email);
                
                if (callbacks.onLoginSuccess) {
                    callbacks.onLoginSuccess(session.user);
                }
                return;
            }
        } catch (e) {
            console.warn('Invalid session data');
        }
        
        // Clear expired session
        localStorage.removeItem('simpleAuthSession');
    }
    
    console.log('📝 No valid session found');
};

// Simple login with email/password
window.simpleLogin = function(email, password) {
    console.log('🔑 Attempting login for:', email);
    
    // Normalize email
    email = email.toLowerCase().trim();
    
    // Check credentials
    if (SIMPLE_AUTH_CONFIG.USERS[email] && 
        SIMPLE_AUTH_CONFIG.USERS[email] === password) {
        
        // Create user object
        const user = {
            email: email,
            name: email.split('@')[0],
            loginTime: new Date().toISOString(),
            authMethod: 'simple'
        };
        
        // Create session
        const session = {
            user: user,
            expiry: new Date(Date.now() + SIMPLE_AUTH_CONFIG.SESSION_DURATION).toISOString()
        };
        
        // Save session
        localStorage.setItem('simpleAuthSession', JSON.stringify(session));
        
        // Update state
        window.SIMPLE_AUTH_STATE.user = user;
        window.SIMPLE_AUTH_STATE.isLoggedIn = true;
        
        console.log('✅ Login successful');
        
        // Trigger callback
        if (window.authCallbacks && window.authCallbacks.onLoginSuccess) {
            window.authCallbacks.onLoginSuccess(user);
        }
        
        return true;
        
    } else {
        console.warn('❌ Invalid credentials');
        
        if (window.authCallbacks && window.authCallbacks.onLoginError) {
            window.authCallbacks.onLoginError('Email hoặc mật khẩu không đúng');
        }
        
        return false;
    }
};

// Simple logout
window.simpleLogout = function() {
    console.log('👋 Logging out...');
    
    // Clear state
    window.SIMPLE_AUTH_STATE.user = null;
    window.SIMPLE_AUTH_STATE.isLoggedIn = false;
    
    // Clear session
    localStorage.removeItem('simpleAuthSession');
    
    // Trigger callback
    if (window.authCallbacks && window.authCallbacks.onLogout) {
        window.authCallbacks.onLogout();
    }
    
    console.log('✅ Logout complete');
};

// Get current user
window.getSimpleAuthUser = function() {
    return window.SIMPLE_AUTH_STATE.user;
};

// Check if authenticated
window.isSimpleAuthenticated = function() {
    return window.SIMPLE_AUTH_STATE.isLoggedIn;
};

// Create compatibility layer with Google OAuth
window.AUTH = {
    init: window.initSimpleAuth,
    login: () => {
        // Show login modal instead of Google OAuth
        showSimpleLoginModal();
    },
    logout: window.simpleLogout,
    isAuthenticated: window.isSimpleAuthenticated,
    getCurrentUser: window.getSimpleAuthUser,
    getState: () => window.SIMPLE_AUTH_STATE
};

// Override Google login function
window.loginWithGoogle = function() {
    console.log('🔄 Redirecting to simple login...');
    showSimpleLoginModal();
};

window.logoutUser = window.simpleLogout;
window.initAuth = window.initSimpleAuth;

// Show login modal
function showSimpleLoginModal() {
    // Check if modal already exists
    if (document.getElementById('simpleLoginModal')) {
        document.getElementById('simpleLoginModal').style.display = 'flex';
        return;
    }
    
    // Create modal HTML
    const modalHTML = `
        <div id="simpleLoginModal" style="
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0,0,0,0.5);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 9999;
        ">
            <div style="
                background: white;
                padding: 30px;
                border-radius: 10px;
                width: 90%;
                max-width: 400px;
                box-shadow: 0 4px 6px rgba(0,0,0,0.1);
            ">
                <h2 style="margin: 0 0 20px 0; color: #333;">🔐 Đăng nhập</h2>
                
                <div style="margin-bottom: 15px;">
                    <label style="display: block; margin-bottom: 5px; color: #555; font-size: 14px;">
                        Email:
                    </label>
                    <input type="email" id="simpleLoginEmail" style="
                        width: 100%;
                        padding: 10px;
                        border: 1px solid #ddd;
                        border-radius: 5px;
                        font-size: 16px;
                        box-sizing: border-box;
                    " placeholder="your@email.com">
                </div>
                
                <div style="margin-bottom: 20px;">
                    <label style="display: block; margin-bottom: 5px; color: #555; font-size: 14px;">
                        Mật khẩu:
                    </label>
                    <input type="password" id="simpleLoginPassword" style="
                        width: 100%;
                        padding: 10px;
                        border: 1px solid #ddd;
                        border-radius: 5px;
                        font-size: 16px;
                        box-sizing: border-box;
                    " placeholder="••••••••">
                </div>
                
                <div id="simpleLoginError" style="
                    color: red;
                    font-size: 14px;
                    margin-bottom: 15px;
                    display: none;
                "></div>
                
                <div style="display: flex; gap: 10px;">
                    <button onclick="handleSimpleLogin()" style="
                        flex: 1;
                        padding: 12px;
                        background: #4285f4;
                        color: white;
                        border: none;
                        border-radius: 5px;
                        font-size: 16px;
                        cursor: pointer;
                    ">Đăng nhập</button>
                    
                    <button onclick="closeSimpleLoginModal()" style="
                        flex: 1;
                        padding: 12px;
                        background: #f0f0f0;
                        color: #333;
                        border: none;
                        border-radius: 5px;
                        font-size: 16px;
                        cursor: pointer;
                    ">Hủy</button>
                </div>
                
                <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #eee;">
                    <p style="color: #888; font-size: 13px; margin: 0;">
                        <strong>Demo accounts:</strong><br>
                        Email: vantuanleforwork@gmail.com<br>
                        Password: salon2025
                    </p>
                </div>
            </div>
        </div>
    `;
    
    // Add modal to page
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    
    // Focus email input
    document.getElementById('simpleLoginEmail').focus();
    
    // Handle enter key
    document.getElementById('simpleLoginPassword').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            handleSimpleLogin();
        }
    });
}

// Handle login from modal
window.handleSimpleLogin = function() {
    const email = document.getElementById('simpleLoginEmail').value;
    const password = document.getElementById('simpleLoginPassword').value;
    const errorDiv = document.getElementById('simpleLoginError');
    
    if (!email || !password) {
        errorDiv.textContent = 'Vui lòng nhập email và mật khẩu';
        errorDiv.style.display = 'block';
        return;
    }
    
    if (simpleLogin(email, password)) {
        closeSimpleLoginModal();
    } else {
        errorDiv.textContent = 'Email hoặc mật khẩu không đúng';
        errorDiv.style.display = 'block';
    }
};

// Close login modal
window.closeSimpleLoginModal = function() {
    const modal = document.getElementById('simpleLoginModal');
    if (modal) {
        modal.remove();
    }
};

console.log('✅ Simple Auth Module Ready');
console.log('📝 Demo account: vantuanleforwork@gmail.com / salon2025');
