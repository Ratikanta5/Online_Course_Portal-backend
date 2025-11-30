const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const User = require("../models/User");
const ExpressError = require("../utills/ExpressError");
const sendEmail = require("../config/email/email");
const verifyToken = require("../middlewares/authMiddleware");

module.exports.register = async (req, res) => {
  const { name, email, password, bio, role } = req.body;

  const hashedPassword = await bcrypt.hash(password, 10);

  if (role === "admin") {
    throw new ExpressError(403, "you have no access to admin");
  }

  const existingUser = await User.findOne({ email });
  if (existingUser) throw new ExpressError(400, "Email already registered");


  const newUser = new User({
    name,
    email,
    password: hashedPassword,
    bio,
    role: role || "student",
  });

  const {id} = newUser

  // console.log(newUser.id);
  

  if(req.file){
    newUser.profileImage = {
      url : req.file.path,
      filename : req.file.filename
    }
  }


  // newUser.verificationToken = verificationToken;
  
  await newUser.save();

  const verifyLink = `${process.env.BACKEND_URL}/verify/${id}`;

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
  const { val } = req.params;
  if (!val) throw new ExpressError(400, "Verification token missing");


  const user = await User.findById({_id:val});
  
  if (!user) throw new ExpressError(404, "User not found");

  //check if already verfified
  if (user.isVerified) {
    return res.status(200).json({
      success: true,
      message: "Email already verified. You can log in now.",
    });
  }

  //Mark as verified
  user.isVerified = true;
  await user.save();

  return res.status(200).json({
    success: true,
    message: "Email verified successfully!",
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
    authToken,
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role
    }

  });
};


module.exports.protected = async(req , res) =>{
   res.status(200).json({
    success: true,
    message: "Access granted — you are authenticated!",
    user: req.user, // decoded token data (id, role, etc.)
  });
}