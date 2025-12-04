const mongoose = require('mongoose');
const Schema = mongoose.Schema;


const userSchema = new Schema({
    name:{
        type:String,
        required: true,
    },
    email:{
        type: String,
        required: true,
    },
    password:{
        type: String,
        required: true
    },
    isVerified:{
        type: Boolean,
        default: false,
    },
    verificationToken: { 
        type: String 
    },
  // TTL field only works if the user is not verified
    verificationTokenExpiry: {
        type: Date,
        default: () => Date.now() + 24 * 60 * 60 * 1000, // 24 hours
        index: { expires: 0 }, // MongoDB TTL
    },
    bio:{
        type: String,
    },
    profileImage:{
        url: String,
        filename: String,
    },
    role:{
        type: String,
        required: true,
        enum: ["student", "lecture", "admin"]
    },
},{
    timestamps: true,
})


const User = mongoose.model("User",userSchema);

module.exports = User;