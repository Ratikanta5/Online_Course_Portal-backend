const Stripe = require("stripe");
const stripe = Stripe(process.env.STRIPE_SECRET_KEY);
const Course = require("../models/Course");
const Enrollment = require("../models/Enrollment");
const ExpressError = require("../utills/ExpressError");

// Create Payment Intent
module.exports.createPaymentIntent = async (req, res) => {
  try {
    const studentId = req.user.id;
    const { courseId } = req.body;

    console.log("Creating payment intent for student:", studentId, "Course:", courseId);

    // Validate course exists
    const course = await Course.findById(courseId);
    if (!course) {
      throw new ExpressError(404, "Course not found");
    }

    console.log("Course found:", course.title, "Price:", course.price);

    // Check if already enrolled
    const existingEnrollment = await Enrollment.findOne({
      userId: studentId,
      courseId,
    });

    if (existingEnrollment) {
      throw new ExpressError(400, "You are already enrolled in this course");
    }

    // Create payment intent with Stripe
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(course.price * 100), // Convert to paise for INR
      currency: "inr",
      automatic_payment_methods: {
        enabled: true,
      },
      metadata: {
        studentId: studentId.toString(),
        courseId: courseId.toString(),
      },
    });

    console.log("Payment intent created:", paymentIntent.id);

    // Calculate commission (20% admin, 80% lecturer)
    const adminCommission = course.price * 0.2;
    const lecturerEarning = course.price * 0.8;

    // Create enrollment record with pending payment
    const enrollment = new Enrollment({
      userId: studentId,
      courseId,
      payment: "pending",
      coursePrice: course.price,
      adminCommission: adminCommission,
      lecturerEarning: lecturerEarning,
      stripePaymentIntentId: paymentIntent.id,
    });

    await enrollment.save();
    console.log("Enrollment created:", enrollment._id);

    return res.status(200).json({
      success: true,
      clientSecret: paymentIntent.client_secret,
      enrollmentId: enrollment._id,
      amount: course.price,
      courseName: course.title,
      courseImage: course.courseImage,
      breakdown: {
        totalPrice: course.price,
        adminCommission: adminCommission,
        lecturerEarning: lecturerEarning,
      }
    });
  } catch (error) {
    console.error("Error creating payment intent:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to create payment intent"
    });
  }
};

// Confirm Payment
module.exports.confirmPayment = async (req, res) => {
  try {
    const { paymentIntentId, enrollmentId } = req.body;

    console.log("Confirming payment for intent:", paymentIntentId);

    // Retrieve payment intent from Stripe
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

    if (paymentIntent.status !== "succeeded") {
      throw new ExpressError(400, "Payment was not successful");
    }

    // Update enrollment to success
    const enrollment = await Enrollment.findByIdAndUpdate(
      enrollmentId,
      { payment: "success" },
      { new: true }
    )
      .populate('courseId', 'title price')
      .populate('userId', 'name email');

    if (!enrollment) {
      throw new ExpressError(404, "Enrollment not found");
    }

    console.log("Payment confirmed, enrollment updated:", enrollment._id);

    return res.status(200).json({
      success: true,
      message: "Payment successful! Enrollment confirmed.",
      enrollment,
      revenue: {
        totalAmount: enrollment.coursePrice,
        adminEarned: enrollment.adminCommission,
        lecturerEarned: enrollment.lecturerEarning,
      }
    });
  } catch (error) {
    console.error("Error confirming payment:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to confirm payment"
    });
  }
};

// Handle Stripe Webhook
module.exports.handleStripeWebhook = async (req, res) => {
  const sig = req.headers["stripe-signature"];

  try {
    const event = stripe.webhooks.constructEvent(
      req.rawBody,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );

    if (event.type === "payment_intent.succeeded") {
      const paymentIntent = event.data.object;

      await Enrollment.findOneAndUpdate(
        { stripePaymentIntentId: paymentIntent.id },
        { payment: "success" }
      );

      console.log("Webhook: Payment succeeded:", paymentIntent.id);
    }

    res.json({ received: true });
  } catch (error) {
    console.error("Webhook error:", error.message);
    return res.status(400).send(`Webhook Error: ${error.message}`);
  }
};

