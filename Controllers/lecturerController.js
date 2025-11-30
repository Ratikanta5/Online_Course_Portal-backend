const Course = require("../models/Course");
const User = require("../models/User");
const Topic = require("../models/Topic");
const ExpressError = require("../utills/ExpressError");
const cloudinary = require("cloudinary").v2;

//add new course
module.exports.addCourse = async (req, res) => {
  const { title, description, price, category } = req.body;

  if (!title || !description || !price || !category) {
    throw new ExpressError(400, "Title, description, and price are required");
  }

  let url = req.file.path;
  let filename = req.file.filename;

  const lecture = await User.findById(req.user.id);

  if (!lecture.isVerified) {
    throw new ExpressError(
      401,
      "Email not verified. Please check your inbox and verify your account."
    );
  }

  const newCourse = new Course(req.body);
  newCourse.courseImage = { url, filename };
  newCourse.createdBy = req.user.id;

  let savedCourse = await newCourse.save();

  res.status(200).json({
    success: true,
    message: "Course Created Succesfully",
    course: savedCourse,
  });
};

//edit the course

module.exports.editCourse = async (req, res) => {
  const { courseId } = req.params;

  if (!courseId) {
    throw new ExpressError(400, "Course ID is required");
  }

  const course = await Course.findById(courseId);
  if (!course) {
    throw new ExpressError(404, "Course not found");
  }

  const lecture = await User.findById(req.user.id);

  if (!lecture.isVerified) {
    throw new ExpressError(
      401,
      "Email not verified. Please check your inbox and verify your account."
    );
  }

  if (course.createdBy.toString() !== req.user.id.toString()) {
    throw new ExpressError(403, "You are not allowed to edit this course");
  }

  const updatedData = { ...req.body };

  //prevent empty object
  if (Object.keys(updatedData).length === 0 && !req.file) {
    throw new ExpressError(400, "No data provided for update");
  }

  //if file present then update else skip the file and go on..

  if (req.file) {
    updatedData.courseImage = {
      url: req.file.path,
      filename: req.file.filename,
    };
  }

  let updatedCourse = await Course.findByIdAndUpdate(courseId, updatedData, {
    runValidators: true,
    new: true,
  });

  return res.status(200).json({
    message: "Course updated successfully",
    course: updatedCourse,
  });
};

//delete the course

module.exports.deleteCourse = async (req, res) => {
  const { courseId } = req.params;

  if (!courseId) {
    throw new ExpressError(400, "Course ID is required");
  }

  const course = await Course.findById(courseId);
  if (!course) {
    throw new ExpressError(404, "Course not found");
  }

  const lecture = await User.findById(req.user.id);

  if (!lecture.isVerified) {
    throw new ExpressError(
      401,
      "Email not verified. Please check your inbox and verify your account."
    );
  }

  if (course.createdBy.toString() !== req.user.id.toString()) {
    throw new ExpressError(403, "You are not allowed to delete this course");
  }

  await Course.findByIdAndDelete(courseId);

  return res.status(200).json({
    message: "Course deleted successfully",
  });
};

//add topic to the course
module.exports.addTopic = async (req, res) => {
  let { courseId } = req.params;
  const course = await Course.findById(courseId);

  if (!course) {
    throw new ExpressError(404, "course not found");
  }
  const lecture = await User.findById(req.user.id);

  if (!lecture.isVerified) {
    throw new ExpressError(
      401,
      "Email not verified. Please check your inbox and verify your account."
    );
  }

  if (course.createdBy.toString() !== req.user.id.toString()) {
    throw new ExpressError(
      403,
      "You are not allowed to add lectures to this course"
    );
  }

  const newTopic = new Topic({ ...req.body, courseId: courseId });
  await newTopic.save();

  course.Topics.push(newTopic._id);

  await course.save();

  return res.status(201).json({
    success: true,
    message: "new Topic added added successfully",
    topic: newTopic,
    course: course,
  });
};

//edit the topic

