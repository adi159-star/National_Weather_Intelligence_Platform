import admin from '../config/firebaseAdmin.js';
import User from '../models/User.js';

export const verifyFirebaseToken = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      message: 'Unauthorized: Missing or malformed Authorization header'
    });
  }

  const token = authHeader.split('Bearer ')[1]?.trim();

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Unauthorized: No token provided'
    });
  }

  try {
    const decodedToken = await admin.auth().verifyIdToken(token);
    req.user = decodedToken;
    next();
  } catch (error) {
    console.error('Firebase token verification error:', error.message);
    return res.status(401).json({
      success: false,
      message: 'Unauthorized: Invalid or expired token',
      error: error.message
    });
  }
};

/**
 * requireAdmin Middleware
 * Verifies that the authenticated user possesses the 'admin' role in MongoDB.
 * Rejects unauthenticated requests with 401 and non-admin requests with 403.
 * Strictly queries the MongoDB database — never trusts a client-supplied role.
 */
export const requireAdmin = async (req, res, next) => {
  const firebaseUid = req.user?.uid;

  if (!firebaseUid) {
    return res.status(401).json({
      success: false,
      message: 'Unauthorized: Authentication required'
    });
  }

  try {
    const user = await User.findOne({ firebaseUid });

    if (!user) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: User not registered in system'
      });
    }

    if (user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: Admin access required'
      });
    }

    req.mongoUser = user;
    next();
  } catch (error) {
    console.error('Admin authorization verification error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error verifying authorization'
    });
  }
};
