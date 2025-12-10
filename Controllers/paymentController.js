const Stripe = require("stripe");
const stripe = Stripe(process.env.STRIPE_SECRET_KEY);
const Course = require("../models/Course");
const Enrollment = require("../models/Enrollment");
const User = require("../models/User");

// Step 1: Create Checkout Session
module.exports.createCheckoutSession = async (req, res) => {
  try {
    const studentId = req.user.id;
    const { courseId } = req.body;

    console.log("Creating checkout session for student:", studentId, "Course:", courseId);

    // Validate course exists
    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({
        success: false,
        message: "Course not found"
      });
    }

    console.log("Course found:", course.title, "Price:", course.price);

    // Check if already enrolled
    const existingEnrollment = await Enrollment.findOne({
      userId: studentId,
      courseId,
    });
    if (existingEnrollment) {
      return res.status(400).json({
        success: false,
        message: "You are already enrolled in this course"
      });
    }

    // Create Stripe Checkout Session (hosted payment page)
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "inr",
            product_data: {
              name: course.title,
              description: course.description,
              images: [course.courseImage],
            },
            unit_amount: Math.round(course.price * 100), // Convert to paise
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `${process.env.FRONTEND_URL}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.FRONTEND_URL}/cancel`,
      metadata: {
        studentId: studentId.toString(),
        courseId: courseId.toString(),
      },
    });

    console.log("Checkout session created:", session.id);

    // Create enrollment record with pending payment
    const enrollment = new Enrollment({
      userId: studentId,
      courseId,
      payment: "pending",
      isApproved: "pending",
      stripeSessionId: session.id,
    });
    await enrollment.save();

    console.log("Enrollment created:", enrollment._id);

    return res.status(200).json({
      success: true,
      sessionId: session.id,
      url: session.url,
      enrollmentId: enrollment._id,
    });
  } catch (error) {
    console.error("Error creating checkout session:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to create payment session"
    });
  }
};

// Step 2: Verify Payment (called after successful payment)
module.exports.verifyPayment = async (req, res) => {
  try {
    const { sessionId, enrollmentId } = req.body;

    console.log("Verifying payment for session:", sessionId);

    // Retrieve session from Stripe
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    if (session.payment_status !== "paid") {
      return res.status(400).json({
        success: false,
        message: "Payment not completed"
      });
    }

    // Update enrollment to success
    const enrollment = await Enrollment.findByIdAndUpdate(
      enrollmentId,
      { payment: "success" },
      { new: true }
    );

    if (!enrollment) {
      return res.status(404).json({
        success: false,
        message: "Enrollment not found"
      });
    }

    console.log("Payment verified and enrollment updated:", enrollment._id);

    return res.status(200).json({
      success: true,
      message: "Payment verified! Enrollment confirmed.",
      enrollment,
    });
  } catch (error) {
    console.error("Error verifying payment:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to verify payment"
    });
  }
};

// Step 3: Handle Stripe Webhook
module.exports.handleStripeWebhook = async (req, res) => {
  const sig = req.headers["stripe-signature"];

  try {
    const event = stripe.webhooks.constructEvent(
      req.rawBody,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );

    if (event.type === "checkout.session.completed") {
      const session = event.data.object;
      
      await Enrollment.findOneAndUpdate(
        { stripeSessionId: session.id },
        { payment: "success" }
      );

      console.log("Webhook: Payment completed for session:", session.id);
    }

    res.json({ received: true });
  } catch (error) {
    console.error("Webhook error:", error.message);
    res.status(400).send(`Webhook Error: ${error.message}`);
  }
};

// Step 4: Get Enrollment Status
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
