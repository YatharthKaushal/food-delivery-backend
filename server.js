import dotenv from "dotenv";
dotenv.config();

import express from "express";
import cors from "cors";

import connectDB from "./src/config/database.config.js";
import routes from "./src/routes.js";

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(
  cors({
    origin: "*",
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// API Routes
app.use("/api", routes);

// Health check route
app.get("/", (req, res) => {
  res.status(200).json({ status: "OK", message: "Server is running" });
});

// Validate required environment variables
const validateEnvironment = () => {
  const requiredEnvVars = ['JWT_SECRET', 'MONGODB_URL', 'FIREBASE_PROJECT_ID'];
  const missingEnvVars = requiredEnvVars.filter(varName => !process.env[varName]);

  if (missingEnvVars.length > 0) {
    console.error('❌ Missing required environment variables:', missingEnvVars.join(', '));
    console.error('Please check your .env file and ensure all required variables are set.');
    process.exit(1);
  }

  // Validate JWT_SECRET strength
  if (process.env.JWT_SECRET.length < 32) {
    console.error('❌ JWT_SECRET must be at least 32 characters long for security.');
    console.error('Current length:', process.env.JWT_SECRET.length);
    console.error('Please update your JWT_SECRET in the .env file.');
    process.exit(1);
  }

  console.log('✅ Environment variables validated successfully');
};

// Connect to database and start server
const startServer = async () => {
  try {
    // Validate environment before starting
    validateEnvironment();

    await connectDB();
    app.listen(PORT, () => {
      console.log(`> Server is running on port ${PORT}`);
    });
  } catch (error) {
    console.error(">Failed to start server:", error);
    process.exit(1);
  }
};

startServer();
