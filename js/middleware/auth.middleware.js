/**
 * Authentication Middleware
 * Handles route protection, authentication checks, and user session validation
 */

import AuthService from '../services/auth.service.js';
import EventBus from '../core/eventBus.js';
import NotificationService from '../services/notification.service.js';

export class AuthMiddleware {
  constructor() {
    this.protectedRoutes = [
      'dashboard',
      'orders',
      'order-form',
      'order-list', 
      'profile',
      'settings',
      'reports',
      'customers',
      'services'
    ];
    
    this.adminRoutes = [
      'settings',
      'reports',
      'users',
      'admin'
    ];
    
    this.guestRestrictedRoutes = [
      'order-form',
      'settings',
      'reports',
      'customers',
      'services'
    ];
    
    this.publicRoutes = [
      'login',
      'signup',
      'forgot-password',
      'reset-password',
      'privacy',
      'terms'
    ];
    
    this.init();
  }

  init() {
    // Listen for route changes
    EventBus.on('router:before-route-change', this.handleRouteChange.bind(this));
    
    // Listen for authentication events
    EventBus.on('auth:session-expired', this.handleSessionExpired.bind(this));
    EventBus.on('auth:login-required', this.handleLoginRequired.bind(this));
    EventBus.on('auth:session-restored', this.handleSessionRestored.bind(this));
    
    console.log('AuthMiddleware initialized');
  }

  /**
   * Handle route changes and check authentication
   */
  async handleRouteChange(event) {
    const { route, params, query } = event;
    
    try {
      // Check if route requires authentication
      const authRequired = this.isAuthRequired(route);
      const isAuthenticated = AuthService.isAuthenticated;
      
      console.log(`Route: ${route}, Auth required: ${authRequired}, Authenticated: ${isAuthenticated}`);
      
      // Public routes - allow access
      if (this.publicRoutes.includes(route)) {
        // If user is already authenticated and trying to access login, redirect to dashboard
        if (route === 'login' && isAuthenticated) {
          EventBus.emit('router:navigate', { 
            route: 'dashboard', 
            replace: true 
          });
          return false;
        }
        return true;
      }
      
      // Protected routes
      if (authRequired && !isAuthenticated) {
        // Save current route for redirect after login
        const redirectUrl = this.buildRedirectUrl(route, params, query);
        
        this.redirectToLogin(redirectUrl);
        return false;
      }
      
      // Check role-based access
      if (isAuthenticated) {
        const hasAccess = await this.checkRouteAccess(route);
        
        if (!hasAccess) {
          this.handleAccessDenied(route);
          return false;
        }
        
        // Validate session for protected routes
        if (authRequired) {
          const sessionValid = await AuthService.validateCurrentSession();
          if (!sessionValid) {
            this.redirectToLogin();
            return false;
          }
        }
      }
      
      return true;
      
    } catch (error) {
      console.error('Route change error:', error);
      
      // On error, redirect to safe route
      if (AuthService.isAuthenticated) {
        EventBus.emit('router:navigate', { 
          route: 'dashboard', 
          replace: true 
        });
      } else {
        this.redirectToLogin();
      }
      
      return false;
    }
  }

  /**
   * Check if route requires authentication
   */
  isAuthRequired(route) {
    return this.protectedRoutes.includes(route);
  }

  /**
   * Check if user has access to route based on role and permissions
   */
  async checkRouteAccess(route) {
    const user = AuthService.getCurrentUser();
    
    if (!user) {
      return false;
    }
    
    // Admin routes
    if (this.adminRoutes.includes(route)) {
      return AuthService.hasRole('admin') || AuthService.hasPermission('admin_access');
    }
    
    // Guest restricted routes
    if (this.guestRestrictedRoutes.includes(route)) {
      if (AuthService.isGuest()) {
        return false;
      }
    }
    
    // Offline restrictions
    if (AuthService.isOffline()) {
      const offlineAllowedRoutes = ['dashboard', 'orders', 'order-list', 'profile'];
      return offlineAllowedRoutes.includes(route);
    }
    
    // Default: allow access for authenticated users
    return true;
  }

