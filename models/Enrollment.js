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
    stripePaymentIntentId: {
      type: String,
      default: null,
    },
    // Revenue tracking
    coursePrice: {
      type: Number,
      default: 0,
    },
    adminCommission: {
      type: Number,
      default: 0, // 20% of course price
    },
    lecturerEarning: {
      type: Number,
      default: 0, // 80% of course price
    },
    // Progress tracking fields
    completedLectures: [
      {
        topicIndex: Number,
        lectureIndex: Number,
        completedAt: { type: Date, default: Date.now }
      }
    ],
    videoProgress: {
      type: Map,
      of: {
        currentTime: Number,
        duration: Number,
        lastAccessedAt: Date
      },
      default: new Map()
    },
    currentTopicIndex: {
      type: Number,
      default: 0
    },
    currentLectureIndex: {
      type: Number,
      default: 0
    },
    progressPercentage: {
      type: Number,
      default: 0
    },
    lastAccessedAt: {
      type: Date,
      default: Date.now
    }
  },
  { timestamps: true }
);

const Enrollment = mongoose.model("Enrollment", enrolledSchema);

module.exports = Enrollment;
