const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const enrolledSchema = new Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    courseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Course",
      required: true,
    },
    payment: {
      type: String,
      enum: ["pending", "success"],
      default: "pending",
    },
    isApproved: {
      type: String,
      enum: ["pending", "success", "reject"],
      default: "pending",
    },
  },
  { timestamps: true }
);

const Enrollment = mongoose.model("Enrollment", enrolledSchema);

module.exports = Enrollment;
