const { Notification, NOTIFICATION_TYPES } = require('../models/Notification');
const User = require('../models/User');
const Course = require('../models/Course');
const Enrollment = require('../models/Enrollment');
const ExpressError = require('../utills/ExpressError');

// Get all notifications for the authenticated user
const getNotifications = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { page = 1, limit = 50, unreadOnly = false } = req.query;

    const query = { recipient: userId };
    if (unreadOnly === 'true') {
      query.read = false;
    }

    const notifications = await Notification.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .populate('senderId', 'name profileImage')
      .populate('courseId', 'title')
      .lean();

    const total = await Notification.countDocuments(query);
    const unreadCount = await Notification.countDocuments({ recipient: userId, read: false });

    res.status(200).json({
      success: true,
      notifications,
      total,
      unreadCount,
      page: parseInt(page),
      pages: Math.ceil(total / limit),
    });
  } catch (error) {
    next(new ExpressError(500, error.message));
  }
};

// Create a notification (internal use or admin)
const createNotification = async (req, res, next) => {
  try {
    const { recipientId, type, title, message, data, priority, courseId, topicId } = req.body;

    if (!recipientId || !title || !message) {
      return next(new ExpressError(400, 'Recipient, title, and message are required'));
    }

    const notification = await Notification.createNotification({
      recipient: recipientId,
      type: type || 'system_announcement',
      title,
      message,
      data: data || {},
      priority: priority || 'medium',
      courseId,
      topicId,
      senderId: req.user.id,
    });

    res.status(201).json({
      success: true,
      notification,
    });
  } catch (error) {
    next(new ExpressError(500, error.message));
  }
};

// Send notification to a specific user
const sendNotificationToUser = async (req, res, next) => {
  try {
    const { recipientId, type, title, message, data, priority } = req.body;

    if (!recipientId || !title || !message) {
      return next(new ExpressError(400, 'Recipient, title, and message are required'));
    }

    // Check if recipient exists
    const recipient = await User.findById(recipientId);
    if (!recipient) {
      return next(new ExpressError(404, 'Recipient not found'));
    }

    const notification = await Notification.createNotification({
      recipient: recipientId,
      type: type || 'system_announcement',
      title,
      message,
      data: data || {},
      priority: priority || 'medium',
      senderId: req.user.id,
    });

    res.status(201).json({
      success: true,
      notification,
    });
  } catch (error) {
    next(new ExpressError(500, error.message));
  }
};

// Send notification to all users with a specific role
const sendNotificationToRole = async (req, res, next) => {
  try {
    const { role, type, title, message, data, priority } = req.body;

    if (!role || !title || !message) {
      return next(new ExpressError(400, 'Role, title, and message are required'));
    }

    if (!['student', 'lecture', 'admin'].includes(role)) {
      return next(new ExpressError(400, 'Invalid role'));
    }

    // Find all users with this role (removed isVerified filter to include all users)
    const users = await User.find({ role }).select('_id');
    const recipientIds = users.map(u => u._id);

    if (recipientIds.length === 0) {
      return res.status(200).json({
        success: true,
        count: 0,
        message: "No users found with this role",
      });
    }

    const notifications = await Notification.sendToMany(recipientIds, {
      type: type || 'system_announcement',
      title,
      message,
      data: data || {},
      priority: priority || 'medium',
      senderId: req.user.id,
    });

    res.status(201).json({
      success: true,
      count: notifications.length,
      message: "Notification sent to " + notifications.length + " user(s)",
    });
  } catch (error) {
    next(new ExpressError(500, error.message));
  }
};

// Send notification to all students enrolled in a course
const sendNotificationToCourseStudents = async (req, res, next) => {
  try {
    const { courseId } = req.params;
    const { type, title, message, data, priority } = req.body;

    if (!title || !message) {
      return next(new ExpressError(400, 'Title and message are required'));
    }

    // Check if course exists
    const course = await Course.findById(courseId);
    if (!course) {
      return next(new ExpressError(404, 'Course not found'));
    }

    // Get enrolled students from Enrollment model (with successful payment)
    const enrollments = await Enrollment.find({ 
      courseId: courseId,
      payment: 'success'
    }).select('userId');
    
    const studentIds = enrollments.map(e => e.userId);

    if (studentIds.length === 0) {
      return res.status(200).json({
        success: true,
        count: 0,
        message: 'No students enrolled in this course',
      });
    }

    const notifications = await Notification.sendToMany(studentIds, {
      type: type || 'course_updated',
      title,
      message,
      data: { ...data, courseId },
      priority: priority || 'medium',
      courseId,
      senderId: req.user.id,
    });

    res.status(201).json({
      success: true,
      count: notifications.length,
      message: "Notification sent to " + notifications.length + " student(s)",
    });
  } catch (error) {
    next(new ExpressError(500, error.message));
  }
};

// Mark a single notification as read
const markAsRead = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const notification = await Notification.findOne({ _id: id, recipient: userId });
    if (!notification) {
      return next(new ExpressError(404, 'Notification not found'));
    }

    notification.read = true;
    await notification.save();

    res.status(200).json({
      success: true,
      message: 'Notification marked as read',
    });
  } catch (error) {
    next(new ExpressError(500, error.message));
  }
};

// Mark all notifications as read
const markAllAsRead = async (req, res, next) => {
  try {
    const userId = req.user.id;

    await Notification.updateMany(
      { recipient: userId, read: false },
      { read: true }
    );

    res.status(200).json({
      success: true,
      message: 'All notifications marked as read',
    });
  } catch (error) {
    next(new ExpressError(500, error.message));
  }
};

// Delete a single notification
const deleteNotification = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const notification = await Notification.findOneAndDelete({ _id: id, recipient: userId });
    if (!notification) {
      return next(new ExpressError(404, 'Notification not found'));
    }

    res.status(200).json({
      success: true,
      message: 'Notification deleted',
    });
  } catch (error) {
    next(new ExpressError(500, error.message));
  }
};

// Clear all notifications for a user
const clearAllNotifications = async (req, res, next) => {
  try {
    const userId = req.user.id;

    await Notification.deleteMany({ recipient: userId });

    res.status(200).json({
      success: true,
      message: 'All notifications cleared',
    });
  } catch (error) {
    next(new ExpressError(500, error.message));
  }
};

// Get unread count
const getUnreadCount = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const count = await Notification.countDocuments({ recipient: userId, read: false });

    res.status(200).json({
      success: true,
      unreadCount: count,
    });
  } catch (error) {
    next(new ExpressError(500, error.message));
  }
};

module.exports = {
  getNotifications,
  createNotification,
  sendNotificationToUser,
  sendNotificationToRole,
  sendNotificationToCourseStudents,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  clearAllNotifications,
  getUnreadCount,
};
