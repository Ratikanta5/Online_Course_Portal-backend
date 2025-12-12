const express = require('express');
const wrapAsync = require('../utills/wrapAsync');
const verifyToken = require('../middlewares/authMiddleware');
const authorizeRole = require('../middlewares/roleMiddleware');
const adminController = require('../Controllers/adminController');
const router = express.Router();

// All admin routes require authentication and admin role
router.use(verifyToken);
router.use(authorizeRole('admin'));

// Dashboard stats
router.get('/stats', wrapAsync(adminController.getDashboardStats));

// Courses management
router.get('/courses', wrapAsync(adminController.getAllCourses));
router.get('/courses/pending', wrapAsync(adminController.getPendingCourses));
router.get('/courses/:id', wrapAsync(adminController.getCourseDetails));
router.put('/courses/:id/approve', wrapAsync(adminController.approveCourse));
router.put('/courses/:id/reject', wrapAsync(adminController.rejectCourse));
router.delete('/courses/:id/delete', wrapAsync(adminController.deleteCourse));

// Topics management (NEW)
router.get('/topics/pending', wrapAsync(adminController.getPendingTopics));
router.put('/topics/:topicId/approve', wrapAsync(adminController.approveTopic));
router.put('/topics/:topicId/reject', wrapAsync(adminController.rejectTopic));

// Lectures management (NEW)
router.get('/lectures/pending', wrapAsync(adminController.getPendingLectures));
router.put('/lectures/:topicId/:lectureId/approve', wrapAsync(adminController.approveLecture));
router.put('/lectures/:topicId/:lectureId/reject', wrapAsync(adminController.rejectLecture));

// Users management
router.get('/users', wrapAsync(adminController.getAllUsers));
router.put('/users/:id/deactivate', wrapAsync(adminController.deactivateUser));

// Enrollments management
router.get('/enrollments', wrapAsync(adminController.getAllEnrollments));

// Revenue and earnings
router.get('/revenue', wrapAsync(adminController.getRevenueStats));
router.get('/lecturer/:lecturerId/earnings', wrapAsync(adminController.getLecturerEarnings));

module.exports = router;
