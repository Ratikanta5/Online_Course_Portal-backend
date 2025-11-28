const mongoose = require('mongoose');
const Schema = mongoose.Schema;


const topicSchema = new Schema({
    title:{
        type: String,
        required: true,
    },
    courseId:{
        type: mongoose.Schema.Types.ObjectId,
        ref: "Course",
        required: true,
    },
    lectures:[
        {
            title: { type: String, required: true },
            videoUrl: {
                url: String,
                filename: String,
            },
            status: {
                type: String,
                enum: ['pending', 'approved', 'rejected'],
                default: 'pending',
            },
            coveredDuration:{
                type: Number,
                required: true,
            },
            lectureDuration:{
                type: Number,
                required: true,
            }
        }
    ],
    topicStatus:{
        type: String,
        enum: ['pending', 'approved', 'rejected'],
        default: 'pending',
    }
})


const Topic = mongoose.model('Topic',topicSchema);
module.exports = Topic;