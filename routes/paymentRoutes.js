const express = require("express");
const router = express.Router();
const paymentController = require("../Controllers/paymentController");
const verifyToken = require("../middlewares/authMiddleware");
const authorizeRole = require("../middlewares/roleMiddleware");
const wrapAsync = require("../utills/wrapAsync");

// Student routes (protected)
router.post(
  "/create-payment-intent",
  verifyToken,
  authorizeRole("student"),
  wrapAsync(paymentController.createPaymentIntent)
);

router.post(
  "/confirm-payment",
  verifyToken,
  authorizeRole("student"),
  wrapAsync(paymentController.confirmPayment)
);

router.get(
  "/enrollment-status/:courseId",
  verifyToken,
  wrapAsync(paymentController.getEnrollmentStatus)
);

// Stripe webhook (no auth needed - Stripe verifies signature)
router.post(
  "/webhook",
  express.raw({ type: "application/json" }),
  wrapAsync(paymentController.handleStripeWebhook)
);

router.get(
  "/my-enrollments",
  verifyToken,
  wrapAsync(paymentController.getMyEnrollments)
);

module.exports = router;

