class ExpressError extends Error{
    constructor(statusCode,message){
        super();
        this.statusCode = statusCode;
        this.message = message;
    }
}

module.exports = ExpressError;


//it is use to send custom error msg and status code.