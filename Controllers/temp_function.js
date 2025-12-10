
// Get all courses for current lecturer (with all statuses: pending, approved, rejected)
module.exports.getLecturerCourses = async (req, res) => {
  try {
    const lecturerId = req.user.id;
    console.log("Lecturer ID from token:", lecturerId);

    if (!lecturerId) {
      throw new ExpressError(401, "User not authenticated");
    }

    const lecturer = await User.findById(lecturerId);
    console.log("Lecturer found:", lecturer?._id);
    
    if (!lecturer) {
      throw new ExpressError(404, "Lecturer not found");
    }

    if (lecturer.role !== "lecture") {
      throw new ExpressError(403, "Only lecturers can access this route");
    }

    // Fetch all courses created by this lecturer
    console.log("Searching for courses with createdBy:", lecturerId);
    const courses = await Course.find({ createdBy: lecturerId })
      .populate("createdBy", "name email")
      .sort({ createdAt: -1 });

    console.log("Courses found:", courses.length);

    return res.status(200).json({
      success: true,
      message: "Lecturer courses fetched successfully",
      courses: courses,
    });
  } catch (error) {
    console.error("ERROR in getLecturerCourses:", error);
    throw new ExpressError(500, error.message || "Failed to fetch courses");
  }
};
