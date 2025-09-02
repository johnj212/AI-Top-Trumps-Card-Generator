import rateLimit from 'express-rate-limit';
import slowDown from 'express-slow-down';
import { saveLog } from '../storage.js';

// Global rate limiter - 100 requests per day per user/IP
export const globalRateLimiter = rateLimit({
  windowMs: 24 * 60 * 60 * 1000, // 24 hours
  max: 100, // 100 requests per day
  message: {
    error: 'Daily rate limit exceeded',
    message: 'You have exceeded the maximum number of requests (100) allowed per day. Please try again tomorrow.',
    resetTime: null // Will be set dynamically
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  
  // Custom key generator to use player code from JWT if available
  keyGenerator: (req, res) => {
    // If authenticated, use player code for rate limiting
    if (req.playerData && req.playerData.playerCode) {
      return `player:${req.playerData.playerCode}`;
    }
    // Fall back to default IP key generator
    return req.ip;
  },
  
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
    return req.path === '/api/health' || 
           req.path === '/api/auth/validate' ||
           (req.path === '/api/auth/login' && req.method === 'POST');
  },

  // Disable validation warnings
  validate: {
    keyGeneratorIpFallback: false
  }
});

// Speed limiter - slow down requests after 50 requests
export const speedLimiter = slowDown({
  windowMs: 24 * 60 * 60 * 1000, // 24 hours
  delayAfter: 50, // allow 50 requests per day at full speed
  delayMs: (hits) => 500, // add 500ms delay per request after delayAfter
  maxDelayMs: 10000, // max delay of 10 seconds
  
  // Use same key generator as rate limiter
  keyGenerator: (req, res) => {
    if (req.playerData && req.playerData.playerCode) {
      return `player:${req.playerData.playerCode}`;
    }
    return req.ip;
  },
  
  // Skip speed limiting for the same endpoints
  skip: (req, res) => {
    return req.path === '/api/health' || 
           req.path === '/api/auth/validate' ||
           (req.path === '/api/auth/login' && req.method === 'POST');
  },

  // Validation settings to suppress warnings
  validate: {
    delayMs: false
  }
});

// Middleware to log successful requests with rate limit headers
export const rateLimitLogger = async (req, res, next) => {
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