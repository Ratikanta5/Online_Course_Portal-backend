const Course = require("../models/Course");
const Topic = require("../models/Topic");
const User = require("../models/User");

module.exports.getVerifiedCourse = async (req, res) => {
  try {
    const courses = await Course.aggregate([
      {
        $match: { courseStatus: "approved" },
      },
      {
        $lookup: {
          from: "topics",
          localField: "_id",
          foreignField: "courseId",
          as: "topics",
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "createdBy",
          foreignField: "_id",
          as: "creator",
        },
      },
      { $unwind: "$creator" },
      {
        $project: {
          title: 1,
          description: 1,
          price: 1,
          creator: { name: 1, email: 1, profileImage: 1, bio: 1 },
          category: 1,
          courseImage: 1,
          topics: 1,
          createdAt: 1,
        },
      },
    ]);

    return res.json({ success: true, courses });
  } catch (error) {
    return res.json({ success: false, message: error.message });
  }
};
