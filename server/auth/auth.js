import express from 'express';
import { validatePlayerCode, generateToken } from '../middleware/authMiddleware.js';
import { saveLog } from '../storage.js';

const router = express.Router();

// Login endpoint
router.post('/login', async (req, res) => {
  const { playerCode } = req.body;

  try {
    if (!playerCode || typeof playerCode !== 'string') {
      await saveLog('warning', 'Login attempt with invalid player code format', { playerCode });
      return res.status(400).json({
        success: false,
        error: 'Player code is required and must be a string'
      });
    }

    // Normalize player code (uppercase, trim)
    const normalizedCode = playerCode.trim().toUpperCase();

    if (!validatePlayerCode(normalizedCode)) {
      await saveLog('warning', 'Login attempt with invalid player code', { 
        attemptedCode: normalizedCode,
        clientIP: req.ip 
      });
      return res.status(401).json({
        success: false,
        error: 'Invalid player code. Please check your code and try again.'
      });
    }

    // Generate JWT token
    const token = generateToken(normalizedCode);

    // Set httpOnly cookie for secure token storage
    res.cookie('auth_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production' || process.env.NODE_ENV === 'uat',
      sameSite: 'lax',
      maxAge: 24 * 60 * 60 * 1000 // 24 hours
    });

    await saveLog('info', 'Successful login', {
      playerCode: normalizedCode,
      clientIP: req.ip,
      userAgent: req.headers['user-agent']
    });

    res.json({
      success: true,
      token, // Still include token for backward compatibility during transition
      playerData: {
        playerCode: normalizedCode,
        createdAt: new Date().toISOString(),
        lastActive: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    await saveLog('error', 'Login endpoint error', {
      error: error.message,
      playerCode: req.body.playerCode
    });
    
    res.status(500).json({
      success: false,
      error: 'An error occurred during login. Please try again.'
    });
  }
});

// Validate token endpoint (for checking if current token is valid)
router.get('/validate', async (req, res) => {
  // Try to get token from cookie first, then fallback to Authorization header
  let token = req.cookies?.auth_token;

  if (!token) {
    const authHeader = req.headers.authorization;
    token = authHeader && authHeader.split(' ')[1];
  }

  if (!token) {
    return res.status(401).json({
      success: false,
      error: 'No token provided'
    });
  }

  try {
    const jwt = await import('jsonwebtoken');
    const JWT_SECRET = process.env.JWT_SECRET;
    if (!JWT_SECRET) {
      throw new Error('JWT_SECRET not configured');
    }
    const decoded = jwt.default.verify(token, JWT_SECRET);

    await saveLog('info', 'Token validation successful', {
      playerCode: decoded.playerCode
    });

    res.json({
      success: true,
      playerData: {
        playerCode: decoded.playerCode,
        createdAt: decoded.createdAt,
        lastActive: new Date().toISOString()
      }
    });

  } catch (error) {
    await saveLog('warning', 'Token validation failed', {
      error: error.message
    });

    res.status(403).json({
      success: false,
      error: 'Invalid or expired token'
    });
  }
});

// Logout endpoint - clear the httpOnly cookie
router.post('/logout', async (req, res) => {
  try {
    const playerCode = req.playerData?.playerCode || 'unknown';

    // Clear the auth cookie
    res.clearCookie('auth_token', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production' || process.env.NODE_ENV === 'uat',
      sameSite: 'lax'
    });

    await saveLog('info', 'User logged out', {
      playerCode,
      clientIP: req.ip
    });

    res.json({
      success: true,
      message: 'Logged out successfully'
    });

  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({
      success: false,
      error: 'An error occurred during logout'
    });
  }
});

export default router;