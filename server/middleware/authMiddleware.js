import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'ai-top-trumps-secret-key-2025';
const VALID_PLAYER_CODE = 'TIGER34';

export const verifyToken = (req, res, next) => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1];

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