  /**
   * Handle session expired
   */
  handleSessionExpired(event) {
    const { user } = event;
    
    NotificationService.warning('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.', {
      duration: 5000,
      actions: [{
        text: 'Đăng nhập',
        action: () => this.redirectToLogin()
      }]
    });
    
    // Redirect to login after a short delay
    setTimeout(() => {
      this.redirectToLogin();
    }, 2000);
  }

  /**
   * Handle login required
   */
  handleLoginRequired(event) {
    const { reason } = event;
    
    let message = 'Vui lòng đăng nhập để tiếp tục.';
    
    if (reason === 'session_expired') {
      message = 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.';
    } else if (reason === 'access_denied') {
      message = 'Bạn không có quyền truy cập. Vui lòng đăng nhập với tài khoản khác.';
    }
    
    NotificationService.info(message, {
      duration: 4000
    });
    
    this.redirectToLogin();
  }

  /**
   * Handle session restored
   */
  handleSessionRestored(event) {
    const { user } = event;
    
    // Check if there's a pending redirect
    const pendingRedirect = this.getPendingRedirect();
    
    if (pendingRedirect) {
      this.clearPendingRedirect();
      
      // Navigate to pending redirect
      EventBus.emit('router:navigate', { 
        route: pendingRedirect.route,
        params: pendingRedirect.params,
        query: pendingRedirect.query,
        replace: true
      });
    }
  }

  /**
   * Handle access denied
   */
  handleAccessDenied(route) {
    console.warn(`Access denied to route: ${route}`);
    
    const user = AuthService.getCurrentUser();
    
    if (AuthService.isGuest()) {
      NotificationService.warning('Tính năng này không khả dụng cho khách. Vui lòng đăng nhập để truy cập.', {
        duration: 5000,
        actions: [{
          text: 'Đăng nhập',
          action: () => this.redirectToLogin()
        }]
      });
      
      // Redirect guest to dashboard
      EventBus.emit('router:navigate', { 
        route: 'dashboard', 
        replace: true 
      });
      
    } else if (this.adminRoutes.includes(route)) {
      NotificationService.error('Bạn không có quyền admin để truy cập tính năng này.', {
        duration: 4000
      });
      
      // Redirect to dashboard
      EventBus.emit('router:navigate', { 
        route: 'dashboard', 
        replace: true 
      });
      
    } else {
      NotificationService.error('Bạn không có quyền truy cập tính năng này.', {
        duration: 4000
      });
      
      // Redirect to dashboard
      EventBus.emit('router:navigate', { 
        route: 'dashboard', 
        replace: true 
      });
    }
  }

  /**
   * Redirect to login page
   */
  redirectToLogin(redirectUrl = null) {
    const currentRoute = window.location.hash.substring(1) || '/dashboard';
    
    // Save current route for redirect after login
    if (redirectUrl || (currentRoute !== '/login' && this.isAuthRequired(currentRoute.substring(1)))) {
      this.savePendingRedirect(redirectUrl || currentRoute);
    }
    
    // Navigate to login
    EventBus.emit('router:navigate', { 
      route: 'login',
      query: redirectUrl ? { redirect: redirectUrl } : undefined,
      replace: true 
    });
  }

