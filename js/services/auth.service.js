/**
 * Auth Service - Google OAuth and Session Management
 * Handles authentication, session management, token refresh, user management
 */

import { StorageService } from './storage.service.js';
import EventBus from '../core/eventBus.js';
import Utils from '../core/utils.js';

export class AuthService {
  constructor() {
    this.currentUser = null;
    this.currentSession = null;
    this.refreshToken = null;
    this.sessionTimeout = null;
    this.isAuthenticated = false;
    this.apiEndpoint = this.getApiEndpoint();
    this.sessionDuration = 24 * 60 * 60 * 1000; // 24 hours
    this.refreshThreshold = 5 * 60 * 1000; // 5 minutes
    
    // Initialize service
    this.init();
  }

  async init() {
    try {
      // Restore session from storage
      await this.restoreSession();
      
      // Setup periodic token refresh
      this.setupTokenRefresh();
      
      // Setup event listeners
      this.setupEventListeners();
      
      console.log('AuthService initialized');
    } catch (error) {
      console.error('AuthService initialization error:', error);
    }
  }

  setupEventListeners() {
    // Listen for storage changes (multi-tab support)
    window.addEventListener('storage', (e) => {
      if (e.key === 'user_session') {
        this.handleSessionChange(e.newValue);
      }
    });

    // Handle page visibility changes
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) {
        this.validateCurrentSession();
      }
    });
  }

  /**
   * Authenticate with Google OAuth
   */
  async authenticateWithGoogle(credentials) {
    try {
      // Check if we're online for API call
      if (navigator.onLine) {
        // Call backend API for authentication
        const response = await fetch(`${this.apiEndpoint}/auth/google`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            credential: credentials.credential,
            accessToken: credentials.accessToken,
            userInfo: credentials.userInfo
          })
        });
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const result = await response.json();
        
        if (result.success) {
          await this.setSession(result.user, result.session);
          return result;
        } else {
          throw new Error(result.error || 'Authentication failed');
        }
      } else {
        // Offline mode - create local session
        return await this.createOfflineGoogleSession(credentials.userInfo);
      }
      
    } catch (error) {
      console.error('Google authentication error:', error);
      
      // Fallback to offline mode if network error
      if (error.name === 'TypeError' || error.message.includes('fetch')) {
        console.log('Network error, attempting offline authentication');
        return await this.createOfflineGoogleSession(credentials.userInfo);
      }
      
      throw error;
    }
  }

  /**
   * Create offline Google session
   */
  async createOfflineGoogleSession(userInfo) {
    try {
      const user = {
        id: userInfo.sub || userInfo.id || 'offline_' + Date.now(),
        name: userInfo.name || userInfo.given_name || 'User',
        email: userInfo.email,
        picture: userInfo.picture,
        provider: 'google',
        role: 'user',
        permissions: ['read', 'write'],
        offline: true
      };
      
      const session = {
        token: 'offline_google_' + Date.now(),
        expiresAt: Date.now() + this.sessionDuration,
        provider: 'google',
        offline: true
      };
      
      await this.setSession(user, session);
      
      // Mark for sync when online
      await StorageService.set('pending_google_auth', {
        userInfo,
        timestamp: Date.now()
      });
      
      return {
        success: true,
        user,
        session,
        offline: true
      };
      
    } catch (error) {
      console.error('Offline Google session error:', error);
      throw new Error('Không thể tạo phiên offline với Google');
    }
  }

  /**
   * Create guest session
   */
  async createGuestSession() {
    const guestUser = {
      id: 'guest_' + Date.now(),
      name: 'Khách',
      email: null,
      provider: 'guest',
      role: 'guest',
      permissions: ['read']
    };
    
    const session = {
      token: 'guest_token_' + Date.now(),
      expiresAt: Date.now() + (2 * 60 * 60 * 1000), // 2 hours
      provider: 'guest'
    };
    
    await this.setSession(guestUser, session);
    return { ...guestUser, session };
  }

  /**
   * Create offline session
   */
  async createOfflineSession() {
    const offlineUser = {
      id: 'offline_' + Date.now(),
      name: 'Người dùng ngoại tuyến',
      email: null,
      provider: 'offline',
      role: 'offline',
      permissions: ['read', 'write_offline'],
      offline: true
    };
    
    const session = {
      token: 'offline_token_' + Date.now(),
      expiresAt: Date.now() + this.sessionDuration,
      provider: 'offline',
      offline: true
    };
    
    await this.setSession(offlineUser, session);
    return { ...offlineUser, session };
  }

  /**
   * Set current session
   */
  async setSession(user, session) {
    this.currentUser = user;
    this.currentSession = session;
    this.isAuthenticated = true;
    
    // Store in localStorage for persistence
    await StorageService.set('current_user', user);
    await StorageService.set('current_session', session);
    await StorageService.set('user_session', {
      user,
      session,
      timestamp: Date.now()
    });
    
    // Setup session timeout
    this.setupSessionTimeout(session.expiresAt);
    
    // Emit session change event
    EventBus.emit('auth:session-set', {
      user,
      session
    });
    
    console.log('Session set for user:', user.name);
  }

  /**
   * Restore session from storage
   */
  async restoreSession() {
    try {
      const storedSession = await StorageService.get('user_session');
      
      if (storedSession && storedSession.user && storedSession.session) {
        const { user, session } = storedSession;
        
        // Check if session is still valid
        if (session.expiresAt > Date.now()) {
          this.currentUser = user;
          this.currentSession = session;
          this.isAuthenticated = true;
          
          this.setupSessionTimeout(session.expiresAt);
          
          // Emit session restored event
          EventBus.emit('auth:session-restored', {
            user,
            session
          });
          
          console.log('Session restored for user:', user.name);
          
          // Check if we need to sync offline authentication
          if (navigator.onLine && user.offline) {
            this.syncOfflineAuth();
          }
          
        } else {
          console.log('Stored session expired, clearing...');
          await this.clearSession();
        }
      }
    } catch (error) {
      console.error('Session restore error:', error);
      await this.clearSession();
    }
  }

  /**
   * Clear current session
   */
  async clearSession() {
    const previousUser = this.currentUser;
    
    this.currentUser = null;
    this.currentSession = null;
    this.isAuthenticated = false;
    
    // Clear from storage
    await StorageService.remove('current_user');
    await StorageService.remove('current_session');
    await StorageService.remove('user_session');
    
    // Clear session timeout
    if (this.sessionTimeout) {
      clearTimeout(this.sessionTimeout);
      this.sessionTimeout = null;
    }
    
    // Emit session cleared event
    EventBus.emit('auth:session-cleared', {
      previousUser
    });
    
    console.log('Session cleared');
  }

  /**
   * Logout user
   */
  async logout() {
    try {
      const currentUser = this.currentUser;
      
      // Call logout endpoint if available and online
      if (this.currentSession && navigator.onLine) {
        try {
          await fetch(`${this.apiEndpoint}/auth/logout`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${this.currentSession.token}`,
              'Content-Type': 'application/json'
            }
          });
        } catch (error) {
          console.warn('Logout API call failed:', error);
        }
      }
      
      // Clear session
      await this.clearSession();
      
      // Clear any pending auth data
      await StorageService.remove('pending_google_auth');
      await StorageService.remove('remember_login');
      
      // Emit logout event
      EventBus.emit('auth:logout', {
        user: currentUser,
        timestamp: Date.now()
      });
      
      console.log('User logged out');
      
    } catch (error) {
      console.error('Logout error:', error);
      // Force clear session even if logout fails
      await this.clearSession();
    }
  }

  /**
   * Check if user has permission
   */
  hasPermission(permission) {
    if (!this.isAuthenticated || !this.currentUser) {
      return false;
    }
    
    return this.currentUser.permissions && 
           this.currentUser.permissions.includes(permission);
  }

  /**
   * Check if user has role
   */
  hasRole(role) {
    if (!this.isAuthenticated || !this.currentUser) {
      return false;
    }
    
    return this.currentUser.role === role;
  }

  /**
   * Check if user is guest
   */
  isGuest() {
    return this.hasRole('guest');
  }

  /**
   * Check if user is offline
   */
  isOffline() {
    return this.currentUser?.offline === true;
  }

  /**
   * Get current user info
   */
  getCurrentUser() {
    return this.currentUser;
  }

  /**
   * Get current session
   */
  getCurrentSession() {
    return this.currentSession;
  }

  /**
   * Setup session timeout
   */
  setupSessionTimeout(expiresAt) {
    if (this.sessionTimeout) {
      clearTimeout(this.sessionTimeout);
    }
    
    const timeUntilExpiry = expiresAt - Date.now();
    
    if (timeUntilExpiry > 0) {
      // Set timeout for session expiry
      this.sessionTimeout = setTimeout(() => {
        console.log('Session expired');
        this.handleSessionExpiry();
      }, timeUntilExpiry);
      
      // Set earlier timeout for refresh warning (5 minutes before expiry)
      const refreshTime = Math.max(timeUntilExpiry - this.refreshThreshold, 0);
      if (refreshTime > 0) {
        setTimeout(() => {
          this.handleSessionRefreshWarning();
        }, refreshTime);
      }
    }
  }

  /**
   * Handle session expiry
   */
  async handleSessionExpiry() {
    EventBus.emit('auth:session-expired', {
      user: this.currentUser,
      timestamp: Date.now()
    });
    
    await this.clearSession();
    
    // Redirect to login if not already there
    if (window.location.hash !== '#/login') {
      EventBus.emit('auth:login-required', {
        reason: 'session_expired'
      });
    }
  }

  /**
   * Handle session refresh warning
   */
  handleSessionRefreshWarning() {
    if (this.isAuthenticated && !this.isGuest() && !this.isOffline()) {
      EventBus.emit('auth:session-refresh-warning', {
        user: this.currentUser,
        expiresAt: this.currentSession?.expiresAt,
        timestamp: Date.now()
      });
    }
  }

  /**
   * Setup token refresh
   */
  setupTokenRefresh() {
    // Check for token refresh every minute
    setInterval(() => {
      if (this.isAuthenticated && this.currentSession) {
        const timeUntilExpiry = this.currentSession.expiresAt - Date.now();
        
        // Refresh if within threshold and not guest/offline
        if (timeUntilExpiry < this.refreshThreshold && timeUntilExpiry > 0) {
          if (!this.isGuest() && !this.isOffline() && navigator.onLine) {
            this.refreshToken();
          }
        }
      }
    }, 60000); // Check every minute
  }

  /**
   * Refresh authentication token
   */
  async refreshToken() {
    if (!this.currentSession || !navigator.onLine) {
      return false;
    }
    
    try {
      const response = await fetch(`${this.apiEndpoint}/auth/refresh`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.currentSession.token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          refreshToken: this.refreshToken || this.currentSession.refreshToken
        })
      });
      
      if (response.ok) {
        const result = await response.json();
        
        if (result.success && result.session) {
          // Update session
          this.currentSession = result.session;
          
          // Update stored session
          const sessionData = await StorageService.get('user_session');
          if (sessionData) {
            sessionData.session = result.session;
            await StorageService.set('user_session', sessionData);
          }
          
          await StorageService.set('current_session', result.session);
          this.setupSessionTimeout(result.session.expiresAt);
          
          // Emit refresh event
          EventBus.emit('auth:token-refreshed', {
            session: result.session,
            timestamp: Date.now()
          });
          
          console.log('Token refreshed successfully');
          return true;
        }
      } else {
        console.warn('Token refresh failed:', response.status);
        if (response.status === 401) {
          // Refresh token is invalid, need to re-authenticate
          this.handleSessionExpiry();
        }
      }
    } catch (error) {
      console.error('Token refresh error:', error);
    }
    
    return false;
  }

  /**
   * Handle session changes from other tabs
   */
  async handleSessionChange(newSessionData) {
    try {
      if (newSessionData) {
        const sessionData = JSON.parse(newSessionData);
        
        if (sessionData.user && sessionData.session) {
          // Session was set in another tab
          if (!this.isAuthenticated || this.currentUser?.id !== sessionData.user.id) {
            this.currentUser = sessionData.user;
            this.currentSession = sessionData.session;
            this.isAuthenticated = true;
            
            this.setupSessionTimeout(sessionData.session.expiresAt);
            
            EventBus.emit('auth:session-synced', {
              user: sessionData.user,
              session: sessionData.session
            });
          }
        }
      } else {
        // Session was cleared in another tab
        if (this.isAuthenticated) {
          await this.clearSession();
        }
      }
    } catch (error) {
      console.error('Session change handling error:', error);
    }
  }

  /**
   * Validate current session
   */
  async validateCurrentSession() {
    if (!this.isAuthenticated || !this.currentSession) {
      return false;
    }
    
    // Check expiry
    if (this.currentSession.expiresAt <= Date.now()) {
      await this.handleSessionExpiry();
      return false;
    }
    
    return true;
  }

  /**
   * Sync offline authentication when online
   */
  async syncOfflineAuth() {
    try {
      const pendingAuth = await StorageService.get('pending_google_auth');
      
      if (pendingAuth && pendingAuth.userInfo) {
        console.log('Syncing offline Google authentication...');
        
        // Try to authenticate with backend
        const result = await this.authenticateWithGoogle({
          userInfo: pendingAuth.userInfo,
          offline: true
        });
        
        if (result.success) {
          // Update current session with online session
          await this.setSession(result.user, result.session);
          
          // Remove pending auth
          await StorageService.remove('pending_google_auth');
          
          EventBus.emit('auth:offline-sync-complete', {
            user: result.user
          });
          
          console.log('Offline authentication synced successfully');
        }
      }
    } catch (error) {
      console.error('Offline auth sync error:', error);
    }
  }

  /**
   * Get API endpoint based on environment
   */
  getApiEndpoint() {
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      return 'http://localhost:3000/api'; // Development API
    } else {
      return 'https://your-hair-salon-api.com/api'; // Production API
    }
  }

  /**
   * Check if remember login is enabled
   */
  async shouldRememberLogin() {
    return await StorageService.get('remember_login') === true;
  }

  /**
   * Get authentication headers for API calls
   */
  getAuthHeaders() {
    if (!this.isAuthenticated || !this.currentSession) {
      return {};
    }
    
    return {
      'Authorization': `Bearer ${this.currentSession.token}`
    };
  }

  /**
   * Check if authentication is required for route
   */
  isAuthRequired(route) {
    const publicRoutes = ['login', 'signup', 'forgot-password'];
    const guestAllowedRoutes = ['dashboard', 'orders', 'profile'];
    
    if (publicRoutes.includes(route)) {
      return false;
    }
    
    if (this.isGuest() && guestAllowedRoutes.includes(route)) {
      return false;
    }
    
    return !this.isAuthenticated;
  }
}

// Export singleton instance
export default new AuthService();
