/**
 * Router Guard - Authentication and Route Protection
 * Integrates with routing system to provide authentication checks
 */

import AuthMiddleware from '../middleware/auth.middleware.js';
import AuthService from '../services/auth.service.js';
import EventBus from './eventBus.js';
import NotificationService from '../services/notification.service.js';

export class RouterGuard {
  constructor() {
    this.isInitialized = false;
    this.pendingRoute = null;
    this.init();
  }

  init() {
    // Listen for auth events
    EventBus.on('auth:session-set', this.handleAuthStateChange.bind(this));
    EventBus.on('auth:session-cleared', this.handleAuthStateChange.bind(this));
    EventBus.on('auth:session-restored', this.handleSessionRestored.bind(this));
    
    this.isInitialized = true;
    console.log('RouterGuard initialized');
  }

  /**
   * Guard function to be called before each route
   */
  async beforeRouteEnter(to, from, next) {
    try {
      console.log(`RouterGuard: Checking route ${to.route}`);
      
      // Wait for auth service to be ready
      if (!AuthService.isAuthenticated) {
        await this.waitForAuthService();
      }
      
      // Check if route is allowed
      const allowed = await AuthMiddleware.guard(to.route, to.params, to.query);
      
      if (allowed) {
        next();
      } else {
        console.log(`RouterGuard: Route ${to.route} blocked`);
        // Route was blocked by middleware, don't proceed
        next(false);
      }
      
    } catch (error) {
      console.error('RouterGuard error:', error);
      
      // On error, allow navigation but log error
      NotificationService.error('Lỗi kiểm tra quyền truy cập', {
        duration: 3000
      });
      
      next();
    }
  }

  /**
   * Guard function called after route enters
   */
  async afterRouteEnter(to, from) {
    try {
      // Update page title based on user and route
      this.updatePageTitle(to.route);
      
      // Track route for analytics if needed
      this.trackRouteAccess(to.route, AuthService.getCurrentUser());
      
      // Emit route entered event
      EventBus.emit('router:route-entered', {
        route: to.route,
        params: to.params,
        query: to.query,
        user: AuthService.getCurrentUser()
      });
      
    } catch (error) {
      console.error('RouterGuard afterRouteEnter error:', error);
    }
  }

  /**
   * Wait for auth service to be ready
   */
  async waitForAuthService(timeout = 5000) {
    const start = Date.now();
    
    while (!AuthService.isAuthenticated && Date.now() - start < timeout) {
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Check if session was restored
      if (AuthService.isAuthenticated) {
        break;
      }
    }
    
    console.log('Auth service ready, authenticated:', AuthService.isAuthenticated);
  }

  /**
   * Handle authentication state changes
   */
  handleAuthStateChange(event) {
    const { user } = event;
    
    // If there's a pending route and user is now authenticated
    if (this.pendingRoute && AuthService.isAuthenticated) {
      this.processPendingRoute();
    }
    
    // Update UI state
    this.updateAuthState();
  }

  /**
   * Handle session restored
   */
  handleSessionRestored(event) {
    const { user } = event;
    
    console.log('Session restored, updating router state');
    
    // Update navigation based on restored session
    this.updateNavigationForUser(user);
  }

  /**
   * Process pending route after authentication
   */
  processPendingRoute() {
    if (!this.pendingRoute) return;
    
    const route = this.pendingRoute;
    this.pendingRoute = null;
    
    console.log('Processing pending route:', route);
    
    // Navigate to pending route
    EventBus.emit('router:navigate', {
      route: route.route,
      params: route.params,
      query: route.query,
      replace: true
    });
  }

  /**
   * Set pending route
   */
  setPendingRoute(route, params = {}, query = {}) {
    this.pendingRoute = {
      route,
      params,
      query
    };
    
    console.log('Pending route set:', this.pendingRoute);
  }

  /**
   * Clear pending route
   */
  clearPendingRoute() {
    this.pendingRoute = null;
  }

  /**
   * Update page title based on route and user
   */
  updatePageTitle(route) {
    const user = AuthService.getCurrentUser();
    const baseTitle = 'Hair Salon PWA';
    
    const routeTitles = {
      'login': 'Đăng nhập',
      'dashboard': 'Bảng điều khiển',
      'orders': 'Đơn hàng',
      'order-form': 'Tạo đơn hàng',
      'order-list': 'Danh sách đơn hàng',
      'profile': 'Hồ sơ cá nhân',
      'settings': 'Cài đặt',
      'reports': 'Báo cáo',
      'customers': 'Khách hàng',
      'services': 'Dịch vụ'
    };
    
    let title = routeTitles[route] || route;
    
    // Add user info to title
    if (user) {
      if (AuthService.isGuest()) {
        title += ' - Khách';
      } else if (AuthService.isOffline()) {
        title += ' - Ngoại tuyến';
      } else {
        title += ` - ${user.name}`;
      }
    }
    
    document.title = `${title} | ${baseTitle}`;
  }

