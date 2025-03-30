require('dotenv').config();
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");
const User = require("../models/User");

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers["authorization"];

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Invalid authorization format. Use: Bearer <token>" });
  }

  const token = authHeader.split(" ")[1];

	if (!token) {
		console.error("❌ No token provided");
		return res.status(401).json({ message: "Access Denied" });
	}

  jwt.verify(token, process.env.JWTPRIVATEKEY, (err, decoded) => {
    if (err) {
      return res.status(403).json({ 
        error: "Token verification failed",
        details: err.message 
      });
    }

    console.log("Decoded token payload:", decoded);
    
    req.user = {
      _id: decoded._id,
      isAdmin: decoded.isAdmin || false // Default to false if not present
    };

    console.log("✅ User authenticated:", req.user);

    next();
  });
};

module.exports = authenticateToken;

