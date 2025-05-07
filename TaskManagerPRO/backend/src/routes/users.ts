import express, { Response } from 'express';
import { body, validationResult } from 'express-validator';
import { User } from '../models/User';
import { AuthRequest, authenticateToken, checkPermission } from '../middleware/auth';

const router = express.Router();

// All user routes require authentication
router.use(authenticateToken);

// Get all users (admin only)
router.get('/', checkPermission('users:read'), async (req: AuthRequest, res: Response) => {
  try {
    const searchTerm = req.query.search as string;
    let query = {};
    
    // Add search functionality
    if (searchTerm && searchTerm.trim() !== '') {
      // Create a case-insensitive search for name or email containing the search term
      query = {
        $or: [
          { name: { $regex: searchTerm, $options: 'i' } },
          { email: { $regex: searchTerm, $options: 'i' } }
        ]
      };
    }
    
    const users = await User.find(query).select('-password');
    res.json(users);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get basic user info for task assignments - accessible by all authenticated users
router.get('/assignees', async (req: AuthRequest, res: Response) => {
  try {
    // Only return essential data (id, name) - no sensitive information
    const users = await User.find().select('_id name');
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Get user profile
router.get('/profile', async (req: AuthRequest, res: Response) => {
  try {
    const user = await User.findById(req.user?._id).select('-password');
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Update user profile
router.put(
  '/profile',
  [
    body('name').optional().notEmpty().withMessage('Name cannot be empty'),
    body('email').optional().isEmail().withMessage('Please enter a valid email'),
  ],
  async (req: AuthRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { name, email } = req.body;

      // Check if email is already taken
      if (email) {
        const existingUser = await User.findOne({ email });
        if (existingUser && existingUser._id.toString() !== req.user?._id.toString()) {
          return res.status(400).json({ message: 'Email already in use' });
        }
      }

      const updatedUser = await User.findByIdAndUpdate(
        req.user?._id,
        { $set: { name, email } },
        { new: true }
      ).select('-password');

      res.json({
        message: 'Profile updated successfully',
        user: updatedUser,
      });
    } catch (error) {
      res.status(500).json({ message: 'Server error' });
    }
  }
);

// Update user's password
router.put(
  '/password',
  [
    body('currentPassword').notEmpty().withMessage('Current password is required'),
    body('newPassword')
      .notEmpty()
      .withMessage('New password is required')
      .isLength({ min: 6 })
      .withMessage('Password must be at least 6 characters')
  ],
  async (req: AuthRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { currentPassword, newPassword } = req.body;

      const user = await User.findById(req.user?._id);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      // Verify current password
      const isMatch = await user.comparePassword(currentPassword);
      if (!isMatch) {
        return res.status(400).json({ message: 'Current password is incorrect' });
      }

      // Update password
      user.password = newPassword;
      await user.save();

      res.json({ message: 'Password updated successfully' });
    } catch (error) {
      res.status(500).json({ message: 'Server error' });
    }
  }
);

// Update user role (admin only)
router.put(
  '/:id/role',
  checkPermission('users:manage-roles'),
  [
    body('role')
      .isIn(['admin', 'manager', 'user'])
      .withMessage('Invalid role'),
  ],
  async (req: AuthRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const user = await User.findById(req.params.id);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      // Prevent changing own role
      if (user._id.toString() === req.user?._id.toString()) {
        return res.status(403).json({
          message: 'You cannot change your own role',
        });
      }

      user.role = req.body.role;
      await user.save();

      res.json({
        message: 'User role updated successfully',
        user: {
          id: user._id,
          email: user.email,
          name: user.name,
          role: user.role,
        },
      });
    } catch (error) {
      res.status(500).json({ message: 'Server error' });
    }
  }
);

// Create a new user (admin only)
router.post(
  '/',
  checkPermission('users:create'),
  [
    body('name').notEmpty().withMessage('Name is required'),
    body('email').isEmail().withMessage('Valid email is required'),
    body('password')
      .isLength({ min: 6 })
      .withMessage('Password must be at least 6 characters'),
    body('role')
      .isIn(['admin', 'manager', 'user'])
      .withMessage('Invalid role'),
  ],
  async (req: AuthRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { name, email, password, role } = req.body;

      // Check if email already exists
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        return res.status(400).json({ message: 'Email already in use' });
      }

      const user = new User({
        name,
        email,
        password,
        role,
      });

      await user.save();

      res.status(201).json({
        message: 'User created successfully',
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
        },
      });
    } catch (error) {
      res.status(500).json({ message: 'Server error' });
    }
  }
);

// Delete user (admin only)
router.delete('/:id', checkPermission('users:delete'), async (req: AuthRequest, res: Response) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Prevent deleting own account
    if (user._id.toString() === req.user?._id.toString()) {
      return res.status(403).json({
        message: 'You cannot delete your own account',
      });
    }

    await user.deleteOne();

    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Update a user (admin only)
router.put(
  '/:id',
  checkPermission('users:update'),
  [
    body('name').optional().notEmpty().withMessage('Name cannot be empty'),
    body('email').optional().isEmail().withMessage('Please enter a valid email'),
    body('role').optional().isIn(['admin', 'manager', 'user']).withMessage('Invalid role'),
  ],
  async (req: AuthRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      // Log the update request for debugging
      console.log('User update request:', {
        userId: req.params.id, 
        updateData: req.body,
        currentUser: req.user?._id
      });

      const { name, email, role } = req.body;
      
      // Find the user to update
      const user = await User.findById(req.params.id);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
      
      // Check if attempting to update own role (which is not allowed)
      if (role && user._id.toString() === req.user?._id.toString()) {
        return res.status(403).json({
          message: 'You cannot change your own role',
        });
      }

      // Check if email is already taken by another user
      if (email && email !== user.email) {
        const existingUser = await User.findOne({ email });
        if (existingUser && existingUser._id.toString() !== req.params.id) {
          return res.status(400).json({ message: 'Email already in use by another user' });
        }
      }

      // Create the update object with only the fields that are provided
      const updateData: any = {};
      if (name) updateData.name = name;
      if (email) updateData.email = email;
      if (role) updateData.role = role;
      
      console.log('Applying user updates:', updateData);

      // Update the user
      const updatedUser = await User.findByIdAndUpdate(
        req.params.id,
        { $set: updateData },
        { new: true }
      ).select('-password');

      console.log('User updated successfully:', {
        id: updatedUser?._id,
        role: updatedUser?.role
      });

      res.json({
        message: 'User updated successfully',
        user: updatedUser,
      });
    } catch (error) {
      console.error('User update error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }
);

export default router; 