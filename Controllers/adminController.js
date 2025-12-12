const Course = require("../models/Course");
const User = require("../models/User");
const Enrollment = require("../models/Enrollment");
const Topic = require("../models/Topic");
const ExpressError = require("../utills/ExpressError");

// Get dashboard statistics
module.exports.getDashboardStats = async (req, res) => {
  try {
    const totalCourses = await Course.countDocuments();
    const pendingCourses = await Course.countDocuments({ courseStatus: "pending" });
    const approvedCourses = await Course.countDocuments({ courseStatus: "approved" });
    const rejectedCourses = await Course.countDocuments({ courseStatus: "rejected" });
    const totalUsers = await User.countDocuments();
    const totalLecturers = await User.countDocuments({ role: "lecture" });
    const totalStudents = await User.countDocuments({ role: "student" });
    const totalAdmins = await User.countDocuments({ role: "admin" });

    // Get pending topics count
    const pendingTopics = await Topic.countDocuments({ topicStatus: "pending" });
    
    // Get pending lectures count (need to aggregate)
    const topicsWithPendingLectures = await Topic.aggregate([
      { $unwind: "$lectures" },
      { $match: { "lectures.status": "pending" } },
      { $count: "count" }
    ]);
    const pendingLectures = topicsWithPendingLectures[0]?.count || 0;

    // Get enrollment stats
    const totalEnrollments = await Enrollment.countDocuments();
    const successfulEnrollments = await Enrollment.countDocuments({ payment: "success" });
    const pendingEnrollments = await Enrollment.countDocuments({ payment: "pending" });

    // Get revenue stats from successful enrollments
    const revenueData = await Enrollment.aggregate([
      { $match: { payment: "success" } },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: "$coursePrice" },
          adminCommissionTotal: { $sum: "$adminCommission" },
          lecturerEarningsTotal: { $sum: "$lecturerEarning" }
        }
      }
    ]);

    const revenue = revenueData[0] || { totalRevenue: 0, adminCommissionTotal: 0, lecturerEarningsTotal: 0 };

    res.status(200).json({
      success: true,
      stats: {
        // Course stats
        totalCourses,
        pendingCourses,
        approvedCourses,
        rejectedCourses,
        // Topic & Lecture stats
        pendingTopics,
        pendingLectures,
        // User stats
        totalUsers,
        totalLecturers,
        totalStudents,
        totalAdmins,
        // Enrollment stats
        totalEnrollments,
        successfulEnrollments,
        pendingEnrollments,
        // Revenue stats
        totalRevenue: revenue.totalRevenue,
        adminCommissionTotal: revenue.adminCommissionTotal,
        lecturerEarningsTotal: revenue.lecturerEarningsTotal,
      },
    });
  } catch (error) {
    throw new ExpressError(500, error.message);
  }
};

// Get all courses for admin review
module.exports.getAllCourses = async (req, res) => {
  try {
    const courses = await Course.find()
      .populate("createdBy", "name email")
      .select("title description price category courseStatus createdAt createdBy");

    res.status(200).json({
      success: true,
      courses,
      total: courses.length,
    });
  } catch (error) {
    throw new ExpressError(500, error.message);
  }
};

// Get pending courses only (for approval)
module.exports.getPendingCourses = async (req, res) => {
  try {
    const courses = await Course.find({ courseStatus: "pending" })
      .populate("createdBy", "name email")
      .select("title description price category courseStatus createdAt createdBy");

    res.status(200).json({
      success: true,
      courses,
      total: courses.length,
    });
  } catch (error) {
    throw new ExpressError(500, error.message);
  }
};

// Get all pending topics (for approval)
module.exports.getPendingTopics = async (req, res) => {
  try {
    const topics = await Topic.find({ topicStatus: "pending" })
      .populate({
        path: "courseId",
        select: "title createdBy",
        populate: { path: "createdBy", select: "name email" }
      });

    res.status(200).json({
      success: true,
      topics,
      total: topics.length,
    });
  } catch (error) {
    throw new ExpressError(500, error.message);
  }
};

// Get all pending lectures (for approval)
module.exports.getPendingLectures = async (req, res) => {
  try {
    // Find all topics that have at least one pending lecture
    const topics = await Topic.find({ "lectures.status": "pending" })
      .populate({
        path: "courseId",
        select: "title createdBy",
        populate: { path: "createdBy", select: "name email" }
      });

    // Extract pending lectures from topics
    const pendingLectures = [];
    topics.forEach(topic => {
      topic.lectures.forEach(lecture => {
        if (lecture.status === "pending") {
          pendingLectures.push({
            _id: lecture._id,
            title: lecture.title,
            lectureDuration: lecture.lectureDuration,
            coveredDuration: lecture.coveredDuration,
            videoUrl: lecture.videoUrl,
            status: lecture.status,
            topicId: topic._id,
            topicTitle: topic.title,
            courseId: topic.courseId?._id,
            courseTitle: topic.courseId?.title,
            lecturerName: topic.courseId?.createdBy?.name,
            lecturerEmail: topic.courseId?.createdBy?.email,
          });
        }
      });
    });

    res.status(200).json({
      success: true,
      lectures: pendingLectures,
      total: pendingLectures.length,
    });
  } catch (error) {
    throw new ExpressError(500, error.message);
  }
};

