const mongoose = require("mongoose");
const Schema = mongoose.Schema;


const courseSchema = new Schema({
  title: {
    type: String,
    required: true,
  },
  description: {
    type: String,
    required: true,
  },
  courseImage: {
    url: String,
    filename: String,
  },
  reviews:[{
        type: Schema.Types.ObjectId,
        ref: "Review",
  }],
  price: {
    type: Number,
    required: true,
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  Topics: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Topics' }],
  courseStatus: {
    type: String,
    enum: ["pending", "approved", "rejected"],
    default: "pending",
  },
},{timestamps: true});

const Course = mongoose.model("Course", courseSchema);

module.exports = Course;
