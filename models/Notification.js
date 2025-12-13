const mongoose = require('mongoose');
const Schema = mongoose.Schema;

// Notification Types
const NOTIFICATION_TYPES = {
  // Course lifecycle
  COURSE_SUBMITTED: 'course_submitted',
  COURSE_APPROVED: 'course_approved',
  COURSE_REJECTED: 'course_rejected',
  COURSE_UPDATED: 'course_updated',

  // Topic lifecycle
  TOPIC_SUBMITTED: 'topic_submitted',
  TOPIC_APPROVED: 'topic_approved',
  TOPIC_REJECTED: 'topic_rejected',

  // Lecture lifecycle
  LECTURE_SUBMITTED: 'lecture_submitted',
  LECTURE_APPROVED: 'lecture_approved',
  LECTURE_REJECTED: 'lecture_rejected',

  // Enrollment & Payment
  NEW_ENROLLMENT: 'new_enrollment',
  ENROLLMENT_SUCCESS: 'enrollment_success',
  PAYMENT_RECEIVED: 'payment_received',
  PAYMENT_FAILED: 'payment_failed',

  // Reviews
  NEW_REVIEW: 'new_review',
  REVIEW_RESPONSE: 'review_response',

  // System
  SYSTEM_ANNOUNCEMENT: 'system_announcement',
  MAINTENANCE: 'maintenance',
  WELCOME: 'welcome',
  NEW_CONTENT: 'new_content',
};

const PRIORITY_LEVELS = ['low', 'medium', 'high', 'urgent'];

const notificationSchema = new Schema({
  recipient: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  type: {
    type: String,
    enum: Object.values(NOTIFICATION_TYPES),
    default: 'system_announcement',
  },
  title: {
    type: String,
    required: true,
    maxlength: 200,
  },
  message: {
    type: String,
    required: true,
    maxlength: 1000,
  },
  data: {
    type: Schema.Types.Mixed,
    default: {},
  },
  read: {
    type: Boolean,
    default: false,
    index: true,
  },
  priority: {
    type: String,
    enum: PRIORITY_LEVELS,
    default: 'medium',
  },
  // For linking to specific resources
  courseId: {
    type: Schema.Types.ObjectId,
    ref: 'Course',
  },
  topicId: {
    type: Schema.Types.ObjectId,
    ref: 'Topic',
  },
  senderId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
  },
  // Auto-delete after 30 days
  expiresAt: {
    type: Date,
    default: () => new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    index: { expires: 0 },
  },
}, {
  timestamps: true,
});

// Compound indexes for efficient queries
notificationSchema.index({ recipient: 1, read: 1, createdAt: -1 });
notificationSchema.index({ recipient: 1, type: 1 });

// Static method to create notification
notificationSchema.statics.createNotification = async function(data) {
  const notification = new this(data);
  await notification.save();
  return notification;
};

// Static method to send notification to multiple users
notificationSchema.statics.sendToMany = async function(recipientIds, notificationData) {
  if (!recipientIds || recipientIds.length === 0) return [];
  
  const notifications = recipientIds.map(recipientId => ({
    ...notificationData,
    recipient: recipientId,
  }));

  return await this.insertMany(notifications);
};

// Static method to send to all users with a specific role (removed isVerified filter)
notificationSchema.statics.sendToRole = async function(role, notificationData) {
  const User = mongoose.model('User');
  // Get ALL users with the role, not just verified ones
  const users = await User.find({ role }).select('_id');
  const recipientIds = users.map(u => u._id);

  if (recipientIds.length === 0) return [];

  return await this.sendToMany(recipientIds, notificationData);
};

// Instance method to mark as read
notificationSchema.methods.markAsRead = async function() {
  this.read = true;
  await this.save();
  return this;
};

const Notification = mongoose.model('Notification', notificationSchema);

module.exports = { Notification, NOTIFICATION_TYPES, PRIORITY_LEVELS };