// Approve a topic
module.exports.approveTopic = async (req, res) => {
  try {
    const { topicId } = req.params;

    if (!topicId) {
      throw new ExpressError(400, "Topic ID is required");
    }

    const topic = await Topic.findByIdAndUpdate(
      topicId,
      { topicStatus: "approved" },
      { new: true }
    );

    if (!topic) {
      throw new ExpressError(404, "Topic not found");
    }

    res.status(200).json({
      success: true,
      message: "Topic approved successfully",
      topic,
    });
  } catch (error) {
    throw new ExpressError(500, error.message);
  }
};

// Reject a topic
module.exports.rejectTopic = async (req, res) => {
  try {
    const { topicId } = req.params;

    if (!topicId) {
      throw new ExpressError(400, "Topic ID is required");
    }

    const topic = await Topic.findByIdAndUpdate(
      topicId,
      { topicStatus: "rejected" },
      { new: true }
    );

    if (!topic) {
      throw new ExpressError(404, "Topic not found");
    }

    res.status(200).json({
      success: true,
      message: "Topic rejected successfully",
      topic,
    });
  } catch (error) {
    throw new ExpressError(500, error.message);
  }
};

// Approve a lecture
module.exports.approveLecture = async (req, res) => {
  try {
    const { topicId, lectureId } = req.params;

    if (!topicId || !lectureId) {
      throw new ExpressError(400, "Topic ID and Lecture ID are required");
    }

    const topic = await Topic.findById(topicId);
    if (!topic) {
      throw new ExpressError(404, "Topic not found");
    }

    const lecture = topic.lectures.id(lectureId);
    if (!lecture) {
      throw new ExpressError(404, "Lecture not found");
    }

    lecture.status = "approved";
    await topic.save();

    res.status(200).json({
      success: true,
      message: "Lecture approved successfully",
      lecture,
    });
  } catch (error) {
    throw new ExpressError(500, error.message);
  }
};

// Reject a lecture
module.exports.rejectLecture = async (req, res) => {
  try {
    const { topicId, lectureId } = req.params;

    if (!topicId || !lectureId) {
      throw new ExpressError(400, "Topic ID and Lecture ID are required");
    }

    const topic = await Topic.findById(topicId);
    if (!topic) {
      throw new ExpressError(404, "Topic not found");
    }

    const lecture = topic.lectures.id(lectureId);
    if (!lecture) {
      throw new ExpressError(404, "Lecture not found");
    }

    lecture.status = "rejected";
    await topic.save();

    res.status(200).json({
      success: true,
      message: "Lecture rejected successfully",
      lecture,
    });
  } catch (error) {
    throw new ExpressError(500, error.message);
  }
};

// Get all users
module.exports.getAllUsers = async (req, res) => {
  try {
    const users = await User.find()
      .select("name email role isVerified createdAt")
      .limit(100);

    res.status(200).json({
      success: true,
      users,
      total: users.length,
    });
  } catch (error) {
    throw new ExpressError(500, error.message);
  }
};

// Get all enrollments with details
module.exports.getAllEnrollments = async (req, res) => {
  try {
    const enrollments = await Enrollment.find()
      .populate("userId", "name email")
      .populate("courseId", "title price")
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      enrollments,
      total: enrollments.length,
    });
  } catch (error) {
    throw new ExpressError(500, error.message);
  }
};

// Get revenue statistics
module.exports.getRevenueStats = async (req, res) => {
  try {
    // Use aggregation for better performance
    const revenueData = await Enrollment.aggregate([
      { $match: { payment: "success" } },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: "$coursePrice" },
          adminCommission: { $sum: "$adminCommission" },
          lecturerEarnings: { $sum: "$lecturerEarning" },
          count: { $sum: 1 }
        }
      }
    ]);

    const summary = revenueData[0] || {
      totalRevenue: 0,
      adminCommission: 0,
      lecturerEarnings: 0,
      count: 0
    };

    // Revenue by course
    const byCourseData = await Enrollment.aggregate([
      { $match: { payment: "success" } },
      {
        $group: {
          _id: "$courseId",
          totalRevenue: { $sum: "$coursePrice" },
          adminShare: { $sum: "$adminCommission" },
          lecturerShare: { $sum: "$lecturerEarning" },
          enrollments: { $sum: 1 }
        }
      },
      {
        $lookup: {
          from: "courses",
          localField: "_id",
          foreignField: "_id",
          as: "courseInfo"
        }
      },
      {
        $unwind: { path: "$courseInfo", preserveNullAndEmptyArrays: true }
      },
      {
        $project: {
          courseId: "$_id",
          name: "$courseInfo.title",
          totalRevenue: 1,
          adminShare: 1,
          lecturerShare: 1,
          enrollments: 1
        }
      }
    ]);

    res.status(200).json({
      success: true,
      summary: {
        totalRevenue: summary.totalRevenue,
        adminCommission: summary.adminCommission,
        lecturerEarnings: summary.lecturerEarnings,
        totalEnrollments: summary.count,
      },
      byCourse: byCourseData,
    });
  } catch (error) {
    throw new ExpressError(500, error.message);
  }
};

