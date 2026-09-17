const mongoose = require("mongoose");

const connectDB = async () => {
  if (mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }

  try {
    await mongoose.connect(process.env.MONGO_URI);

    console.log("MongoDB connected");

    return mongoose.connection;
  } catch (error) {
    console.error(
      `MongoDB connection error: ${error.message}`
    );

    throw error;
  }
};

module.exports = connectDB;