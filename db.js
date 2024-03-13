const mongoose = require("mongoose");

const connectDatabase = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("Successfully connected with database");
  } catch (error) {
    console.log("Database connection failed " + error.message);
  }
};

module.exports = connectDatabase;