  /**
   * Build redirect URL from route, params, and query
   */
  buildRedirectUrl(route, params = {}, query = {}) {
    let url = `/${route}`;
    
    // Add params to URL
    if (params && Object.keys(params).length > 0) {
      Object.keys(params).forEach(key => {
        url = url.replace(`:${key}`, params[key]);
      });
    }
    
    // Add query parameters
    if (query && Object.keys(query).length > 0) {
      const queryString = Object.keys(query)
        .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(query[key])}`)
        .join('&');
      url += `?${queryString}`;
    }
    
    return url;
  }

  /**
   * Save pending redirect for after login
   */
  savePendingRedirect(redirectUrl) {
    try {
      sessionStorage.setItem('auth_redirect', JSON.stringify({
        url: redirectUrl,
        timestamp: Date.now()
      }));
    } catch (error) {
      console.error('Failed to save pending redirect:', error);
    }
  }

  /**
   * Get pending redirect
   */
  getPendingRedirect() {
    try {
      const stored = sessionStorage.getItem('auth_redirect');
      if (stored) {
        const redirect = JSON.parse(stored);
        
        // Check if redirect is not too old (30 minutes)
        if (Date.now() - redirect.timestamp < 30 * 60 * 1000) {
          return this.parseRedirectUrl(redirect.url);
        } else {
          this.clearPendingRedirect();
        }
      }
    } catch (error) {
      console.error('Failed to get pending redirect:', error);
      this.clearPendingRedirect();
    }
    
    return null;
  }

  /**
   * Clear pending redirect
   */
  clearPendingRedirect() {
    try {
      sessionStorage.removeItem('auth_redirect');
    } catch (error) {
      console.error('Failed to clear pending redirect:', error);
    }
  }

  /**
   * Parse redirect URL to route, params, and query
   */
  parseRedirectUrl(url) {
    try {
      const [pathname, search] = url.split('?');
      const route = pathname.substring(1) || 'dashboard';
      
      const query = {};
      if (search) {
        search.split('&').forEach(param => {
          const [key, value] = param.split('=');
          query[decodeURIComponent(key)] = decodeURIComponent(value);
        });
      }
      
      return {
        route,
        params: {}, // TODO: Extract params from route if needed
        query
      };
    } catch (error) {
      console.error('Failed to parse redirect URL:', error);
      return { route: 'dashboard', params: {}, query: {} };
    }
  }

  /**
   * Check if user can access admin features
   */
  canAccessAdmin() {
    return AuthService.hasRole('admin') || AuthService.hasPermission('admin_access');
  }

  /**
   * Check if user can modify orders
   */
  canModifyOrders() {
    if (AuthService.isGuest()) {
      return false;
    }
    
    return AuthService.hasPermission('write') || AuthService.hasPermission('write_offline');
  }

  /**
   * Check if user can view reports
   */
  canViewReports() {
    return this.canAccessAdmin();
  }

  /**
   * Get allowed routes for current user
   */
  getAllowedRoutes() {
    const user = AuthService.getCurrentUser();
    
    if (!AuthService.isAuthenticated) {
      return this.publicRoutes;
    }
    
    let allowedRoutes = [...this.publicRoutes, ...this.protectedRoutes];
    
    // Remove admin routes if not admin
    if (!this.canAccessAdmin()) {
      allowedRoutes = allowedRoutes.filter(route => !this.adminRoutes.includes(route));
    }
    
    // Remove guest restricted routes if guest
    if (AuthService.isGuest()) {
      allowedRoutes = allowedRoutes.filter(route => !this.guestRestrictedRoutes.includes(route));
    }
    
    // Filter offline routes if offline
    if (AuthService.isOffline()) {
      const offlineAllowed = ['dashboard', 'orders', 'order-list', 'profile', 'login'];
      allowedRoutes = allowedRoutes.filter(route => offlineAllowed.includes(route));
    }
    
    return allowedRoutes;
  }

  /**
   * Middleware function for route guards
   */
  async guard(route, params = {}, query = {}) {
    return await this.handleRouteChange({
      route,
      params,
      query
    });
  }

  /**
   * Check if route needs authentication warning
   */
  needsAuthWarning(route) {
    return this.protectedRoutes.includes(route) && !AuthService.isAuthenticated;
  }

  /**
   * Show authentication warning for protected features
   */
  showAuthWarning(feature = 'tính năng này') {
    NotificationService.warning(`Vui lòng đăng nhập để sử dụng ${feature}.`, {
      duration: 4000,
      actions: [{
        text: 'Đăng nhập',
        action: () => this.redirectToLogin()
      }]
    });
  }
}

// Export singleton instance
export default new AuthMiddleware();