module.exports.editTopic = async (req, res) => {
  const { courseId, topicId } = req.params;

  if (!courseId) {
    throw new ExpressError(400, "Course ID is required");
  }

  const course = await Course.findById(courseId);
  if (!course) {
    throw new ExpressError(404, "Course not found");
  }

  const lecture = await User.findById(req.user.id);

  if (!lecture.isVerified) {
    throw new ExpressError(
      401,
      "Email not verified. Please check your inbox and verify your account."
    );
  }

  if (course.createdBy.toString() !== req.user.id.toString()) {
    throw new ExpressError(403, "You are not allowed to edit this topic");
  }

  const topic = await Topic.findOne({ _id: topicId, courseId: courseId });

  if (!topic) {
    throw new ExpressError(404, "Topic not found under this course");
  }

  topic.title = req.body.title || topic.title;
  topic.topicStatus = "pending";

  await topic.save();

  res.status(200).json({
    success: true,
    message: "Topic updated",
    topic,
  });
};

//delete the topic
module.exports.deleteTopic = async (req, res, next) => {
  const { courseId, topicId } = req.params;

  if (!courseId) throw new ExpressError(400, "Course ID is required");
  if (!topicId) throw new ExpressError(400, "Topic ID is required");

  const course = await Course.findById(courseId);
  if (!course) throw new ExpressError(404, "Course not found");

  const lecture = await User.findById(req.user.id);
  if (!lecture) throw new ExpressError(404, "User not found");
  if (!lecture.isVerified) throw new ExpressError(401, "Email not verified");

  if (course.createdBy.toString() !== req.user.id.toString()) {
    throw new ExpressError(403, "You are not authorized to delete this topic");
  }

  const topic = await Topic.findById(topicId);
  if (!topic) throw new ExpressError(404, "Topic not found");

  if (topic.courseId != courseId) {
    throw new ExpressError(404, "Topic not found in this course");
  }

  await Course.findByIdAndUpdate(courseId, { $pull: { Topics: topicId } });

  const deletedTopic = await Topic.findByIdAndDelete(topicId);
  if (!deletedTopic) throw new ExpressError(404, "Topic not found in database");

  return res.status(200).json({
    success: true,
    message: "Topic deleted successfully",
  });
};

//add lecture

module.exports.addLecture = async (req, res) => {
  const { courseId, topicId } = req.params;
  const { title, lectureDuration, coveredDuration } = req.body;

  if (!courseId) throw new ExpressError(400, "Course ID is required");
  if (!topicId) throw new ExpressError(400, "Topic ID is required");

  const course = await Course.findById(courseId);
  if (!course) throw new ExpressError(404, "Course not found");

  const lecture = await User.findById(req.user.id);
  if (!lecture) throw new ExpressError(404, "User not found");
  if (!lecture.isVerified) throw new ExpressError(401, "Email not verified");

  if (course.createdBy.toString() !== req.user.id.toString()) {
    throw new ExpressError(403, "You are not authorized to delete this topic");
  }

  const topic = await Topic.findById(topicId);
  if (!topic) throw new ExpressError(404, "Topic not found");

  if (topic.courseId != courseId) {
    throw new ExpressError(404, "Topic not found in this course");
  }

  if (Number(coveredDuration) > Number(lectureDuration)) {
    return res.status(400).json({
      success: false,
      message: "Covered duration cannot be greater than lecture duration",
    });
  }

  let url = " ";
  let filename = " ";

  if (req.file) {
    url = req.file.path;
    filename = req.file.filename;
  } else {
    return res.status(400).json({
      success: false,
      message: "Video file is required",
    });
  }

  topic.lectures.push({
    title: title || "Untitled Topic",
    lectureDuration: Number(lectureDuration),
    coveredDuration: Number(coveredDuration),
    videoUrl: { url, filename },
  });

  await topic.save();

  return res.status(201).json({
    success: true,
    message: "Lecture added successfully!",
    topic,
  });
};

//edit lecture

