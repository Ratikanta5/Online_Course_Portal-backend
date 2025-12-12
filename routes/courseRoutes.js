const express = require('express');
const wrapAsync = require('../utills/wrapAsync');
const router = express.Router();
const courseController = require('../Controllers/courseController');
const verifyToken = require('../middlewares/authMiddleware');
const authorizeRole = require('../middlewares/roleMiddleware');


router.get("/",  wrapAsync(courseController.getVerifiedCourse));

module.exports = router;