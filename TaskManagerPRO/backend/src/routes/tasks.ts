import express, { Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { Task, ITask } from '../models/Task';
import { User, IUser } from '../models/User';
import { AuthRequest, authenticateToken, isResourceOwnerOrHasPermission, checkPermission } from '../middleware/auth';
import { SortOrder } from 'mongoose';
import mongoose from 'mongoose';
import { createNotification } from '../index';
import { createRecurringTaskInstance } from '../services/recurringTaskService';

const router = express.Router();

// All task routes require authentication
router.use(authenticateToken);

// Create task - requires tasks:create permission
router.post(
  '/',
  [
    body('title').notEmpty().withMessage('Title is required'),
    body('description').notEmpty().withMessage('Description is required'),
    body('dueDate').isISO8601().withMessage('Valid due date is required'),
    body('priority')
      .isIn(['low', 'medium', 'high'])
      .withMessage('Priority must be low, medium, or high'),
    body('assignedTo').notEmpty().withMessage('Assignee is required'),
    // Recurring task validation
    body('isRecurring').optional().isBoolean(),
    body('recurringType')
      .optional()
      .isIn(['daily', 'weekly', 'monthly', 'custom'])
      .withMessage('Recurring type must be daily, weekly, monthly, or custom'),
    body('recurringInterval')
      .optional()
      .isInt({ min: 1 })
      .withMessage('Recurring interval must be a positive integer'),
    body('recurringDays')
      .optional()
      .isArray()
      .withMessage('Recurring days must be an array'),
    body('recurringDays.*')
      .optional()
      .isInt({ min: 0, max: 6 })
      .withMessage('Recurring days must be between 0 and 6'),
    body('recurringDate')
      .optional()
      .isInt({ min: 1, max: 31 })
      .withMessage('Recurring date must be between 1 and 31'),
    body('recurringEndDate')
      .optional()
      .isISO8601()
      .withMessage('Valid recurring end date is required'),
  ],
  async (req: AuthRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      // Log the user role and request for debugging
      console.log('Task creation request:', {
        userId: req.user?._id,
        userRole: req.user?.role,
        taskData: req.body
      });

      const { 
        title, 
        description, 
        dueDate, 
        priority, 
        assignedTo,
        isRecurring,
        recurringType,
        recurringInterval,
        recurringDays,
        recurringDate,
        recurringEndDate
      } = req.body;

      // If assignedTo is missing or invalid, assign to the current user
      let taskAssignee = assignedTo;
      let assignedUser;

      try {
        // First try with the provided assignedTo value
        if (assignedTo && mongoose.Types.ObjectId.isValid(assignedTo)) {
          assignedUser = await User.findById(assignedTo);
        }
        
        // If that fails, default to the current user
        if (!assignedUser && req.user?._id) {
          console.log('Falling back to current user as assignee');
          taskAssignee = req.user._id;
          assignedUser = await User.findById(req.user._id);
        }
        
        // If still no valid user found, return an error
        if (!assignedUser) {
          console.error('No valid assignee found:', { 
            providedId: assignedTo, 
            currentUserId: req.user?._id 
          });
          return res.status(400).json({ message: 'No valid user found to assign the task to' });
        }
        
        console.log('Task will be assigned to:', {
          userId: assignedUser._id,
          userName: assignedUser.name,
          userEmail: assignedUser.email
        });
      } catch (error) {
        console.error('Error finding assignee:', error);
        return res.status(500).json({ message: 'Error finding user to assign task to' });
      }

      // Validate recurring task fields
      if (isRecurring && !recurringType) {
        return res.status(400).json({ message: 'Recurring type is required for recurring tasks' });
      }

      // Create the task
      const task = new Task({
        title,
        description,
        dueDate,
        priority,
        assignedTo: taskAssignee, // Use the validated assignee
        createdBy: req.user?._id,
        isRecurring,
        recurringType,
        recurringInterval,
        recurringDays,
        recurringDate,
        recurringEndDate
      });

      await task.save();

      // If this is a recurring task, generate the first instance
      if (isRecurring) {
        await createRecurringTaskInstance(task);
      }

      // Send notification to assigned user if it's not the creator
      if (assignedTo !== req.user?._id.toString()) {
        await createNotification(
          assignedTo,
          `You have been assigned a new task: ${title}`,
          'task_assigned',
          task._id.toString()
        );
      }

      res.status(201).json({
        message: 'Task created successfully',
        task,
      });
    } catch (error) {
      console.error('Create task error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }
);

// Get all tasks (with filters)
// Different behavior based on role:
// - Admin/Manager - Can see all tasks with optional filters
// - Regular user - Can only see tasks assigned to them or created by them
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const {
      status,
      priority,
      search,
      assignedTo,
      createdBy,
      isRecurring,
      recurringType,
      sortBy = 'dueDate',
      sortOrder = 'asc',
      limit,
    } = req.query;

    const query: Record<string, any> = {};

    // Apply filters
    if (status) query.status = status;
    if (priority) query.priority = priority;
    if (isRecurring !== undefined) query.isRecurring = isRecurring === 'true';
    if (recurringType) query.recurringType = recurringType;
    
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
      ];
    }

    // Role-based access control for task visibility
    const user = req.user as IUser;
    const canSeeAllTasks = user.role === 'admin' || user.role === 'manager';
    
    if (!canSeeAllTasks) {
      // Regular users can only see tasks assigned to them or created by them
      query.$or = [
        { assignedTo: user._id },
        { createdBy: user._id }
      ];
    } else {
      // Admin/manager can filter by specific assignee or creator if requested
      if (assignedTo) query.assignedTo = assignedTo;
      if (createdBy) query.createdBy = createdBy;
    }

    // Create sort object with proper type
    const sortField = sortBy as string;
    const sortObj: { [key: string]: SortOrder } = {};
    sortObj[sortField] = sortOrder === 'asc' ? 1 : -1;

    let tasksQuery = Task.find(query)
      .sort(sortObj)
      .populate('assignedTo', 'name email')
      .populate('createdBy', 'name email');

    // Apply limit if specified
    if (limit) {
      tasksQuery = tasksQuery.limit(Number(limit));
    }

    const tasks = await tasksQuery;

    // Convert to JSON to remove mongoose specific properties and ensure all tasks have assignedTo name
    const processedTasks = tasks.map(task => {
      const taskObj = task.toJSON();
      return taskObj;
    });

    res.json(processedTasks);
  } catch (error) {
    console.error('Get tasks error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get task statistics
router.get('/stats', async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user?._id) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    const userId = req.user._id;
    const isAdmin = req.user.role === 'admin';
    const isManager = req.user.role === 'manager';

    // Base query object
    let baseQuery: any = {};
    
    // Role-based filtering
    if (!isAdmin && !isManager) {
      // Regular users only see stats for their tasks
      baseQuery.$or = [
        { assignedTo: userId },
        { createdBy: userId }
      ];
    }

    // Get counts for each status
    const statusCounts = await Task.aggregate([
      { $match: baseQuery },
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);

    // Get counts for each priority
    const priorityCounts = await Task.aggregate([
      { $match: baseQuery },
      { $group: { _id: '$priority', count: { $sum: 1 } } }
    ]);

    // Get counts for tasks due today, this week, and overdue
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const nextWeek = new Date(today);
    nextWeek.setDate(nextWeek.getDate() + 7);

    // Overdue tasks (due date before today and not completed)
    const overdueCount = await Task.countDocuments({
      ...baseQuery,
      dueDate: { $lt: today },
      status: { $ne: 'completed' }
    });

    // Due today
    const dueTodayCount = await Task.countDocuments({
      ...baseQuery,
      dueDate: {
        $gte: today,
        $lt: tomorrow
      }
    });

    // Due this week
    const dueThisWeekCount = await Task.countDocuments({
      ...baseQuery,
      dueDate: {
        $gte: today,
        $lt: nextWeek
      }
    });

    // Format status counts into an object
    const formattedStatusCounts = statusCounts.reduce((acc: any, curr) => {
      acc[curr._id] = curr.count;
      return acc;
    }, {});

    // Format priority counts into an object
    const formattedPriorityCounts = priorityCounts.reduce((acc: any, curr) => {
      acc[curr._id] = curr.count;
      return acc;
    }, {});

    res.json({
      statusCounts: formattedStatusCounts,
      priorityCounts: formattedPriorityCounts,
      dueTodayCount,
      dueThisWeekCount,
      overdueCount
    });
  } catch (error) {
    console.error('Get task stats error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get task by ID
// Users can access tasks they created or are assigned to
// Admins/Managers can access any task
router.get('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const taskId = req.params.id;
    
    if (!mongoose.Types.ObjectId.isValid(taskId)) {
      return res.status(400).json({ message: 'Invalid task ID' });
    }
    
    const task = await Task.findById(taskId)
      .populate('assignedTo', 'name email')
      .populate('createdBy', 'name email');
      
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }
    
    // Check if user has permission to view this task
    const user = req.user as IUser;
    const isCreator = task.createdBy?._id.toString() === user._id.toString();
    const isAssignee = task.assignedTo?._id.toString() === user._id.toString();
    const canViewAllTasks = user.role === 'admin' || user.role === 'manager';
    
    if (!isCreator && !isAssignee && !canViewAllTasks) {
      return res.status(403).json({ message: 'You do not have permission to view this task' });
    }
    
    res.json(task);
  } catch (error) {
    console.error('Get task error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update task
router.put(
  '/:id',
  [
    body('title').optional().notEmpty().withMessage('Title cannot be empty'),
    body('description')
      .optional()
      .notEmpty()
      .withMessage('Description cannot be empty'),
    body('dueDate')
      .optional()
      .isISO8601()
      .withMessage('Valid due date is required'),
    body('priority')
      .optional()
      .isIn(['low', 'medium', 'high'])
      .withMessage('Priority must be low, medium, or high'),
    body('status')
      .optional()
      .isIn(['todo', 'in-progress', 'completed'])
      .withMessage('Invalid status'),
    // Recurring task validation
    body('isRecurring').optional().isBoolean(),
    body('recurringType')
      .optional()
      .isIn(['daily', 'weekly', 'monthly', 'custom'])
      .withMessage('Recurring type must be daily, weekly, monthly, or custom'),
    body('recurringInterval')
      .optional()
      .isInt({ min: 1 })
      .withMessage('Recurring interval must be a positive integer'),
    body('recurringDays')
      .optional()
      .isArray()
      .withMessage('Recurring days must be an array'),
    body('recurringDays.*')
      .optional()
      .isInt({ min: 0, max: 6 })
      .withMessage('Recurring days must be between 0 and 6'),
    body('recurringDate')
      .optional()
      .isInt({ min: 1, max: 31 })
      .withMessage('Recurring date must be between 1 and 31'),
    body('recurringEndDate')
      .optional()
      .isISO8601()
      .withMessage('Valid recurring end date is required'),
  ],
  async (req: AuthRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }
      
      const { id } = req.params;
      
      // Validate if id is a valid ObjectId
      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({ message: 'Invalid task ID format' });
      }

      const task = await Task.findById(id);
      if (!task) {
        return res.status(404).json({ message: 'Task not found' });
      }

      // RBAC: Check permissions based on role and ownership
      const user = req.user as IUser;
      const isTaskCreator = task.createdBy.toString() === user._id.toString();
      const isAdmin = user.role === 'admin';
      const isManager = user.role === 'manager';
      
      // Admin & Manager can update any task
      // Regular user can update only their own tasks
      if (!isTaskCreator && !isAdmin && !isManager) {
        return res.status(403).json({
          message: 'You do not have permission to update this task',
        });
      }

      // Check if this is a child task of a recurring series
      if (task.parentTaskId && req.body.isRecurring) {
        return res.status(400).json({
          message: 'Cannot make a recurring task instance into a recurring task',
        });
      }

      // Save original values for notification logic
      const originalAssignee = task.assignedTo.toString();
      const originalStatus = task.status;
      const wasRecurring = task.isRecurring;
      const originalRecurringType = task.recurringType;

      // Update the task
      const updatedTask = await Task.findByIdAndUpdate(
        id,
        { $set: req.body },
        { new: true }
      )
        .populate('assignedTo', 'name email')
        .populate('createdBy', 'name email');

      // Check if the task is being marked as completed
      const isNowCompleted = req.body.status === 'completed' && originalStatus !== 'completed';
      
      // Award points for task completion
      if (isNowCompleted) {
        // Award points based on priority
        let pointsToAward = 5; // Default points
        if (task.priority === 'medium') pointsToAward = 10;
        if (task.priority === 'high') pointsToAward = 15;
        
        // Award bonus points for completing before the due date
        const now = new Date();
        const dueDate = new Date(task.dueDate);
        if (now < dueDate) {
          // Bonus for early completion
          pointsToAward += 5;
        }
        
        // Update user's points
        await User.findByIdAndUpdate(
          task.assignedTo,
          { $inc: { points: pointsToAward } },
          { new: false }
        );
        
        // Check for achievements
        const user = await User.findById(task.assignedTo);
        const completedTasks = await Task.countDocuments({ 
          assignedTo: task.assignedTo,
          status: 'completed'
        });
        
        // Achievement: First Task Completed
        if (completedTasks === 1 && !user?.achievements.includes('first_task')) {
          await User.findByIdAndUpdate(
            task.assignedTo,
            { $push: { achievements: 'first_task' } }
          );
          
          // Notify about achievement
          await createNotification(
            task.assignedTo.toString(),
            `Achievement Unlocked: Completed your first task!`,
            'achievement',
            undefined
          );
        }
        
        // Achievement: 5 Tasks Completed
        if (completedTasks === 5 && !user?.achievements.includes('five_tasks')) {
          await User.findByIdAndUpdate(
            task.assignedTo,
            { $push: { achievements: 'five_tasks' } }
          );
          
          // Notify about achievement
          await createNotification(
            task.assignedTo.toString(),
            `Achievement Unlocked: Completed 5 tasks!`,
            'achievement',
            undefined
          );
        }
        
        // Notify user about points earned
        await createNotification(
          task.assignedTo.toString(),
          `You earned ${pointsToAward} points for completing: ${task.title}`,
          'points_earned',
          task._id.toString()
        );
      }

      // Create new recurring instance if task was completed
      if (isNowCompleted && updatedTask?.isRecurring) {
        await createRecurringTaskInstance(updatedTask);
      }

      // Check if recurring settings changed and need to re-schedule
      const recurringChanged = 
        wasRecurring !== req.body.isRecurring || 
        originalRecurringType !== req.body.recurringType;

      if (recurringChanged && updatedTask?.isRecurring) {
        // Re-create next instance with new settings
        await Task.deleteMany({ parentTaskId: updatedTask._id });
        await createRecurringTaskInstance(updatedTask);
      }

      // Handle notifications
      // Check if assignee changed
      if (req.body.assignedTo && req.body.assignedTo !== originalAssignee) {
        // Notify new assignee
        await createNotification(
          req.body.assignedTo,
          `You have been assigned to task: ${task.title}`,
          'task_assigned',
          task._id.toString()
        );
      }

      // Check if status changed to 'completed'
      if (req.body.status === 'completed' && originalStatus !== 'completed') {
        // Notify task creator if they're not the one updating it
        if (task.createdBy.toString() !== req.user?._id.toString()) {
          await createNotification(
            task.createdBy.toString(),
            `Task completed: ${task.title}`,
            'task_completed',
            task._id.toString()
          );
        }
      }

      // If task was updated by someone other than assignee, notify assignee
      if (
        req.user?._id.toString() !== originalAssignee &&
        (req.body.assignedTo === undefined || req.body.assignedTo === originalAssignee)
      ) {
        await createNotification(
          originalAssignee,
          `Task updated: ${task.title}`,
          'task_updated',
          task._id.toString()
        );
      }

      res.json({
        message: 'Task updated successfully',
        task: updatedTask,
      });
    } catch (error) {
      console.error('Update task error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }
);

// Delete task
router.delete('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    
    // Validate if id is a valid ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid task ID format' });
    }
    
    const task = await Task.findById(id);
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    // RBAC: Check permissions based on role and ownership
    const user = req.user as IUser;
    const isTaskCreator = task.createdBy.toString() === user._id.toString();
    const isAdmin = user.role === 'admin';
    const isManager = user.role === 'manager';
    
    // Admin can delete any task
    // Manager can delete own tasks only
    // Regular user can delete own tasks only
    if (!isTaskCreator && !isAdmin) {
      return res.status(403).json({
        message: 'You do not have permission to delete this task',
      });
    }

    // Notify assignee if they're not the one deleting it
    if (task.assignedTo.toString() !== req.user?._id.toString()) {
      await createNotification(
        task.assignedTo.toString(),
        `Task deleted: ${task.title}`,
        'system',
        undefined
      );
    }

    await task.deleteOne();

    res.json({ message: 'Task deleted successfully' });
  } catch (error) {
    console.error('Delete task error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get task analytics
router.get('/analytics/summary', async (req: AuthRequest, res: Response) => {
  try {
    // Check for admin or manager role
    const user = req.user as IUser;
    const canAccessAnalytics = user.role === 'admin' || user.role === 'manager';
    
    if (!canAccessAnalytics) {
      return res.status(403).json({ 
        message: 'You do not have permission to access analytics data' 
      });
    }
    
    // Task completion statistics
    const totalTasks = await Task.countDocuments({});
    const completedTasks = await Task.countDocuments({ status: 'completed' });
    const inProgressTasks = await Task.countDocuments({ status: 'in-progress' });
    const todoTasks = await Task.countDocuments({ status: 'todo' });
    
    // Calculate completion rate
    const completionRate = totalTasks > 0 
      ? Math.round((completedTasks / totalTasks) * 100 * 10) / 10
      : 0;
    
    // Get tasks completed last month for comparison
    const currentDate = new Date();
    const lastMonth = new Date();
    lastMonth.setMonth(lastMonth.getMonth() - 1);
    
    const lastMonthCompleted = await Task.countDocuments({
      status: 'completed',
      updatedAt: { $lt: currentDate, $gt: lastMonth }
    });
    
    const twoMonthsAgo = new Date();
    twoMonthsAgo.setMonth(twoMonthsAgo.getMonth() - 2);
    
    const twoMonthsAgoCompleted = await Task.countDocuments({
      status: 'completed',
      updatedAt: { $lt: lastMonth, $gt: twoMonthsAgo }
    });
    
    // Calculate month-over-month change
    const completionChange = twoMonthsAgoCompleted > 0 
      ? Math.round(((lastMonthCompleted - twoMonthsAgoCompleted) / twoMonthsAgoCompleted) * 100 * 10) / 10
      : 0;
    
    // Get user statistics
    const activeUsers = await User.countDocuments({});
    
    // Find top user by task completion
    const completionsByUser = await Task.aggregate([
      { $match: { status: 'completed' } },
      { $group: { _id: '$assignedTo', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 1 }
    ]);
    
    let topUser = null;
    if (completionsByUser.length > 0) {
      const topUserData = await User.findById(completionsByUser[0]._id).select('name');
      topUser = topUserData?.name || 'Unknown';
    }
    
    // Calculate tasks per user
    const tasksPerUser = activeUsers > 0 
      ? Math.round((totalTasks / activeUsers) * 10) / 10
      : 0;
    
    // Calculate average completion time (in days)
    const completedTasksWithDates = await Task.find({
      status: 'completed',
      createdAt: { $exists: true },
      updatedAt: { $exists: true }
    });
    
    let totalCompletionTime = 0;
    let tasksWithValidDates = 0;
    
    completedTasksWithDates.forEach(task => {
      if (task.createdAt && task.updatedAt) {
        const creationDate = new Date(task.createdAt);
        const completionDate = new Date(task.updatedAt);
        const timeDiff = completionDate.getTime() - creationDate.getTime();
        const daysDiff = timeDiff / (1000 * 3600 * 24);
        totalCompletionTime += daysDiff;
        tasksWithValidDates++;
      }
    });
    
    const avgCompletionTime = tasksWithValidDates > 0 
      ? Math.round((totalCompletionTime / tasksWithValidDates) * 10) / 10
      : 0;
    
    // Calculate on-time rate (using due date)
    const tasksWithDueDate = await Task.find({
      status: 'completed',
      dueDate: { $exists: true },
      updatedAt: { $exists: true }
    });
    
    let onTimeCount = 0;
    tasksWithDueDate.forEach(task => {
      if (task.dueDate && task.updatedAt) {
        const dueDate = new Date(task.dueDate);
        const completionDate = new Date(task.updatedAt);
        if (completionDate <= dueDate) {
          onTimeCount++;
        }
      }
    });
    
    const onTimeRate = tasksWithDueDate.length > 0 
      ? Math.round((onTimeCount / tasksWithDueDate.length) * 100 * 10) / 10
      : 0;
    
    // Calculate on-time change
    const lastMonthOnTime = await Task.countDocuments({
      status: 'completed',
      updatedAt: { $lt: currentDate, $gt: lastMonth },
      $expr: { $lte: [{ $toDate: "$updatedAt" }, { $toDate: "$dueDate" }] }
    });
    
    const lastMonthTasksWithDueDate = await Task.countDocuments({
      status: 'completed',
      updatedAt: { $lt: currentDate, $gt: lastMonth },
      dueDate: { $exists: true }
    });
    
    const lastMonthOnTimeRate = lastMonthTasksWithDueDate > 0 
      ? (lastMonthOnTime / lastMonthTasksWithDueDate) * 100
      : 0;
    
    const twoMonthsAgoOnTime = await Task.countDocuments({
      status: 'completed',
      updatedAt: { $lt: lastMonth, $gt: twoMonthsAgo },
      $expr: { $lte: [{ $toDate: "$updatedAt" }, { $toDate: "$dueDate" }] }
    });
    
    const twoMonthsAgoTasksWithDueDate = await Task.countDocuments({
      status: 'completed',
      updatedAt: { $lt: lastMonth, $gt: twoMonthsAgo },
      dueDate: { $exists: true }
    });
    
    const twoMonthsAgoOnTimeRate = twoMonthsAgoTasksWithDueDate > 0 
      ? (twoMonthsAgoOnTime / twoMonthsAgoTasksWithDueDate) * 100
      : 0;
    
    const onTimeChange = twoMonthsAgoOnTimeRate > 0 
      ? Math.round(((lastMonthOnTimeRate - twoMonthsAgoOnTimeRate) / twoMonthsAgoOnTimeRate) * 100 * 10) / 10
      : 0;
    
    // Get task distribution by priority
    const priorityDistribution = await Task.aggregate([
      { $group: { _id: '$priority', count: { $sum: 1 } } }
    ]);
    
    // Format the final response
    const analyticsData = {
      taskCompletion: {
        total: totalTasks,
        completed: completedTasks,
        inProgress: inProgressTasks,
        todo: todoTasks,
        rate: completionRate,
        change: completionChange
      },
      userActivity: {
        activeUsers,
        tasksPerUser,
        topUser
      },
      timeMetrics: {
        avgCompletionTime: `${avgCompletionTime} days`,
        onTimeRate,
        change: onTimeChange
      },
      distribution: {
        status: {
          completed: completedTasks,
          'in-progress': inProgressTasks,
          todo: todoTasks
        },
        priority: Object.fromEntries(
          priorityDistribution.map(item => [item._id, item.count])
        )
      }
    };
    
    res.json(analyticsData);
  } catch (error) {
    console.error('Analytics error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get user performance analytics
router.get('/analytics/user-performance', async (req: AuthRequest, res: Response) => {
  try {
    // Check for admin or manager role
    const user = req.user as IUser;
    const canAccessAnalytics = user.role === 'admin' || user.role === 'manager';
    
    if (!canAccessAnalytics) {
      return res.status(403).json({ 
        message: 'You do not have permission to access analytics data' 
      });
    }
    
    // Get task completion counts per user
    const userPerformance = await Task.aggregate([
      { $match: { status: 'completed' } },
      { $group: { _id: '$assignedTo', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 } // Limit to top 10 users
    ]);
    
    // Populate user names
    const userIds = userPerformance.map(item => item._id);
    const users = await User.find({ _id: { $in: userIds } }).select('name');
    
    // Create a map of user IDs to names
    const userMap = new Map();
    users.forEach(user => {
      userMap.set(user._id.toString(), user.name);
    });
    
    // Format response with user names
    const formattedPerformance = userPerformance.map(item => ({
      userId: item._id,
      name: userMap.get(item._id.toString()) || 'Unknown User',
      tasksCompleted: item.count
    }));
    
    res.json(formattedPerformance);
  } catch (error) {
    console.error('User performance analytics error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get task completion trend data
router.get('/analytics/completion-trend', async (req: AuthRequest, res: Response) => {
  try {
    // Check for admin or manager role
    const user = req.user as IUser;
    const canAccessAnalytics = user.role === 'admin' || user.role === 'manager';
    
    if (!canAccessAnalytics) {
      return res.status(403).json({ 
        message: 'You do not have permission to access analytics data' 
      });
    }
    
    // Get completion trend for the last 8 weeks
    const currentDate = new Date();
    const weekData = [];
    
    // Calculate data for each of the last 8 weeks
    for (let i = 0; i < 8; i++) {
      const endDate = new Date(currentDate);
      endDate.setDate(currentDate.getDate() - (i * 7));
      
      const startDate = new Date(endDate);
      startDate.setDate(endDate.getDate() - 7);
      
      // Count completed tasks in this week
      const completedCount = await Task.countDocuments({
        status: 'completed',
        updatedAt: { $gte: startDate, $lt: endDate }
      });
      
      // Count total tasks that existed during this week
      const totalTasksCount = await Task.countDocuments({
        createdAt: { $lt: endDate }
      });
      
      // Calculate completion rate
      const completionRate = totalTasksCount > 0 
        ? Math.round((completedCount / totalTasksCount) * 100)
        : 0;
      
      // Format date label (MM/DD)
      const startLabel = `${startDate.getMonth() + 1}/${startDate.getDate()}`;
      const endLabel = `${endDate.getMonth() + 1}/${endDate.getDate()}`;
      
      weekData.unshift({
        weekLabel: `${startLabel} - ${endLabel}`,
        completedTasks: completedCount,
        completionRate: completionRate
      });
    }
    
    res.json(weekData);
  } catch (error) {
    console.error('Completion trend analytics error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get motivation message for task
router.get('/:id/motivation', async (req: AuthRequest, res: Response) => {
  try {
    const taskId = req.params.id;
    
    if (!mongoose.Types.ObjectId.isValid(taskId)) {
      return res.status(400).json({ message: 'Invalid task ID' });
    }
    
    const task = await Task.findById(taskId);
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }
    
    // Check if user is assigned to this task
    const user = req.user as IUser;
    const isAssignee = task.assignedTo.toString() === user._id.toString();
    
    if (!isAssignee) {
      return res.status(403).json({ message: 'You are not assigned to this task' });
    }
    
    // Generate motivation message based on task details
    const motivationMessages = [
      "You've got this! Completing this task will move your team forward.",
      "Every task you complete builds your reputation as a reliable team member.",
      "Taking this off your plate will free your mind for other priorities.",
      "One task at a time leads to great achievements!",
      "Your contribution matters. This task helps the whole team succeed.",
    ];
    
    // Priority-specific messages
    const priorityMessages = {
      high: [
        "This high-priority task will have a big impact when completed!",
        "Tackling this high-priority item first will help the whole team.",
        "Completing this important task will be a major accomplishment!"
      ],
      medium: [
        "Steady progress on medium-priority tasks keeps projects on track.",
        "This task is important for maintaining momentum on the project."
      ],
      low: [
        "Even small tasks contribute to overall success!",
        "Clearing this task will help you build momentum for bigger challenges."
      ]
    };
    
    // Due date specific messages
    const now = new Date();
    const dueDate = new Date(task.dueDate);
    const daysUntilDue = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 3600 * 24));
    
    let timeMessages = [];
    if (daysUntilDue < 0) {
      timeMessages = [
        "It's not too late to complete this task!",
        "Better late than never - completing this will still add value."
      ];
    } else if (daysUntilDue === 0) {
      timeMessages = [
        "This task is due today! Completing it now will keep you on track.",
        "Beat the deadline by finishing this task today!"
      ];
    } else if (daysUntilDue === 1) {
      timeMessages = [
        "This task is due tomorrow! A little effort today saves stress tomorrow.",
        "Stay ahead by completing this task before tomorrow's deadline."
      ];
    } else if (daysUntilDue <= 3) {
      timeMessages = [
        `This task is due in ${daysUntilDue} days. Getting it done early brings peace of mind!`,
        "Completing this soon will keep you ahead of schedule."
      ];
    } else {
      timeMessages = [
        "You have time, but completing this task early will reduce future stress.",
        "Be proactive! Completing this task ahead of schedule shows initiative."
      ];
    }
    
    // Points reminders
    const pointsMessages = [
      `Completing this ${task.priority} priority task will earn you points!`,
      "Earning points by completing tasks helps you rank among top performers.",
      "Every task completed builds your point total and productivity score."
    ];
    
    // Combine message types and select one randomly from each category
    const generalMessage = motivationMessages[Math.floor(Math.random() * motivationMessages.length)];
    const priorityMessage = priorityMessages[task.priority as keyof typeof priorityMessages][Math.floor(Math.random() * priorityMessages[task.priority as keyof typeof priorityMessages].length)];
    const timeMessage = timeMessages[Math.floor(Math.random() * timeMessages.length)];
    const pointsMessage = pointsMessages[Math.floor(Math.random() * pointsMessages.length)];
    
    // Get task completion stats for the user
    const totalAssigned = await Task.countDocuments({ assignedTo: user._id });
    const completedTasks = await Task.countDocuments({ 
      assignedTo: user._id,
      status: 'completed'
    });
    const completionRate = totalAssigned > 0 ? Math.round((completedTasks / totalAssigned) * 100) : 0;
    
    // Get user's rank if possible
    let userRank = null;
    if (completedTasks > 0) {
      const usersByPoints = await User.find().sort({ points: -1 });
      const currentUserRank = usersByPoints.findIndex(u => u._id.toString() === user._id.toString()) + 1;
      userRank = currentUserRank > 0 ? currentUserRank : null;
    }
    
    // Return motivation data
    res.json({
      messages: {
        general: generalMessage,
        priority: priorityMessage,
        time: timeMessage,
        points: pointsMessage
      },
      stats: {
        totalAssigned,
        completedTasks,
        completionRate,
        userRank,
        userPoints: user.points
      },
      task: {
        title: task.title,
        priority: task.priority,
        dueDate: task.dueDate,
        daysUntilDue
      }
    });
    
  } catch (error) {
    console.error('Motivation message error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get user rankings by points
router.get('/leaderboard/rankings', async (req: AuthRequest, res: Response) => {
  try {
    // Get top users by points
    const topUsers = await User.find()
      .sort({ points: -1 })
      .limit(10)
      .select('name points achievements');
    
    // Get current user rank
    const currentUser = req.user as IUser;
    const allUsers = await User.find().sort({ points: -1 }).select('_id');
    const currentUserRank = allUsers.findIndex(u => u._id.toString() === currentUser._id.toString()) + 1;
    
    res.json({
      topUsers,
      currentUserRank,
      currentUserPoints: currentUser.points
    });
    
  } catch (error) {
    console.error('Leaderboard error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

export default router; 