const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
require('dotenv').config();

// Cloudinary Configuration (same as before)
cloudinary.config({
  cloud_name: process.env.CLOUD_NAME,
  api_key: process.env.CLOUD_API_KEY,
  api_secret: process.env.CLOUD_API_SECRET,
});

// Storage Configuration for Videos
const videoStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'courseWave_Videos', // folder name for videos in Cloudinary
    resource_type: 'video',      // VERY IMPORTANT — tells Cloudinary it's a video upload
    allowedFormats: ['mp4', 'mov', 'avi', 'mkv'],
  },
});

module.exports = {
  cloudinary,
  videoStorage,
};
