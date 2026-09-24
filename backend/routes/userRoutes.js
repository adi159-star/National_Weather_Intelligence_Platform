import express from 'express';
import { verifyFirebaseToken } from '../middleware/authMiddleware.js';
import User from '../models/User.js';

const router = express.Router();

/**
 * POST /api/users/sync
 * Authenticated via Firebase ID token.
 * Syncs the authenticated Firebase user with MongoDB.
 * Enforces role: 'user' for new accounts and never permits role modification by client.
 */
router.post('/sync', verifyFirebaseToken, async (req, res) => {
  try {
    const { uid, email, name, picture } = req.user;

    // Use token values or fallback to client body details
    const userName = req.body?.name || name || '';
    const userEmail = email || req.body?.email || '';
    const userPhoto = req.body?.photoURL || picture || '';

    // Check if user already exists in MongoDB
    let user = await User.findOne({ firebaseUid: uid });

    if (!user) {
      // Create new user in MongoDB - strictly enforce default role "user"
      user = await User.create({
        firebaseUid: uid,
        name: userName,
        email: userEmail,
        photoURL: userPhoto,
        role: 'user'
      });
      console.log(`New user created in MongoDB: ${user.email || user.firebaseUid}`);
    } else {
      // Update profile fields if they were missing, never altering role
      let updated = false;
      if (!user.name && userName) {
        user.name = userName;
        updated = true;
      }
      if (!user.photoURL && userPhoto) {
        user.photoURL = userPhoto;
        updated = true;
      }
      if (updated) {
        await user.save();
      }
    }

    return res.status(200).json({
      success: true,
      user: {
        firebaseUid: user.firebaseUid,
        name: user.name,
        email: user.email,
        photoURL: user.photoURL,
        role: user.role,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
      }
    });
  } catch (error) {
    console.error('Error syncing user with MongoDB:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to sync user with database'
    });
  }
});

export default router;
