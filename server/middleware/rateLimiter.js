import rateLimit from 'express-rate-limit';
import slowDown from 'express-slow-down';
import { saveLog } from '../storage-wrapper.js';

// Helper function to safely handle IP addresses including IPv6
const getClientIdentifier = (req, res) => {
  // If authenticated, use player code for rate limiting
  if (req.playerData && req.playerData.playerCode) {
    return `player:${req.playerData.playerCode}`;
  }

  // For development, use a simple key to avoid IPv6 validation
  if (process.env.NODE_ENV === 'development') {
    return 'dev-user';
  }

  // For production, use standard IP address handling
  // express-rate-limit will handle IPv6 addresses correctly if we don't provide a custom key
  return undefined; // Let express-rate-limit use default IP handling
};

// Global rate limiter - 100 requests per day per user/IP
export const globalRateLimiter = rateLimit({
  windowMs: 24 * 60 * 60 * 1000, // 24 hours
  max: process.env.NODE_ENV === 'development' ? 1000 : 100, // Higher limit in development
  message: {
    error: 'Daily rate limit exceeded',
    message: 'You have exceeded the maximum number of requests (100) allowed per day. Please try again tomorrow.',
    resetTime: null // Will be set dynamically
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  
  // Use the helper function for proper IP handling
  keyGenerator: getClientIdentifier,
  
  // Custom handler for when rate limit is exceeded
  handler: async (req, res, next) => {
    const resetTime = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const playerCode = req.playerData?.playerCode || 'anonymous';
    const clientIP = req.ip || req.connection.remoteAddress;
    
    // Log rate limit exceeded event
    await saveLog('warning', 'Daily rate limit exceeded', {
      playerCode,
      clientIP,
      userAgent: req.headers['user-agent'],
      endpoint: req.path,
      method: req.method,
      resetTime: resetTime.toISOString(),
      limit: 100,
      window: '24 hours'
    }).catch(console.error);

    const response = {
      error: 'Daily rate limit exceeded',
      message: 'You have exceeded the maximum number of requests (100) allowed per day. Please try again tomorrow.',
      resetTime: resetTime.toISOString(),
      limit: 100,
      window: '24 hours'
    };

    res.status(429).json(response);
  },

  // Skip rate limiting for health checks and auth validation
  skip: (req, res) => {
    // Skip rate limiting completely in development
    if (process.env.NODE_ENV === 'development') {
      return true;
    }
    return req.path === '/api/health' ||
           req.path === '/api/auth/validate' ||
           (req.path === '/api/auth/login' && req.method === 'POST');
  }
});

// Speed limiter - slow down requests after 50 requests
export const speedLimiter = slowDown({
  windowMs: 24 * 60 * 60 * 1000, // 24 hours
  delayAfter: process.env.NODE_ENV === 'development' ? 1000 : 50, // Higher limit in development
  delayMs: (hits) => process.env.NODE_ENV === 'development' ? 0 : 500, // No delay in development
  maxDelayMs: process.env.NODE_ENV === 'development' ? 0 : 10000, // No max delay in development
  
  // Use same key generator as rate limiter
  keyGenerator: getClientIdentifier,
  
  // Skip speed limiting for the same endpoints
  skip: (req, res) => {
    // Skip speed limiting completely in development
    if (process.env.NODE_ENV === 'development') {
      return true;
    }
    return req.path === '/api/health' ||
           req.path === '/api/auth/validate' ||
           (req.path === '/api/auth/login' && req.method === 'POST');
  }
});

// Middleware to log successful requests with rate limit headers
export const rateLimitLogger = async (req, res, next) => {
  // Skip detailed logging in development to prevent cloud storage issues
  if (process.env.NODE_ENV === 'development') {
    return next();
  }
  
  // Store original res.json to intercept successful responses
  const originalJson = res.json;
  
  res.json = function(data) {
    // Only log successful API requests (not auth or health)
    if (res.statusCode < 400 && 
        (req.path.startsWith('/api/generate') || req.path.startsWith('/api/cards'))) {
      
      const playerCode = req.playerData?.playerCode || 'anonymous';
      const clientIP = req.ip || req.connection.remoteAddress;
      
      // Extract rate limit info from headers
      const remaining = res.getHeader('RateLimit-Remaining') || 'unknown';
      const limit = res.getHeader('RateLimit-Limit') || 'unknown';
      const reset = res.getHeader('RateLimit-Reset') || 'unknown';
      
      // Log the successful request with rate limit info
      saveLog('info', 'API request completed', {
        playerCode,
        clientIP,
        userAgent: req.headers['user-agent'],
        endpoint: req.path,
        method: req.method,
        statusCode: res.statusCode,
        rateLimit: {
          remaining: remaining,
          limit: limit,
          reset: new Date(reset * 1000).toISOString()
        }
      }).catch(console.error);
    }
    
    return originalJson.call(this, data);
  };
  
  next();
};