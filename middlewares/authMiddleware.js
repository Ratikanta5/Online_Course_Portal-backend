const jwt = require('jsonwebtoken');
const ExpressError = require('../utills/ExpressError');

const verifyToken = async(req,res,next) =>{
    let token;

    let authHeader = req.headers.Authorization || req.headers.authorization;

    if(authHeader && authHeader.startsWith("Bearer")){
        token = authHeader.split(" ")[1];
    

        if(!token){
            return next(new ExpressError(401, "No token provided, authorization denied"));
        }

        try{
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            req.user = decoded;
            next();
        }
        catch (err){
            return next(new ExpressError(401, "Token is not valid"));
        }

    }
    else {
        return next(new ExpressError(401, "No token, authorization denied"));
    }
}

module.exports = verifyToken;