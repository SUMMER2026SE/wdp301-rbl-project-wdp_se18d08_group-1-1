const path = require("path");
const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const dotenv = require("dotenv");
const connectDB = require("./config/db");
const errorHandler = require("./middlewares/errorHandler");

// Load env variables — explicit path so it works regardless of cwd
dotenv.config({ path: path.resolve(__dirname, "../.env") });

// Import routes
const authRoutes = require("./routes/authRoutes");
const profileRoutes = require("./routes/profileRoutes");

// Initialize express app
const app = express();

// CORS configuration
app.use(
  cors({
    origin: process.env.CLIENT_URL || "http://localhost:5173",
    credentials: true,
  }),
);

// Body parser
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

// Cookie parser
app.use(cookieParser());

// Health check route
app.get("/api/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "VALO PARKING API is running",
    timestamp: new Date().toISOString(),
  });
});

// Mount routes
app.use("/api/auth", authRoutes);
app.use("/api/profile", profileRoutes);
app.use("/api/wallet", require("./routes/walletRoutes"));
app.use("/api/ai", require("./routes/aiRoutes"));
app.use("/api/vehicles", require("./routes/vehicleRoutes"));
app.use("/api/admin", require("./routes/adminRoutes"));
app.use("/api/sessions", require("./routes/sessionRoutes"));

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.originalUrl} not found`,
  });
});

// Global error handler
app.use(errorHandler);

// Start server
const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    // Connect to MongoDB
    await connectDB();

    app.listen(PORT, () => {
      console.log(`🚀 VALO PARKING API Server running on port ${PORT}`);
      console.log(`📍 Environment: ${process.env.NODE_ENV || "development"}`);
      console.log(`🔗 Health check: http://localhost:${PORT}/api/health`);
    });
  } catch (error) {
    console.error("❌ Failed to start server:", error.message);
    process.exit(1);
  }
};

startServer();
