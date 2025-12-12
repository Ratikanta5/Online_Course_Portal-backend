const Course = require("../models/Course");
const Topic = require("../models/Topic");
const User = require("../models/User");
const Review = require("../models/Review");

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
        $addFields: {
          topics: {
            $map: {
              input: "$topics",
              as: "topic",
              in: {
                _id: "$$topic._id",
                title: "$$topic.title",
                description: "$$topic.description",
                topicStatus: "$$topic.topicStatus",
                lectures: {
                  $filter: {
                    input: "$$topic.lectures",
                    as: "lecture",
                    cond: { $eq: ["$$lecture.status", "approved"] },
                  },
                },
              },
            },
          },
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
        $lookup: {
          from: "reviews",
          localField: "_id",
          foreignField: "course",
          as: "reviewsData",
        },
      },
      {
        $addFields: {
          averageRating: {
            $cond: {
              if: { $gt: [{ $size: "$reviewsData" }, 0] },
              then: { $avg: "$reviewsData.rating" },
              else: 0,
            },
          },
          totalReviews: { $size: "$reviewsData" },
        },
      },
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
          averageRating: 1,
          totalReviews: 1,
        },
      },
    ]);

    return res.json({ success: true, courses });
  } catch (error) {
    return res.json({ success: false, message: error.message });
  }
};

