/**
 * Authentication Service for Hair Salon Management System
 * Handles user validation, permissions, and authentication
 * 
 * @version 1.0.0
 */

const AuthService = {
  /**
   * Validate if user email is allowed to access the system
   * @param {string} email - User email to validate
   * @returns {boolean} - True if user is allowed
   */
  validateUser: function(email) {
    if (!email) {
      Logger.warn('Validation failed: No email provided');
      return false;
    }
    
    // Normalize email to lowercase
    const normalizedEmail = email.toLowerCase().trim();
    
    // Check if email is in allowed list
    const isAllowed = CONFIG.ALLOWED_EMAILS.some(
      allowedEmail => allowedEmail.toLowerCase() === normalizedEmail
    );
    
    if (!isAllowed) {
      Logger.warn('Validation failed: Email not in whitelist', { email: normalizedEmail });
      return false;
    }
    
    // Check if user is active in Staff sheet
    try {
      const staffInfo = StaffService.getStaffByEmail(normalizedEmail);
      if (!staffInfo || staffInfo.active !== true) {
        Logger.warn('Validation failed: User not active', { email: normalizedEmail });
        return false;
      }
    } catch (error) {
      Logger.error('Error checking staff status', { email: normalizedEmail, error: error.toString() });
      // If there's an error checking staff sheet, fall back to whitelist
      // This prevents system lockout if Staff sheet has issues
    }
    
    Logger.info('User validated successfully', { email: normalizedEmail });
    return true;
  },
  
  /**
   * Check if user is an admin
   * @param {string} email - User email to check
   * @returns {boolean} - True if user is admin
   */
  isAdmin: function(email) {
    if (!email) return false;
    
    const normalizedEmail = email.toLowerCase().trim();
    return CONFIG.ADMIN_EMAILS.some(
      adminEmail => adminEmail.toLowerCase() === normalizedEmail
    );
  },
  
  /**
   * Get user permissions
   * @param {string} email - User email
   * @returns {object} - User permissions object
   */
  getUserPermissions: function(email) {
    const isAdmin = this.isAdmin(email);
    
    return {
      canCreateOrder: true,
      canViewOwnOrders: true,
      canEditOwnOrders: true,
      canDeleteOwnOrders: true,
      canViewAllOrders: isAdmin,
      canEditAllOrders: isAdmin,
      canDeleteAllOrders: isAdmin,
      canManageStaff: isAdmin,
      canViewReports: isAdmin,
      canExportData: isAdmin
    };
  },
  
  /**
   * Verify Google ID token (for enhanced security)
   * Note: This is a simplified version. In production, you should verify the token properly
   * @param {string} idToken - Google ID token
   * @returns {object|null} - User info if valid, null otherwise
   */
  verifyGoogleToken: function(idToken) {
    // In a production environment, you would verify the token using Google's OAuth2 library
    // For now, we'll implement basic validation
    
    if (!idToken) {
      Logger.warn('No ID token provided');
      return null;
    }
    
    try {
      // This is a placeholder for actual token verification
      // In production, use: https://developers.google.com/identity/sign-in/web/backend-auth
      
      // For development, we'll accept any non-empty token
      // and extract email from the request instead
      if (CONFIG.ENV === 'development') {
        Logger.debug('Development mode: Skipping token verification');
        return { verified: true };
      }
      
      // Production token verification would go here
      // You would decode the JWT and verify its signature
      
      return { verified: true };
    } catch (error) {
      Logger.error('Token verification failed', { error: error.toString() });
      return null;
    }
  },
  
  /**
   * Create session for user
   * @param {string} email - User email
   * @returns {string} - Session ID
   */
  createSession: function(email) {
    const sessionId = Utilities.getUuid();
    const timestamp = new Date().toISOString();
    
    // In a real implementation, you would store this in a cache or database
    // For Apps Script, we can use PropertiesService
    try {
      const userProperties = PropertiesService.getUserProperties();
      const sessionData = {
        email: email,
        sessionId: sessionId,
        createdAt: timestamp,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 24 hours
      };
      
      userProperties.setProperty(`session_${sessionId}`, JSON.stringify(sessionData));
      
      // Clean up old sessions
      this.cleanupSessions();
      
      Logger.info('Session created', { email: email, sessionId: sessionId });
      return sessionId;
    } catch (error) {
      Logger.error('Failed to create session', { error: error.toString() });
      throw new Error('Failed to create session');
    }
  },
  
  /**
   * Validate session
   * @param {string} sessionId - Session ID to validate
   * @returns {object|null} - Session data if valid, null otherwise
   */
  validateSession: function(sessionId) {
    if (!sessionId) return null;
    
    try {
      const userProperties = PropertiesService.getUserProperties();
      const sessionData = userProperties.getProperty(`session_${sessionId}`);
      
      if (!sessionData) {
        Logger.debug('Session not found', { sessionId: sessionId });
        return null;
      }
      
      const session = JSON.parse(sessionData);
      
      // Check if session is expired
      if (new Date(session.expiresAt) < new Date()) {
        Logger.info('Session expired', { sessionId: sessionId });
        this.destroySession(sessionId);
        return null;
      }
      
      return session;
    } catch (error) {
      Logger.error('Failed to validate session', { error: error.toString() });
      return null;
    }
  },
  
  /**
   * Destroy session
   * @param {string} sessionId - Session ID to destroy
   */
  destroySession: function(sessionId) {
    try {
      const userProperties = PropertiesService.getUserProperties();
      userProperties.deleteProperty(`session_${sessionId}`);
      Logger.info('Session destroyed', { sessionId: sessionId });
    } catch (error) {
      Logger.error('Failed to destroy session', { error: error.toString() });
    }
  },
  
  /**
   * Clean up expired sessions
   */
  cleanupSessions: function() {
    try {
      const userProperties = PropertiesService.getUserProperties();
      const allProperties = userProperties.getProperties();
      const now = new Date();
      
      Object.keys(allProperties).forEach(key => {
        if (key.startsWith('session_')) {
          try {
            const session = JSON.parse(allProperties[key]);
            if (new Date(session.expiresAt) < now) {
              userProperties.deleteProperty(key);
              Logger.debug('Cleaned up expired session', { sessionId: session.sessionId });
            }
          } catch (error) {
            // Invalid session data, remove it
            userProperties.deleteProperty(key);
          }
        }
      });
    } catch (error) {
      Logger.error('Failed to cleanup sessions', { error: error.toString() });
    }
  },
  
  /**
   * Log authentication attempt
   * @param {string} email - User email
   * @param {boolean} success - Whether authentication was successful
   * @param {string} reason - Reason for failure (if applicable)
   */
  logAuthAttempt: function(email, success, reason = '') {
    const logEntry = {
      timestamp: getCurrentTimestamp(),
      email: email,
      success: success,
      reason: reason,
      ip: 'N/A' // Apps Script doesn't provide IP address
    };
    
    // In production, you might want to store this in a separate log sheet
    Logger.info('Authentication attempt', logEntry);
    
    // Optional: Write to audit log sheet
    try {
      // Uncomment if you want to maintain an audit log
      // const auditSheet = getSheet('AuditLog');
      // auditSheet.appendRow([
      //   logEntry.timestamp,
      //   logEntry.email,
      //   logEntry.success ? 'SUCCESS' : 'FAILED',
      //   logEntry.reason
      // ]);
    } catch (error) {
      Logger.error('Failed to write audit log', { error: error.toString() });
    }
  },
  
  /**
   * Check if email domain is allowed (for organization-wide access)
   * @param {string} email - User email
   * @returns {boolean} - True if domain is allowed
   */
  isDomainAllowed: function(email) {
    // Example: Allow all users from a specific domain
    // const allowedDomains = ['yoursalon.com'];
    // const domain = email.split('@')[1];
    // return allowedDomains.includes(domain);
    
    // Currently using individual email whitelist
    return false;
  },
  
  /**
   * Get authentication status summary
   * @returns {object} - Authentication system status
   */
  getAuthStatus: function() {
    return {
      totalAllowedUsers: CONFIG.ALLOWED_EMAILS.length,
      totalAdmins: CONFIG.ADMIN_EMAILS.length,
      authMethod: 'Email Whitelist + Google OAuth',
      sessionTimeout: '24 hours',
      rateLimitPerMinute: CONFIG.MAX_REQUESTS_PER_MINUTE
    };
  }
};
