const express = require('express');
const router = express.Router();
const authController = require('../Controllers/authControllers');
const wrapAsync = require('../utills/wrapAsync');
const verifyToken = require('../middlewares/authMiddleware');
const authorizeRole = require('../middlewares/roleMiddleware');

const multer  = require('multer');
const {storage} = require("../config/cloudinary/cloudConfig"); 
const upload = multer({ storage });

router.post("/register",upload.single("profileImage"), wrapAsync(authController.register));
router.post("/verify/:token", wrapAsync(authController.verifyEmail));
router.post("/login",wrapAsync(authController.login));
router.get("/protected", verifyToken , authorizeRole("user"),   wrapAsync(authController.protected));


module.exports = router;