const express = require('express');
const router = express.Router();
const reviewController = require('../Controllers/reviewController');
const verifyToken = require('../middlewares/authMiddleware');
const wrapAsync = require('../utills/wrapAsync');

// Optional auth middleware - sets req.user if token exists, but doesn't require it
const optionalAuth = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return verifyToken(req, res, next);
  }
  next();
};

// GET reviews for a course (public, but returns userReview if logged in)
router.get('/course/:courseId', wrapAsync(reviewController.getCourseReviews));

// POST new review (auth required)
router.post('/', verifyToken, wrapAsync(reviewController.createReview));

// PUT update review (auth required)
router.put('/:reviewId', verifyToken, wrapAsync(reviewController.updateReview));

// DELETE review (auth required)
router.delete('/:reviewId', verifyToken, wrapAsync(reviewController.deleteReview));

// POST mark as helpful (public)
router.post('/:reviewId/helpful', wrapAsync(reviewController.markHelpful));

module.exports = router;
