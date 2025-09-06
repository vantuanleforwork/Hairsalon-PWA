// Quick OAuth Debug Script
// Run in browser console to debug OAuth

console.log('🔍 OAuth Debug Script Starting...');

function debugOAuth() {
    console.log('\n=== 📋 CONFIG CHECK ===');
    
    // Check config
    if (typeof APP_CONFIG === 'undefined') {
        console.error('❌ APP_CONFIG not found');
        return;
    }
    
    console.log('✅ APP_CONFIG found');
    console.log('🔐 Client ID:', APP_CONFIG.GOOGLE_CLIENT_ID?.substring(0, 20) + '...');
    console.log('📧 Allowed emails:', APP_CONFIG.ALLOWED_EMAILS?.length || 0);
    
    console.log('\n=== 🔧 AUTH FUNCTIONS CHECK ===');
    
    // Check auth functions
    const authFunctions = {
        'window.initAuth': typeof window.initAuth,
        'window.loginWithGoogle': typeof window.loginWithGoogle,  
        'window.logoutUser': typeof window.logoutUser,
        'window.AUTH': typeof window.AUTH,
        'window.AUTH_STATE': typeof window.AUTH_STATE
    };
    
    for (const [name, type] of Object.entries(authFunctions)) {
        const status = type === 'function' ? '✅' : type === 'object' ? '🔧' : '❌';
        console.log(`${status} ${name}: ${type}`);
    }
    
    console.log('\n=== 🌐 GOOGLE API CHECK ===');
    console.log('🔍 Google object:', typeof google);
    console.log('🔍 Google accounts:', typeof google?.accounts);
    
    console.log('\n=== 💾 STORAGE CHECK ===');
    const savedUser = localStorage.getItem('user');
    if (savedUser) {
        try {
            const user = JSON.parse(savedUser);
            console.log('✅ Saved user found:', user.email);
        } catch (e) {
            console.log('❌ Invalid saved user data');
        }
    } else {
        console.log('📝 No saved user');
    }
    
    console.log('\n=== 🚀 QUICK TESTS ===');
    
    // Test init
    if (typeof window.initAuth === 'function') {
        console.log('🔄 Testing initAuth...');
        try {
            window.initAuth({
                onLoginSuccess: (user) => {
                    console.log('✅ Init success callback:', user.email);
                },
                onLoginError: (error) => {
                    console.log('❌ Init error callback:', error);
                }
            });
            console.log('✅ initAuth completed');
        } catch (e) {
            console.error('❌ initAuth failed:', e);
        }
    }
    
    // Test current state
    if (window.AUTH_STATE) {
        console.log('👤 Current user:', window.AUTH_STATE.user?.email || 'none');
        console.log('🔐 Is logged in:', window.AUTH_STATE.isLoggedIn);
    }
    
    console.log('\n=== ✨ Ready for testing! ===');
    console.log('🚀 To test login: window.loginWithGoogle()');
    console.log('🚪 To test logout: window.logoutUser()');
    console.log('🎭 To test mock: Use login button in demo mode');
    
    return {
        config: !!APP_CONFIG,
        functions: Object.keys(authFunctions).filter(k => authFunctions[k] === 'function').length,
        google: !!google?.accounts,
        user: window.AUTH_STATE?.user?.email || null
    };
}

// Run debug
const result = debugOAuth();
console.log('\n📊 Debug Summary:', result);

// Make available globally for manual testing
window.debugOAuth = debugOAuth;
