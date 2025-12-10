const express = require('express');
const wrapAsync = require('../utills/wrapAsync');
const verifyToken = require('../middlewares/authMiddleware');
const authorizeRole = require('../middlewares/roleMiddleware');
const lectureController = require('../Controllers/lecturerController');
const { verify } = require('jsonwebtoken');
const router = express.Router();

const multer  = require('multer');
const {storage} = require("../config/cloudinary/cloudConfig");
const upload = multer({ storage });

const { videoStorage } = require('../config/cloudinary/cloudVideo');
const uploadVideo = multer({ storage: videoStorage });

// Get all lecturer's own courses (with all statuses: pending, approved, rejected)
router.get("/courses", verifyToken, authorizeRole("lecture"), wrapAsync(lectureController.getLecturerCourses));

// Add new course
router.post("/courses/add-course", verifyToken, authorizeRole("lecture"), upload.single("courseImage"), wrapAsync(lectureController.addCourse));

// Edit course
router.put("/courses/:courseId/editCourse", verifyToken, authorizeRole("lecture"), upload.single("courseImage"), wrapAsync(lectureController.editCourse));

// Delete course
router.delete("/courses/:courseId/deleteCourse", verifyToken, authorizeRole("lecture"), wrapAsync(lectureController.deleteCourse));

// Add topic to course
router.post("/courses/:courseId/add-topic", verifyToken, authorizeRole("lecture"), wrapAsync(lectureController.addTopic));

// Edit topic
router.put("/courses/:courseId/topic/:topicId/editTopic", verifyToken, authorizeRole("lecture"), wrapAsync(lectureController.editTopic));

// Delete topic
router.delete("/courses/:courseId/topic/:topicId/deleteTopic", verifyToken, authorizeRole("lecture"), wrapAsync(lectureController.deleteTopic));

// Add lecture to topic
router.post("/courses/:courseId/topic/:topicId/add-lecture", verifyToken, authorizeRole("lecture"), uploadVideo.single('video'), wrapAsync(lectureController.addLecture));

// Edit lecture
router.put("/courses/:courseId/topic/:topicId/lecture/:lectureId/editLecture", verifyToken, authorizeRole("lecture"), uploadVideo.single('video'), wrapAsync(lectureController.editLecture));

// Delete lecture
router.delete("/courses/:courseId/topic/:topicId/lecture/:lectureId/deleteLecture", verifyToken, authorizeRole("lecture"), wrapAsync(lectureController.deleteLecture));

module.exports = router;
