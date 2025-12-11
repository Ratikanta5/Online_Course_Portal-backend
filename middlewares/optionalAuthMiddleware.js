const jwt = require("jsonwebtoken");

const optionalVerifyToken = (req, res, next) => {
  let token;
  let authHeader = req.headers.authorization || req.headers.Authorization;      

  if (authHeader && authHeader.startsWith("Bearer")) {
    token = authHeader.split(" ")[1];

    if (token) {
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded;
      } catch (err) {
        console.log("Invalid token, continuing without auth");
      }
    }
  }
  next();
};

module.exports = optionalVerifyToken;
