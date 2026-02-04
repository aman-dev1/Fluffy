import express from "express";
import http from "http";
import cors from "cors";
import dotenv from "dotenv";
import connectDB from "./config/db";
import authRoutes from "./routes/auth.routes";
import mongoose from "mongoose";
import cleanup from "node-cleanup";
import { initializeSocket } from "./socket/socket";

dotenv.config();

const app = express();

app.use(express.json());
app.use(cors());

// ✅ ROUTES
app.get("/", (req, res) => {
  res.status(200).json({ message: "API Running 🚀", status: "success" });
});

// 🔥🔥 THIS WAS MISSING 🔥🔥
app.use("/auth", authRoutes);


// app.use(express.json());
// app.use(cors());

// // routes

// app.get("/", (req, res) => {
//   res.status(200).json({ message: "API Running 🚀", status: "success" });
// });

const PORT = Number(process.env.PORT) || 3000;

// ✅ IMPORTANT: create & listen server FIRST
const server = http.createServer(app);



// ✅ Socket init AFTER server starts
initializeSocket(server);

// ✅ DB connection SEPARATE (non-blocking)
connectDB()
  .then(() => {
    console.log("Database connected successfully");
    server.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on port ${PORT}`);
  
});
  })
  .catch((error) => {
    console.error("Database connection failed:", error.message);
  });

// graceful shutdown
cleanup(() => {
  console.log("Closing server...");
  server.close(() => {
    mongoose.connection.close();
    console.log("Server & DB closed");
  });
});
