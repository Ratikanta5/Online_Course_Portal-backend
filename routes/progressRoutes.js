const express = require("express");
const verifyToken = require("../middlewares/authMiddleware");
const { saveProgress, getProgress } = require("../Controllers/progressController");

const router = express.Router();

// Middleware to require authentication
router.use(verifyToken);

// Save student progress
router.post("/save", saveProgress);

// Get student progress for a course
router.get("/:courseId", getProgress);

module.exports = router;
