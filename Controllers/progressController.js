const Enrollment = require("../models/Enrollment");
const Course = require("../models/Course");
const Topic = require("../models/Topic");
const ExpressError = require("../utills/ExpressError");

exports.saveProgress = async (req, res, next) => {
  try {
    const { courseId, completedLectures, videoProgress, currentTopic, currentLecture, lastAccessedAt } = req.body;
    const userId = req.user.id;

    if (!courseId) {
      return next(new ExpressError(400, "Course ID is required"));
    }

    let enrollment = await Enrollment.findOne({
      userId: userId,
      courseId: courseId
    });

    if (!enrollment) {
      return next(new ExpressError(403, "You must be enrolled in this course to save progress"));
    }

    enrollment.completedLectures = (completedLectures || []).map(lectureId => {
      const [topicIdx, lectureIdx] = lectureId.split('-');
      return {
        topicIndex: parseInt(topicIdx),
        lectureIndex: parseInt(lectureIdx),
        completedAt: new Date()
      };
    });

    const videoMap = new Map();
    if (videoProgress) {
      Object.entries(videoProgress).forEach(([lectureId, progress]) => {
        videoMap.set(lectureId, {
          currentTime: progress.current || 0,
          duration: progress.duration || 0,
          lastAccessedAt: new Date()
        });
      });
    }
    enrollment.videoProgress = videoMap;

    enrollment.currentTopicIndex = currentTopic ?? 0;
    enrollment.currentLectureIndex = currentLecture ?? 0;
    enrollment.lastAccessedAt = new Date(lastAccessedAt) || new Date();

    const totalCompletedLectures = (completedLectures || []).length;

    const topics = await Topic.find({ courseId: courseId });
    let totalLectures = 0;
    if (topics && topics.length > 0) {
      totalLectures = topics.reduce((sum, topic) => {
        return sum + (topic.lectures?.length || 0);
      }, 0);
    }

    enrollment.progressPercentage = totalLectures > 0 
      ? Math.round((totalCompletedLectures / totalLectures) * 100)
      : 0;

    await enrollment.save();

    res.json({
      success: true,
      message: "Progress saved successfully",
      progress: {
        completedLectures: completedLectures || [],
        videoProgress: videoProgress || {},
        currentTopic: enrollment.currentTopicIndex,
        currentLecture: enrollment.currentLectureIndex,
        progressPercentage: enrollment.progressPercentage
      }
    });

  } catch (error) {
    console.error("Error saving progress:", error);
    return next(new ExpressError(500, "Error saving progress"));
  }
};

exports.getProgress = async (req, res, next) => {
  try {
    const { courseId } = req.params;
    const userId = req.user.id;

    const enrollment = await Enrollment.findOne({
      userId: userId,
      courseId: courseId
    });

    if (!enrollment) {
      return next(new ExpressError(404, "No progress found for this course"));
    }

    const videoProgress = {};
    if (enrollment.videoProgress) {
      enrollment.videoProgress.forEach((value, key) => {
        videoProgress[key] = {
          current: value.currentTime,
          duration: value.duration,
          lastAccessedAt: value.lastAccessedAt
        };
      });
    }

    const completedLecturesArray = (enrollment.completedLectures || [])
      .map(cl => cl.topicIndex + "-" + cl.lectureIndex);

    res.json({
      success: true,
      progress: {
        completedLectures: completedLecturesArray,
        videoProgress: videoProgress,
        currentTopic: enrollment.currentTopicIndex,
        currentLecture: enrollment.currentLectureIndex,
        progressPercentage: enrollment.progressPercentage,
        lastAccessedAt: enrollment.lastAccessedAt
      }
    });

  } catch (error) {
    console.error("Error fetching progress:", error);
    return next(new ExpressError(500, "Error fetching progress"));
  }
};

module.exports = exports;
