import jwt from 'jsonwebtoken';

// Require JWT_SECRET environment variable - no fallback for security
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  console.error('❌ FATAL: JWT_SECRET environment variable is not set');
  process.exit(1);
}

const VALID_PLAYER_CODE = 'TIGER34';

export const verifyToken = (req, res, next) => {
  // Try to get token from httpOnly cookie first, then fallback to Authorization header
  let token = req.cookies?.auth_token;

  // Fallback to Authorization header for backward compatibility during transition
  if (!token) {
    const authHeader = req.headers.authorization;
    token = authHeader && authHeader.split(' ')[1];
  }

  if (!token) {
    return res.status(401).json({ error: 'Access denied. No token provided.' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.playerData = decoded;
    next();
  } catch (error) {
    return res.status(403).json({ error: 'Invalid or expired token.' });
  }
};

export const validatePlayerCode = (playerCode) => {
  return playerCode === VALID_PLAYER_CODE;
};

export const generateToken = (playerCode) => {
  return jwt.sign(
    { 
      playerCode,
      createdAt: new Date().toISOString(),
      lastActive: new Date().toISOString()
    },
    JWT_SECRET,
    { expiresIn: '24h' }
  );
};