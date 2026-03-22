const User = require('../models/User');
const admin = require('../config/firebase');

// Sync user from Firebase to MongoDB
const syncUser = async (req, res) => {
  try {
    const { uid, email, displayName, photoURL, phone } = req.firebaseUser || req.body;
    const firebaseUser = req.firebaseUser;

    let user = await User.findOne({ uid: firebaseUser.uid });

    if (user) {
      // Update existing user
      user.email = firebaseUser.email || user.email;
      user.displayName = firebaseUser.name || displayName || user.displayName;
      user.photoURL = firebaseUser.picture || photoURL || user.photoURL;
      if (phone) user.phone = phone;
      await user.save();
    } else {
      // Create new user
      user = await User.create({
        uid: firebaseUser.uid,
        email: firebaseUser.email,
        displayName: firebaseUser.name || firebaseUser.email?.split('@')[0],
        photoURL: firebaseUser.picture || '',
        role: 'user',
        isActive: true,
      });
    }

    res.status(200).json({
      success: true,
      message: 'User synced successfully',
      user: {
        _id: user._id,
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
        photoURL: user.photoURL,
        role: user.role,
        phone: user.phone,
        isActive: user.isActive,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    console.error('Sync user error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get current user
const getMe = async (req, res) => {
  try {
    const user = req.user;

    res.status(200).json({
      success: true,
      user: {
        _id: user._id,
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
        photoURL: user.photoURL,
        role: user.role,
        phone: user.phone,
        isActive: user.isActive,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Update user profile
const updateProfile = async (req, res) => {
  try {
    const { displayName, phone } = req.body;
    const user = req.user;

    if (displayName) user.displayName = displayName;
    if (phone) user.phone = phone;

    await user.save();

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      user: {
        _id: user._id,
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
        photoURL: user.photoURL,
        role: user.role,
        phone: user.phone,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Admin: Get all users
const getAllUsers = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    const search = req.query.search || '';

    const query = {};
    if (search) {
      query.$or = [
        { email: { $regex: search, $options: 'i' } },
        { displayName: { $regex: search, $options: 'i' } },
      ];
    }

    const [users, total] = await Promise.all([
      User.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit),
      User.countDocuments(query),
    ]);

    res.status(200).json({
      success: true,
      users,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Admin: Update user role
const updateUserRole = async (req, res) => {
  try {
    const { userId } = req.params;
    const { role, isActive } = req.body;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    if (role) user.role = role;
    if (typeof isActive === 'boolean') user.isActive = isActive;

    await user.save();

    res.status(200).json({
      success: true,
      message: 'User updated successfully',
      user,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = { syncUser, getMe, updateProfile, getAllUsers, updateUserRole };
