require("dotenv").config();

const app = require("./app");
const connectDB = require("./config/db");

const PORT = process.env.PORT || 8000;
const startServer = async () => {
  // module.exports = app
  
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
  await connectDB();
};

startServer();