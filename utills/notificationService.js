// Notification Service - Helper functions to trigger notifications from other controllers
const { Notification, NOTIFICATION_TYPES } = require('../models/Notification');
const User = require('../models/User');
const Course = require('../models/Course');

const NotificationService = {
  // ==================== COURSE NOTIFICATIONS ====================
  
  // When a lecturer submits a new course for approval
  async notifyCourseSubmitted(course, lecturer) {
    try {
      await Notification.sendToRole('admin', {
        type: NOTIFICATION_TYPES.COURSE_SUBMITTED,
        title: ' New Course Pending Approval',
        message: \ has submitted a new course "\" for review.,
        data: { courseId: course._id, lecturerId: lecturer._id },
        priority: 'high',
        courseId: course._id,
        senderId: lecturer._id,
      });
    } catch (error) {
      console.error('Failed to send course submitted notification:', error);
    }
  },

  // When admin approves a course
  async notifyCourseApproved(course, adminId) {
    try {
      const lecturerId = course.createdBy?._id || course.createdBy;
      
      // Notify lecturer
      await Notification.createNotification({
        recipient: lecturerId,
        type: NOTIFICATION_TYPES.COURSE_APPROVED,
        title: ' Course Approved!',
        message: Great news! Your course "\" has been approved and is now live.,
        data: { courseId: course._id },
        priority: 'high',
        courseId: course._id,
        senderId: adminId,
      });
    } catch (error) {
      console.error('Failed to send course approved notification:', error);
    }
  },

  // When admin rejects a course
  async notifyCourseRejected(course, adminId, reason) {
    try {
      const lecturerId = course.createdBy?._id || course.createdBy;
      
      await Notification.createNotification({
        recipient: lecturerId,
        type: NOTIFICATION_TYPES.COURSE_REJECTED,
        title: ' Course Needs Revision',
        message: Your course "\" requires changes. Reason: \,
        data: { courseId: course._id, reason },
        priority: 'high',
        courseId: course._id,
        senderId: adminId,
      });
    } catch (error) {
      console.error('Failed to send course rejected notification:', error);
    }
  },

  // ==================== TOPIC NOTIFICATIONS ====================
  
  async notifyTopicSubmitted(topic, course, lecturer) {
    try {
      await Notification.sendToRole('admin', {
        type: NOTIFICATION_TYPES.TOPIC_SUBMITTED,
        title: ' New Topic Pending Approval',
        message: \ added a new topic "\" to "\".,
        data: { topicId: topic._id, courseId: course._id, lecturerId: lecturer._id },
        priority: 'medium',
        courseId: course._id,
        topicId: topic._id,
        senderId: lecturer._id,
      });
    } catch (error) {
      console.error('Failed to send topic submitted notification:', error);
    }
  },

  async notifyTopicApproved(topic, course, adminId) {
    try {
      const lecturerId = course.createdBy?._id || course.createdBy;
      
      // Notify lecturer
      await Notification.createNotification({
        recipient: lecturerId,
        type: NOTIFICATION_TYPES.TOPIC_APPROVED,
        title: ' Topic Approved!',
        message: Your topic "\" in "\" has been approved.,
        data: { topicId: topic._id, courseId: course._id },
        priority: 'medium',
        courseId: course._id,
        topicId: topic._id,
        senderId: adminId,
      });

      // Notify enrolled students
      await this.notifyEnrolledStudents(course._id, {
        type: NOTIFICATION_TYPES.COURSE_UPDATED,
        title: ' New Content Available!',
        message: New topic has been added to "\".,
        data: { topicId: topic._id, courseId: course._id },
        priority: 'medium',
      });
    } catch (error) {
      console.error('Failed to send topic approved notification:', error);
    }
  },

  // ==================== LECTURE NOTIFICATIONS ====================
  
  async notifyLectureSubmitted(lecture, topic, course, lecturer) {
    try {
      await Notification.sendToRole('admin', {
        type: NOTIFICATION_TYPES.LECTURE_SUBMITTED,
        title: ' New Lecture Pending Approval',
        message: \ added a new lecture "\" to topic "\".,
        data: { lectureId: lecture._id, topicId: topic._id, courseId: course._id },
        priority: 'medium',
        courseId: course._id,
        topicId: topic._id,
        senderId: lecturer._id,
      });
    } catch (error) {
      console.error('Failed to send lecture submitted notification:', error);
    }
  },

  async notifyLectureApproved(lecture, topic, course, adminId) {
    try {
      const lecturerId = course.createdBy?._id || course.createdBy;
      
      // Notify lecturer
      await Notification.createNotification({
        recipient: lecturerId,
        type: NOTIFICATION_TYPES.LECTURE_APPROVED,
        title: ' Lecture Approved!',
        message: Your lecture "\" in "\" is now live.,
        data: { lectureId: lecture._id, topicId: topic._id, courseId: course._id },
        priority: 'medium',
        courseId: course._id,
        senderId: adminId,
      });

      // Notify enrolled students
      await this.notifyEnrolledStudents(course._id, {
        type: NOTIFICATION_TYPES.COURSE_UPDATED,
        title: ' New Lecture Available!',
        message: New lecture has been added to "\".,
        data: { lectureId: lecture._id, courseId: course._id },
        priority: 'medium',
      });
    } catch (error) {
      console.error('Failed to send lecture approved notification:', error);
    }
  },

  // ==================== ENROLLMENT NOTIFICATIONS ====================
  
  async notifyNewEnrollment(student, course, amount) {
    try {
      const lecturerId = course.createdBy?._id || course.createdBy || course.creator?._id || course.creator;
      
      if (lecturerId) {
        // Notify lecturer about new enrollment
        await Notification.createNotification({
          recipient: lecturerId,
          type: NOTIFICATION_TYPES.NEW_ENROLLMENT,
          title: ' New Student Enrolled!',
          message: \ has enrolled in your course "\".,
          data: { studentId: student._id, courseId: course._id },
          priority: 'medium',
          courseId: course._id,
          senderId: student._id,
        });

        // Notify lecturer about payment
        const lecturerShare = Math.round(amount * 0.8);
        await Notification.createNotification({
          recipient: lecturerId,
          type: NOTIFICATION_TYPES.PAYMENT_RECEIVED,
          title: ' Payment Received',
          message: You received ₹\ from \'s enrollment in "\".,
          data: { studentId: student._id, courseId: course._id, amount: lecturerShare },
          priority: 'high',
          courseId: course._id,
          senderId: student._id,
        });
      }

      // Notify student about successful enrollment
      await Notification.createNotification({
        recipient: student._id,
        type: NOTIFICATION_TYPES.ENROLLMENT_SUCCESS,
        title: ' Enrollment Successful!',
        message: You have successfully enrolled in "\". Start learning now!,
        data: { courseId: course._id },
        priority: 'high',
        courseId: course._id,
      });
    } catch (error) {
      console.error('Failed to send enrollment notifications:', error);
    }
  },

  // ==================== REVIEW NOTIFICATIONS ====================
  
  async notifyNewReview(student, course, rating) {
    try {
      const lecturerId = course.createdBy?._id || course.createdBy || course.creator?._id || course.creator;
      
      if (lecturerId) {
        await Notification.createNotification({
          recipient: lecturerId,
          type: NOTIFICATION_TYPES.NEW_REVIEW,
          title:  New \-Star Review,
          message: \ left a review on "\".,
          data: { studentId: student._id, courseId: course._id, rating },
          priority: 'low',
          courseId: course._id,
          senderId: student._id,
        });
      }
    } catch (error) {
      console.error('Failed to send review notification:', error);
    }
  },

  // ==================== HELPER METHODS ====================
  
  // Send notification to all enrolled students of a course
  async notifyEnrolledStudents(courseId, notificationData) {
    try {
      const course = await Course.findById(courseId).select('enrolledStudents');
      if (!course || !course.enrolledStudents?.length) return;
      
      const studentIds = course.enrolledStudents.map(s => s._id || s);
      await Notification.sendToMany(studentIds, {
        ...notificationData,
        courseId,
      });
    } catch (error) {
      console.error('Failed to notify enrolled students:', error);
    }
  },

  // Welcome notification for new users
  async sendWelcomeNotification(user) {
    try {
      const roleMessages = {
        student: "Explore our courses and start learning today!",
        lecture: "Create your first course and start teaching!",
        admin: "Welcome to the admin panel.",
      };

      await Notification.createNotification({
        recipient: user._id,
        type: NOTIFICATION_TYPES.WELCOME,
        title: ' Welcome to LearnSphere!',
        message: Hi \! \,
        data: { role: user.role },
        priority: 'low',
      });
    } catch (error) {
      console.error('Failed to send welcome notification:', error);
    }
  },
};

module.exports = NotificationService;
