const Review = require("../models/Review");
const Course = require("../models/Course");
const Enrollment = require("../models/Enrollment");

// GET /api/reviews/course/:courseId - Get all reviews for a course
exports.getCourseReviews = async (req, res, next) => {
  try {
    const { courseId } = req.params;
    const userId = req.user?.id;

    // Get all reviews for this course
    const reviews = await Review.find({ course: courseId })
      .populate("user", "name email profileImage")
      .sort({ createdAt: -1 });

    // Check if current user has reviewed (if logged in)
    let userReview = null;
    if (userId) {
      userReview = reviews.find(
        (r) => r.user._id.toString() === userId.toString()
      );
    }

    // Calculate stats
    const totalReviews = reviews.length;
    const avgRating =
      totalReviews > 0
        ? reviews.reduce((sum, r) => sum + r.rating, 0) / totalReviews
        : 0;

    res.status(200).json({
      success: true,
      reviews,
      userReview,
      stats: {
        totalReviews,
        averageRating: Math.round(avgRating * 10) / 10,
      },
    });
  } catch (error) {
    next(error);
  }
};

// POST /api/reviews - Create a new review
exports.createReview = async (req, res, next) => {
  try {
    const { courseId, rating, comment } = req.body;
    const userId = req.user.id;

    // Validate rating
    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({
        success: false,
        message: "Rating must be between 1 and 5",
      });
    }

    // Check if course exists
    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({
        success: false,
        message: "Course not found",
      });
    }

    // Check if user is enrolled in the course
    const enrollment = await Enrollment.findOne({
      userId: userId,
      courseId: courseId,
      payment: "success",
    });

    if (!enrollment) {
      return res.status(403).json({
        success: false,
        message: "You must be enrolled in this course to leave a review",
      });
    }

    // Check if user already reviewed this course
    const existingReview = await Review.findOne({
      course: courseId,
      user: userId,
    });

    if (existingReview) {
      return res.status(400).json({
        success: false,
        message: "You have already reviewed this course. Please edit your existing review.",
      });
    }

    // Create the review
    const review = await Review.create({
      course: courseId,
      user: userId,
      rating,
      comment: comment?.trim() || "",
    });

    // Add review to course's reviews array
    await Course.findByIdAndUpdate(courseId, {
      $push: { reviews: review._id },
    });

    // Populate user info
    await review.populate("user", "name email profileImage");

    res.status(201).json({
      success: true,
      message: "Review submitted successfully",
      review,
    });
  } catch (error) {
    // Handle duplicate key error (user already reviewed)
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: "You have already reviewed this course",
      });
    }
    next(error);
  }
};

// PUT /api/reviews/:reviewId - Update a review
exports.updateReview = async (req, res, next) => {
  try {
    const { reviewId } = req.params;
    const { rating, comment } = req.body;
    const userId = req.user.id;

    // Validate rating
    if (rating && (rating < 1 || rating > 5)) {
      return res.status(400).json({
        success: false,
        message: "Rating must be between 1 and 5",
      });
    }

    // Find and update only if user owns the review
    const review = await Review.findOneAndUpdate(
      { _id: reviewId, user: userId },
      {
        ...(rating && { rating }),
        ...(comment !== undefined && { comment: comment?.trim() || "" }),
      },
      { new: true }
    ).populate("user", "name email profileImage");

    if (!review) {
      return res.status(404).json({
        success: false,
        message: "Review not found or you don't have permission to edit it",
      });
    }

    res.status(200).json({
      success: true,
      message: "Review updated successfully",
      review,
    });
  } catch (error) {
    next(error);
  }
};

// DELETE /api/reviews/:reviewId - Delete a review
exports.deleteReview = async (req, res, next) => {
  try {
    const { reviewId } = req.params;
    const userId = req.user.id;

    // Find the review first
    const review = await Review.findOne({ _id: reviewId, user: userId });

    if (!review) {
      return res.status(404).json({
        success: false,
        message: "Review not found or you don't have permission to delete it",
      });
    }

    // Remove review from course's reviews array
    await Course.findByIdAndUpdate(review.course, {
      $pull: { reviews: reviewId },
    });

    // Delete the review
    await Review.findByIdAndDelete(reviewId);

    res.status(200).json({
      success: true,
      message: "Review deleted successfully",
    });
  } catch (error) {
    next(error);
  }
};

// POST /api/reviews/:reviewId/helpful - Mark review as helpful
exports.markHelpful = async (req, res, next) => {
  try {
    const { reviewId } = req.params;

    const review = await Review.findByIdAndUpdate(
      reviewId,
      { $inc: { helpfulCount: 1 } },
      { new: true }
    );

    if (!review) {
      return res.status(404).json({
        success: false,
        message: "Review not found",
      });
    }

    res.status(200).json({
      success: true,
      helpfulCount: review.helpfulCount,
    });
  } catch (error) {
    next(error);
  }
};



