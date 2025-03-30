require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const path = require("path");
const cors = require("cors");
const http = require("http");
const { Server } = require("socket.io");
const connection = require("./db"); // Database connection file
const userRoutes = require("./routes/users");
const authRoutes = require("./routes/auth");
const clubsRoutes = require("./routes/clubs");
const profileRoutes = require("./routes/profile");
const messageRoutes = require("./routes/messages");
const booksRoutes = require("./routes/books");
const onlineUsers =new Map();
const adminRoutes = require('./routes/admin');
const aiRoutes = require('./routes/ai');
const bookRequestRoutes = require("./routes/bookRequest");

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"],
    credentials: true, // Required for cookies/credentials
    pingInterval: 10000, // Send a ping every 10s
  pingTimeout: 20000,  // Disconnect if no pong within 20s
  },
});

// ✅ Connect to MongoDB
connection(); 

// Serve static files from the uploads folder
app.use('/uploads', express.static(path.join(__dirname, "uploads"))); // Serve uploaded files

// ✅ Middleware
app.use(express.json());
app.use(cors({origin: 'http://localhost:3000', 
credentials: true, 
}));

// Mock database for messages
let messages = [];

app.set("io", io);

// ✅ Default Route
app.get("/", (req, res) => {
  res.send("Server is running!");
});

// ✅ API Routes
app.use("/api/users", userRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/clubs", clubsRoutes);
app.use("/api/profile", profileRoutes);
app.use("/api/messages", messageRoutes); 
app.use("/api/books", booksRoutes);
app.use('/api/admin', adminRoutes);
app.use("/api/book-requests", bookRequestRoutes);
app.use("/api/ai", aiRoutes);

app.use((err, req, res, next) => {
  console.error('Global Error:', err.stack);
  res.status(500).json({
    message: 'Internal Server Error',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// REST API Endpoint for Messages
app.post('/api/messages', (req, res) => {
  console.log("📩 Incoming POST request to /api/messages");
    console.log("Request Body:", req.body); // Log full request body
  const { clubId, user, username, message } = req.body;

  // Validation
  if (!clubId || !user || !username || !message.trim()) {
    console.error("❌ Validation failed - Missing fields");
    return res.status(400).json({ error: 'All fields are required' });
  }

  const newMessage = { clubId, user, username, message, timestamp: new Date() };
  messages.push(newMessage);

  // Broadcast via Socket.IO
  io.to(clubId).emit('newMessage', newMessage);
  res.status(201).json(newMessage);
});

// Socket.io Logic
io.on("connection", (socket) => {
  console.log(`"🟢 A user connected:",${socket.id}`);

  socket.on("joinRoom", ({clubId, userId}) => {
      socket.join(clubId);
      socket.userId = userId; // Store userId in the socket object
      console.log(`👥 User ${userId} joined room: ${clubId}`);
      if (!onlineUsers.has(clubId)) {
        onlineUsers.set(clubId, new Set());
      }
      onlineUsers.get(clubId).add(userId);
      
      io.to(clubId).emit('onlineUsers', Array.from(onlineUsers.get(clubId)));
      if (!userId || !clubId) {
        console.warn("⚠️ Missing userId or clubId in joinClub event");
        return;
      }
  
      if (!onlineUsers[clubId]) {
        onlineUsers[clubId] = new Set();
      }
  
      onlineUsers[clubId].add(userId);
      io.to(clubId).emit("updateOnlineUsers", Array.from(onlineUsers[clubId]));
  });

  socket.on("newMessage", (data) => {
      console.log("💬 Broadcasting message:", data);
      io.to(data.clubId).emit("newMessage", data);
  });

  socket.on("disconnect", () => {
      console.log(`"🔴 User disconnected:", ${socket.id}`);
      for (const [clubId, users] of onlineUsers) {
        if (users.has(socket.userId)) {
          users.delete(socket.userId);
          io.to(clubId).emit('onlineUsers', Array.from(users));
        }}
  });
});

// ✅ Start Server
const PORT = process.env.PORT || 8080;
server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
