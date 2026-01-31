

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
app.use(cors())
  // origin: [
  //   'http://localhost:3000',
  //   'http://localhost:8080',
  //   'http://localhost:8081',
  //   'http://10.0.2.2:3000',
  //   'http://10.0.2.2:8080',
  //   'http://127.0.0.1:3000',
  //   'http://127.0.0.1:8080',
  //   // Allow Android device on local network (example IP used by frontend constants)
  //   'http://10.180.181.148:8080'
  // ],
//   methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
//   credentials: false,
//   allowedHeaders: ['Content-Type', 'Authorization']
// }));

// Request logging middleware
// app.use((req, res, next) => {
//   console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`, req.body);
//   next();
// });

 app.use("/auth", authRoutes);

app.get("/", (req, res) => {
  res.json({ message: "API Running", status: "success" });
});

// app.post("/", (req, res) => {
//   res.json({ message: "API Running", status: "success" });
// });

const PORT = process.env.PORT || 3000;
const server = http.createServer(app);


//socket events
initializeSocket(server);

connectDB().then(() => {
   console.log("Database connected successfully");
  server.listen(PORT as number, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Also accessible at http://localhost:${PORT}`);
  });
})
.catch((error)=>{
   console.log("Failed to start server due to database connection error",error);
   error
 });

cleanup((exitCode, signal) => {
    console.log('Closing server...');
    server.close(() => {
        console.log('Server closed.');
        mongoose.connection.close();
    });
});