  /**
   * Track route access for analytics
   */
  trackRouteAccess(route, user) {
    try {
      // Basic analytics tracking
      const trackingData = {
        route,
        timestamp: Date.now(),
        user_id: user?.id || 'anonymous',
        user_role: user?.role || 'anonymous',
        user_provider: user?.provider || 'none',
        offline: user?.offline || false
      };
      
      // Send to analytics service if available
      if (window.gtag) {
        window.gtag('event', 'page_view', {
          page_title: document.title,
          page_location: window.location.href,
          custom_map: {
            user_role: user?.role,
            auth_provider: user?.provider
          }
        });
      }
      
      // Store in local analytics if needed
      this.storeLocalAnalytics(trackingData);
      
    } catch (error) {
      console.error('Route tracking error:', error);
    }
  }

  /**
   * Store analytics data locally
   */
  async storeLocalAnalytics(data) {
    try {
      const existing = JSON.parse(localStorage.getItem('route_analytics') || '[]');
      existing.push(data);
      
      // Keep only last 100 entries
      if (existing.length > 100) {
        existing.splice(0, existing.length - 100);
      }
      
      localStorage.setItem('route_analytics', JSON.stringify(existing));
    } catch (error) {
      console.error('Local analytics storage error:', error);
    }
  }

  /**
   * Update authentication state in UI
   */
  updateAuthState() {
    const isAuthenticated = AuthService.isAuthenticated;
    const user = AuthService.getCurrentUser();
    
    // Update body classes
    document.body.classList.toggle('authenticated', isAuthenticated);
    document.body.classList.toggle('guest', AuthService.isGuest());
    document.body.classList.toggle('offline', AuthService.isOffline());
    
    // Update navigation elements
    const loginElements = document.querySelectorAll('[data-auth-hide]');
    const logoutElements = document.querySelectorAll('[data-auth-show]');
    const guestElements = document.querySelectorAll('[data-guest-hide]');
    const adminElements = document.querySelectorAll('[data-admin-show]');
    
    loginElements.forEach(el => {
      el.style.display = isAuthenticated ? 'none' : '';
    });
    
    logoutElements.forEach(el => {
      el.style.display = isAuthenticated ? '' : 'none';
    });
    
    guestElements.forEach(el => {
      el.style.display = AuthService.isGuest() ? 'none' : '';
    });
    
    adminElements.forEach(el => {
      el.style.display = AuthMiddleware.canAccessAdmin() ? '' : 'none';
    });
    
    // Update user info displays
    const userNameElements = document.querySelectorAll('[data-user-name]');
    const userEmailElements = document.querySelectorAll('[data-user-email]');
    const userAvatarElements = document.querySelectorAll('[data-user-avatar]');
    
    if (user) {
      userNameElements.forEach(el => el.textContent = user.name);
      userEmailElements.forEach(el => el.textContent = user.email || '');
      userAvatarElements.forEach(el => {
        if (user.picture) {
          el.src = user.picture;
          el.style.display = '';
        } else {
          el.style.display = 'none';
        }
      });
    }
  }

  /**
   * Update navigation for authenticated user
   */
  updateNavigationForUser(user) {
    // Update navigation menu based on user permissions
    const allowedRoutes = AuthMiddleware.getAllowedRoutes();
    
    // Hide/show navigation items
    const navItems = document.querySelectorAll('[data-route]');
    navItems.forEach(item => {
      const route = item.dataset.route;
      const isAllowed = allowedRoutes.includes(route);
      item.style.display = isAllowed ? '' : 'none';
    });
    
    // Update active states
    this.updateActiveNavigation();
  }

  /**
   * Update active navigation based on current route
   */
  updateActiveNavigation() {
    const currentRoute = window.location.hash.substring(2) || 'dashboard';
    
    // Remove active class from all navigation items
    document.querySelectorAll('[data-route]').forEach(item => {
      item.classList.remove('active');
    });
    
    // Add active class to current route
    const activeItem = document.querySelector(`[data-route="${currentRoute}"]`);
    if (activeItem) {
      activeItem.classList.add('active');
    }
  }

  /**
   * Check if navigation is allowed for route
   */
  isNavigationAllowed(route) {
    const allowedRoutes = AuthMiddleware.getAllowedRoutes();
    return allowedRoutes.includes(route);
  }

  /**
   * Handle navigation attempt to protected route
   */
  handleProtectedNavigation(route) {
    if (!AuthService.isAuthenticated) {
      AuthMiddleware.showAuthWarning(`truy cập ${route}`);
      return false;
    }
    
    if (!this.isNavigationAllowed(route)) {
      NotificationService.warning('Bạn không có quyền truy cập tính năng này.', {
        duration: 3000
      });
      return false;
    }
    
    return true;
  }

  /**
   * Get redirect route for unauthenticated users
   */
  getUnauthenticatedRedirect() {
    return 'login';
  }

  /**
   * Get default route for authenticated users
   */
  getAuthenticatedDefault() {
    return 'dashboard';
  }
}

// Export singleton instance
export default new RouterGuard();