module.exports.editLecture = async (req, res) => {
  const { courseId, topicId, lectureId } = req.params;
  const { title, lectureDuration, coveredDuration } = req.body;

  // Required fields check
  if (!courseId) throw new ExpressError(400, "Course ID is required");
  if (!topicId) throw new ExpressError(400, "Topic ID is required");
  if (!lectureId) throw new ExpressError(400, "Lecture ID is required");

  // Check course
  const course = await Course.findById(courseId);
  if (!course) throw new ExpressError(404, "Course not found");

  // Check user
  const user = await User.findById(req.user.id);
  if (!user) throw new ExpressError(404, "User not found");
  if (!user.isVerified) throw new ExpressError(401, "Email not verified");

  // Authorization
  if (course.createdBy.toString() !== req.user.id.toString()) {
    throw new ExpressError(403, "You are not authorized to edit this lecture");
  }

  // Find topic
  const topic = await Topic.findById(topicId);
  if (!topic) throw new ExpressError(404, "Topic not found");

  if (topic.courseId.toString() !== courseId) {
    throw new ExpressError(400, "Topic does not belong to this course");
  }

  // Find lecture inside topic.lectures
  const lecture = topic.lectures.id(lectureId);
  if (!lecture) throw new ExpressError(404, "Lecture not found");

  // Validate durations
  if (Number(coveredDuration) > Number(lectureDuration)) {
    return res.status(400).json({
      success: false,
      message: "Covered duration cannot be greater than lecture duration",
    });
  }

  // Handle optional video update
  if (req.file) {
    lecture.videoUrl.url = req.file.path;
    lecture.videoUrl.filename = req.file.filename;
  }

  // Update values
  lecture.title = title || lecture.title;
  lecture.lectureDuration = Number(lectureDuration);
  lecture.coveredDuration = Number(coveredDuration);

  // Save topic
  await topic.save();

  return res.status(200).json({
    success: true,
    message: "Lecture updated successfully!",
    lecture,
  });
};

//delete Lecture
module.exports.deleteLecture = async (req, res) => {
  try {
    const { courseId, topicId, lectureId } = req.params;

    // Validate required parameters
    if (!courseId || !topicId || !lectureId) {
      return res.status(400).json({
        success: false,
        message: "courseId, topicId, and lectureId are required",
      });
    }

    // Find the course by ID
    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({
        success: false,
        message: "Course not found",
      });
    }
    // Check user
    const user = await User.findById(req.user.id);
    if (!user) throw new ExpressError(404, "User not found");
    if (!user.isVerified) throw new ExpressError(401, "Email not verified");

    // Authorization
    if (course.createdBy.toString() !== req.user.id.toString()) {
      throw new ExpressError(
        403,
        "You are not authorized to edit this lecture"
      );
    }
    // Find the topic within the course
    const topic = await Topic.findById(topicId);
    if (!topic) throw new ExpressError(404, "Topic not found");

    if (topic.courseId != courseId) {
      throw new ExpressError(404, "Topic not found in this course");
    }

    // Find the lecture within the topic
    const lecture = topic.lectures.id(lectureId);
    if (!lecture) {
      return res.status(404).json({
        success: false,
        message: "Lecture not found in this topic",
      });
    }

    // Delete lecture video from Cloudinary if it exists
    if (
      lecture.videoUrl &&
      lecture.videoUrl.filename &&
      typeof lecture.videoUrl.filename === "string"
    ) {
      try {
        await cloudinary.uploader.destroy(lecture.videoUrl.filename, {
          resource_type: "video",
        });
      } catch (cloudErr) {
        console.error("Cloudinary Delete Error:", cloudErr);
      }
    }

    // Remove the lecture from the topic
    topic.lectures = topic.lectures.filter(
      (l) => l._id.toString() !== lectureId
    );

    // Save the updated course document
    await topic.save();

    return res.status(200).json({
      success: true,
      message: "Lecture deleted successfully",
    });
  } catch (error) {
    console.error("Delete Lecture Error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error while deleting lecture",
    });
  }
};
