const express = require('express');
const router = express.Router();
const verifyToken = require('../middlewares/authMiddleware');
const {
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
} = require('../Controllers/notificationController');

// All routes require authentication
router.use(verifyToken);

// Get all notifications for the current user
router.get('/', getNotifications);

// Get unread count
router.get('/unread-count', getUnreadCount);

// Create a notification
router.post('/', createNotification);

// Send notification to a specific user
router.post('/send', sendNotificationToUser);

// Send notification to all users with a specific role
router.post('/send-to-role', sendNotificationToRole);

// Send notification to all students enrolled in a course
router.post('/send-to-course/:courseId', sendNotificationToCourseStudents);

// Mark a specific notification as read
router.put('/:id/read', markAsRead);

// Mark all notifications as read
router.put('/read-all', markAllAsRead);

// Delete a specific notification
router.delete('/:id', deleteNotification);

// Clear all notifications
router.delete('/clear-all', clearAllNotifications);

module.exports = router;