// Get Enrollment Status
module.exports.getEnrollmentStatus = async (req, res) => {
  try {
    const studentId = req.user.id;
    const { courseId } = req.params;

    const enrollment = await Enrollment.findOne({
      userId: studentId,
      courseId,
    })
      .populate("courseId", "title")
      .populate("userId", "name email");

    if (!enrollment) {
      return res.status(200).json({
        success: true,
        enrolled: false,
        enrollment: null,
      });
    }

    return res.status(200).json({
      success: true,
      enrolled: true,
      enrollment,
    });
  } catch (error) {
    console.error("Error getting enrollment status:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to get enrollment status"
    });
  }
};

// Get My Enrollments (for student dashboard)
module.exports.getMyEnrollments = async (req, res) => {
  try {
    const studentId = req.user.id;

    const enrollments = await Enrollment.find({ userId: studentId })
      .populate('courseId')
      .populate('userId', 'name email')
      .sort({ createdAt: -1 });

    // Map payment field to paymentStatus for frontend compatibility
    const formattedEnrollments = enrollments.map(enrollment => ({
      _id: enrollment._id,
      courseId: enrollment.courseId,
      paymentStatus: enrollment.payment,
      coursePrice: enrollment.coursePrice,
      adminCommission: enrollment.adminCommission,
      lecturerEarning: enrollment.lecturerEarning,
      createdAt: enrollment.createdAt,
      updatedAt: enrollment.updatedAt
    }));

    return res.status(200).json({
      success: true,
      enrollments: formattedEnrollments,
      count: formattedEnrollments.length
    });
  } catch (error) {
    console.error("Error fetching enrollments:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch enrollments"
    });
  }
};

// Get Total Revenue (for admin dashboard)
module.exports.getTotalRevenue = async (req, res) => {
  try {
    // Get all successful enrollments
    const enrollments = await Enrollment.find({ payment: "success" });

    const totalRevenue = enrollments.reduce((sum, enrollment) => sum + enrollment.coursePrice, 0);
    const adminTotal = enrollments.reduce((sum, enrollment) => sum + enrollment.adminCommission, 0);
    const lecturerTotal = enrollments.reduce((sum, enrollment) => sum + enrollment.lecturerEarning, 0);

    return res.status(200).json({
      success: true,
      revenue: {
        totalRevenue,
        adminCommission: adminTotal,
        lecturerEarnings: lecturerTotal,
        totalEnrollments: enrollments.length,
      }
    });
  } catch (error) {
    console.error("Error fetching revenue:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch revenue"
    });
  }
};

// Get Lecturer Revenue (for lecturer dashboard)
module.exports.getLecturerRevenue = async (req, res) => {
  try {
    const lecturerId = req.user.id;

    // Get all successful enrollments for lecturer's courses
    const enrollments = await Enrollment.find({ payment: "success" })
      .populate({
        path: 'courseId',
        match: { createdBy: lecturerId }
      });

    // Filter enrollments where course belongs to this lecturer
    const lecturerEnrollments = enrollments.filter(e => e.courseId !== null);

    const totalEarning = lecturerEnrollments.reduce((sum, enrollment) => sum + enrollment.lecturerEarning, 0);

    return res.status(200).json({
      success: true,
      revenue: {
        totalEarning,
        totalEnrollments: lecturerEnrollments.length,
        breakdown: lecturerEnrollments.map(e => ({
          course: e.courseId.title,
          amount: e.lecturerEarning,
          date: e.createdAt
        }))
      }
    });
  } catch (error) {
    console.error("Error fetching lecturer revenue:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch revenue"
    });
  }
};
