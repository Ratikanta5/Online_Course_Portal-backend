const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const crypto = require("crypto");
const User = require("../models/User");
const ExpressError = require("../utills/ExpressError");
const sendEmail = require("../config/email/email");
const verifyToken = require("../middlewares/authMiddleware");

module.exports.register = async (req, res) => {
  const { name, email, password, bio, role } = req.body;


  if (role === "admin") {
    throw new ExpressError(403, "you have no access to admin");
  }

  const existingUser = await User.findOne({ email });
  if (existingUser) throw new ExpressError(400, "Email already registered");

  const hashedPassword = await bcrypt.hash(password, 10);
  const verificationToken = crypto.randomBytes(32).toString("hex"); // unique token


  const newUser = new User({
    name,
    email,
    password: hashedPassword,
    bio,
    role: role || "student",
    verificationToken,
  });
  

  if(req.file){
    newUser.profileImage = {
      url : req.file.path,
      filename : req.file.filename
    }
  }


  // newUser.verificationToken = verificationToken;
  
  await newUser.save();

  const verifyLink = `${process.env.FRONTEND_URL}/verify/${verificationToken}`;

  // prepare HTML message
  const message = `
      <h2>Welcome, ${name}!</h2>
      <p>Click below to verify your email:</p>
      <a href="${verifyLink}" target="_blank">Verify My Account</a>
      <p>This link expires in 24 hours.</p>
    `;

  //Send verification email
  await sendEmail(email, "Verify your courseWave account", message);

  return res.status(201).json({
    success: true,
    message:
      "Verification email sent! Please check your inbox to verify your account.",
  });
};

module.exports.verifyEmail = async (req, res) => {
  const { token } = req.params;
  if (!token) throw new ExpressError(400, "Verification token missing");

  const user = await User.findOne({ verificationToken: token });

  if (!user) throw new ExpressError(404, "Invalid or expired verification token");

  if (user.isVerified) {
    return res.status(200).json({
      success: true,
      message: "Email already verified. You can log in now.",
    });
  }

  // Mark as verified & remove token
  user.isVerified = true;
  // user.verificationToken = undefined;
  user.verificationTokenExpiry = undefined; // prevent TTL deletion
  await user.save();

  return res.status(200).json({
    success: true,
    message: "Email verified successfully! You can now log in.",
    verifiedUser: {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      isVerified: user.isVerified,
    },
  });
};


module.exports.login = async (req, res) => {
  let { email, password } = req.body;

  const user = await User.findOne({ email });

  if (!user) {
    throw new ExpressError(404, "User not found");
  }

  if (!user.isVerified) {
    throw new ExpressError(401, "Email not verified. Please check your inbox.");
  }

  const isMatch = await bcrypt.compare(password , user.password);

  if(!isMatch){
    throw new ExpressError(401, "Invalid credentials")
  }

  //now we create a token
  //this token used for login & accessing protected APIs
  const authToken = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "1d" } 
    );

  // Send token + user info
  res.status(200).json({
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role
    }

  });
};

// GET /api/auth/me
module.exports.me = async (req, res) => {
  try {
    const { id, role } = req.query;

    if (!id || !role) {
      return res.status(400).json({
        success: false,
        message: "Missing id or role",
      });
    }

    // Find user but hide private fields
    const user = await User.findById(id).select(
      "-password -verificationToken -verificationTokenExpiry"
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Extra safety check: role match
    if (user.role !== role) {
      return res.status(400).json({
        success: false,
        message: "Role mismatch",
      });
    }

    return res.json({
      success: true,
      user,
    });

  } catch (err) {
    console.error("Error in /me:", err);
    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};



module.exports.protected = async(req , res) =>{
   res.status(200).json({
    success: true,
    message: "Access granted — you are authenticated!",
    user: req.user, // decoded token data (id, role, etc.)
  });
}