// Approve a course
module.exports.approveCourse = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      throw new ExpressError(400, "Course ID is required");
    }

    const course = await Course.findByIdAndUpdate(
      id,
      { courseStatus: "approved" },
      { new: true }
    );

    if (!course) {
      throw new ExpressError(404, "Course not found");
    }

    res.status(200).json({
      success: true,
      message: "Course approved successfully",
      course,
    });
  } catch (error) {
    throw new ExpressError(500, error.message);
  }
};

// Reject a course
module.exports.rejectCourse = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    if (!id) {
      throw new ExpressError(400, "Course ID is required");
    }

    const course = await Course.findByIdAndUpdate(
      id,
      {
        courseStatus: "rejected",
        rejectionReason: reason || "No reason provided",
      },
      { new: true }
    );

    if (!course) {
      throw new ExpressError(404, "Course not found");
    }

    res.status(200).json({
      success: true,
      message: "Course rejected successfully",
      course,
    });
  } catch (error) {
    throw new ExpressError(500, error.message);
  }
};

// Delete a course
module.exports.deleteCourse = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      throw new ExpressError(400, "Course ID is required");
    }

    const course = await Course.findByIdAndDelete(id);

    if (!course) {
      throw new ExpressError(404, "Course not found");
    }

    res.status(200).json({
      success: true,
      message: "Course deleted successfully",
    });
  } catch (error) {
    throw new ExpressError(500, error.message);
  }
};

// Get course details for admin
module.exports.getCourseDetails = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      throw new ExpressError(400, "Course ID is required");
    }

    const course = await Course.findById(id)
      .populate("createdBy", "name email")
      .populate("Topics");

    if (!course) {
      throw new ExpressError(404, "Course not found");
    }

    // Get enrollment stats for this course using aggregation
    const enrollmentStats = await Enrollment.aggregate([
      { $match: { courseId: course._id, payment: "success" } },
      {
        $group: {
          _id: null,
          totalEnrollments: { $sum: 1 },
          totalRevenue: { $sum: "$coursePrice" },
          adminEarned: { $sum: "$adminCommission" },
          lecturerEarned: { $sum: "$lecturerEarning" }
        }
      }
    ]);

    const stats = enrollmentStats[0] || {
      totalEnrollments: 0,
      totalRevenue: 0,
      adminEarned: 0,
      lecturerEarned: 0
    };

    res.status(200).json({
      success: true,
      course,
      enrollmentStats: stats,
    });
  } catch (error) {
    throw new ExpressError(500, error.message);
  }
};

// Deactivate user account
module.exports.deactivateUser = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      throw new ExpressError(400, "User ID is required");
    }

    const user = await User.findByIdAndUpdate(
      id,
      { isVerified: false },
      { new: true }
    );

    if (!user) {
      throw new ExpressError(404, "User not found");
    }

    res.status(200).json({
      success: true,
      message: "User deactivated successfully",
    });
  } catch (error) {
    throw new ExpressError(500, error.message);
  }
};

// Get lecturer earnings
module.exports.getLecturerEarnings = async (req, res) => {
  try {
    const lecturerId = req.params.lecturerId;

    // Get all courses by this lecturer
    const lecturerCourses = await Course.find({ createdBy: lecturerId }).select("_id title");
    const courseIds = lecturerCourses.map(c => c._id);

    // Get all successful enrollments for these courses
    const earningsData = await Enrollment.aggregate([
      { 
        $match: { 
          courseId: { $in: courseIds },
          payment: "success" 
        } 
      },
      {
        $group: {
          _id: "$courseId",
          totalEarning: { $sum: "$lecturerEarning" },
          coursePrice: { $sum: "$coursePrice" },
          enrollments: { $sum: 1 }
        }
      },
      {
        $lookup: {
          from: "courses",
          localField: "_id",
          foreignField: "_id",
          as: "courseInfo"
        }
      },
      {
        $unwind: { path: "$courseInfo", preserveNullAndEmptyArrays: true }
      }
    ]);

    const totalEarning = earningsData.reduce((sum, item) => sum + item.totalEarning, 0);
    const totalEnrollments = earningsData.reduce((sum, item) => sum + item.enrollments, 0);

    res.status(200).json({
      success: true,
      earnings: {
        totalEarning,
        totalEnrollments,
        breakdown: earningsData.map(item => ({
          course: item.courseInfo?.title || "Unknown Course",
          lecturerEarning: item.totalEarning,
          coursePrice: item.coursePrice,
          enrollments: item.enrollments
        }))
      }
    });
  } catch (error) {
    throw new ExpressError(500, error.message);
  }
};
