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


router.post("/courses/add-course",verifyToken, authorizeRole("lecture"),  upload.single("courseImage"), wrapAsync(lectureController.addCourse));
router.put("/courses/:courseId/editCourse", verifyToken, authorizeRole("lecture"),  upload.single("courseImage"), wrapAsync(lectureController.editCourse));
router.delete("/courses/:courseId/deleteCourse", verifyToken, authorizeRole("lecture"), wrapAsync(lectureController.deleteCourse));

router.post("/courses/:courseId/add-topic",verifyToken, authorizeRole("lecture"),wrapAsync(lectureController.addTopic));
router.put("/courses/:courseId/topic/:topicId/editTopic",verifyToken, authorizeRole("lecture"), wrapAsync(lectureController.editTopic));
router.delete("/courses/:courseId/topic/:topicId/deleteTopic",verifyToken, authorizeRole("lecture"), wrapAsync(lectureController.deleteTopic));

router.post("/courses/:courseId/topic/:topicId/add-lecture",verifyToken, authorizeRole("lecture"), uploadVideo.single('video'), wrapAsync(lectureController.addLecture));
router.put("/courses/:courseId/topic/:topicId/lecture/:lectureId/editLecture",verifyToken, authorizeRole("lecture"), uploadVideo.single('video'), wrapAsync(lectureController.editLecture));
router.delete("/courses/:courseId/topic/:topicId/lecture/:lectureId/deleteLecture",verifyToken, authorizeRole("lecture"),wrapAsync(lectureController.deleteLecture))



module.exports = router;