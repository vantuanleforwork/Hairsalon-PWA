# 🔐 OAuth Testing Guide

## 🎯 How to Test Real Google OAuth

### **Local Testing:**
1. Open `index.html` in browser
2. Login screen should appear (no auto-login)
3. Click "Đăng nhập với Google" button
4. Google OAuth popup should open
5. Login with allowed email from whitelist

### **Production Testing:**
1. Go to: https://vantuanleforwork.github.io/Hairsalon-PWA/
2. Same process as local testing

## 🔍 Debug Information

### **Show Debug Info:**
- Click "Show Debug Info" on login screen
- Check Client ID is configured
- Verify Google API is loaded

### **Console Debugging:**
```javascript
// Check auth functions
console.log('loginWithGoogle:', typeof window.loginWithGoogle);
console.log('Google API:', typeof google?.accounts);
console.log('Config:', APP_CONFIG?.GOOGLE_CLIENT_ID);

// Test login manually
window.loginWithGoogle();
```

## ✅ **Expected Behavior:**

### **Normal OAuth Flow:**
1. Click login button → Google popup opens
2. Select Google account → Redirect back  
3. Email whitelist check → Success message
4. Main app loads → User logged in

### **Fallbacks:**
- If Google API not loaded → Mock login
- If Client ID invalid → Mock login
- If popup blocked → Mock login
- If email not in whitelist → Error message

## 📧 **Allowed Emails:**
```javascript
ALLOWED_EMAILS: [
    'vantuanleforwork@gmail.com',
    'vantuanle2002@gmail.com', 
    'v4ntu4nl3@gmail.com',
    'phonghominh8@gmail.com',
]
```

## 🚫 **Troubleshooting:**

### **"Using mock login" message:**
- Check console for specific reason
- Verify Google API loaded
- Check Client ID is not DEMO_ID

### **Popup blocked:**
- Allow popups for the domain
- Try different browser
- Disable popup blocker temporarily

### **"Email not allowed":**
- Check if your email is in whitelist
- Contact admin to add email

### **OAuth popup closes without login:**
- Try clearing browser cookies
- Try incognito/private mode
- Check network connection

## 🔄 **Force Fresh Login:**
Currently configured to force fresh login every time (no localStorage auto-login) for testing purposes.

To re-enable auto-login later, uncomment the localStorage check in `js/auth.js`.

## 🎮 **Quick Commands:**

```javascript
// In browser console:

// Test login
window.loginWithGoogle();

// Check auth state
console.log('Auth State:', window.AUTH_STATE);

// Test logout
window.logoutUser();

// Clear saved user
localStorage.removeItem('user');
```

---

**Ready to test OAuth! Try both local and production URLs.** 🚀
