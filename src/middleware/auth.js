const admin = require('../config/firebase');
const User = require('../models/User');

// Verify Firebase ID token
const verifyToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'No authorization token provided',
      });
    }

    const token = authHeader.split(' ')[1];

    const decodedToken = await admin.auth().verifyIdToken(token);
    req.user = decodedToken;
    req.firebaseUser = decodedToken;
    next();
  } catch (error) {
    console.error('Token verification error:', error.message);
    return res.status(401).json({
      success: false,
      message: 'Invalid or expired token',
    });
  }
};

// Require authentication and attach DB user
const requireAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'No authorization token provided',
      });
    }

    const token = authHeader.split(' ')[1];
    const decodedToken = await admin.auth().verifyIdToken(token);
    req.firebaseUser = decodedToken;

    // Get user from DB
    let dbUser = await User.findOne({ uid: decodedToken.uid });

    if (!dbUser) {
      // Auto-create user if not found
      dbUser = await User.create({
        uid: decodedToken.uid,
        email: decodedToken.email,
        displayName: decodedToken.name || decodedToken.email?.split('@')[0],
        photoURL: decodedToken.picture || '',
        role: 'user',
        isActive: true,
      });
    }

    if (!dbUser.isActive) {
      return res.status(403).json({
        success: false,
        message: 'Account has been deactivated',
      });
    }

    req.user = dbUser;
    next();
  } catch (error) {
    console.error('Auth middleware error:', error.message);
    return res.status(401).json({
      success: false,
      message: 'Authentication failed',
    });
  }
};

// Require admin role
const requireAdmin = async (req, res, next) => {
  await requireAuth(req, res, () => {
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Admin access required',
      });
    }
    next();
  });
};

// Require admin or sub-admin role
const requireSubAdmin = async (req, res, next) => {
  await requireAuth(req, res, () => {
    if (!['admin', 'sub-admin'].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Admin or Sub-Admin access required',
      });
    }
    next();
  });
};

module.exports = { verifyToken, requireAuth, requireAdmin, requireSubAdmin };
