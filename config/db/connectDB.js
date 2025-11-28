if(process.env.NODE_ENV != "production"){
    require('dotenv').config()
}
const mongoose = require('mongoose');

const dbUrl = process.env.DB_URL;

connectDB()
.then(()=>{
    console.log("db connected successfully");
})
.catch((err)=>{
    console.log(err);
})


async function connectDB(){
    await mongoose.connect(dbUrl);
}


module.exports = connectDB;