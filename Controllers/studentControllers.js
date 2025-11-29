// const Stripe = require("stripe");
// const stripe = Stripe(process.env.STRIPE_SECRET_KEY);
// const Course = require('../models/Course');
// const Enrollment = require('../models/Enrollment');

// module.exports.enrollCourse = async (req, res) => {
//   const studentId = req.user.id;
//   const { courseId } = req.params;

//   // Validate course
//   const course = await Course.findById(courseId);
//   if (!course)
//     return res
//       .status(404)
//       .json({ success: false, message: "Course not found" });

//   // Check if already enrolled
//   const alreadyEnrolled = await Enrollment.findOne({
//     userId: studentId,
//     courseId,
//   });
  
//   if (alreadyEnrolled)
//     return res
//       .status(400)
//       .json({ success: false, message: "Already enrolled" });

//   // Save enrollment with pending payment
//   const enrollment = new Enrollment({
//     userId: studentId,
//     courseId,
//     paymentStatus: "pending",
//     approvalStatus: "pending",
//   });

//   await enrollment.save();

//   //Return client secret to frontend
//   return res.status(200).json({
//     success: true,
//     message: "Payment initiated. Complete the payment to enroll.",
//     enrollmentId: enrollment._id,
//     amount: course.price, // for showing ₹ on frontend
//   });
// };

