const router = require("express").Router();
const { User } = require("../models/User");
const bcrypt = require("bcrypt");
const Joi = require("joi");
const jwt = require("jsonwebtoken");
const authenticateToken = require("../middleware/authenticateToken");
const multer = require("multer");
const path = require("path");
require("dotenv").config();

router.post("/", async (req, res) => {
	try {
		const { error } = validate(req.body);
		if (error)
			return res.status(400).send({ message: error.details[0].message });

		const user = await User.findOne({ email: req.body.email });
		if (!user) {
			return res.status(404).json({ message: 'User not found' });
		  }

		const validPassword = await bcrypt.compare(req.body.password,user.password);
		if (!validPassword)
			return res.status(401).send({ message: "Invalid Email or Password" });
			if (!user.generateAuthToken) {
				return res.status(500).json({ message: "Token generation function missing in User model" });
			}
			
		const token = user.generateAuthToken();
		res.status(200).send({ data: token, message: "logged in successfully" });
	} catch (error) {
		res.status(500).send({ message: "Internal Server Error" });
	}
});

const validate = (data) => {
	const schema = Joi.object({
		email: Joi.string().email().required().label("Email"),
		password: Joi.string().required().label("Password"),
	});
	return schema.validate(data);
};

router.post("/login", async (req, res) => {
	const { email, password } = req.body;
  
	const user = await User.findOne({ email });
	if (!user) return res.status(400).json({ message: "User not found" });
  
	const isMatch = await bcrypt.compare(password, user.password);
	if (!isMatch) return res.status(400).json({ message: "Invalid credentials" });
  
	const token = jwt.sign({ _id: user._id, isAdmin: user.isAdmin }, process.env.JWTPRIVATEKEY, { expiresIn: "7d" });
  
	res.json({ 
		message:"Login Successful",
		token, 
		user: { 
			id: user._id, 
			name: user.UserName, 
			email: user.email, 
			isAdmin: user.isAdmin,
			favorites: user.favorites,
			surveyCompleted: user.surveyCompleted
		 } });
  });  

// Get user profile
router.get("/profile", authenticateToken, async (req, res) => {
	try {
	  console.log("Fetching profile for user:", req.user); 
	  const user = await User.findById(req.user._id)
	  .populate('favorites')
	  .populate('bookHistory')
	  .select('-password'); 
  
	  if (!user) {
		return res.status(404).json({ message: "User not found" });
	  }
  
	  res.json({
		userId: user._id,
		name: user.UserName,
		email: user.email,
		bio: user.bio,
		avatar: user.avatar, 
		favorites: user.favorites,
		bookHistory: user.bookHistory || [],
		isAdmin: user.isAdmin
	  });
	} catch (error) {
	  console.error("Profile Fetch Error:", error);
	  res.status(500).json({ message: "Internal Server Error", error: error.message });
	}
  });
  
  // Set up storage engine for Multer
  const storage = multer.diskStorage({
	destination: (req, file, cb) => {
	  cb(null, "uploads/"); // Save files to uploads/ directory
	},
	filename: (req, file, cb) => {
	  cb(null, `${Date.now()}-${file.originalname}`); // Unique filename
	},
  });
  
  const upload = multer({ storage });
  
  // Profile Update with Avatar Upload
  router.put("/profile", authenticateToken, upload.single("avatar"), async (req, res) => {
	try {
	  const { name, email, bio } = req.body;
	  const userId = req.user._id;
  
	  const user = await User.findById(userId);
	  if (!user) return res.status(404).json({ message: "User not found" });
  
	  user.UserName = name || user.UserName;
	  user.email = email || user.email;
	  user.bio = bio || user.bio;
  
	  if (req.file) {
		user.avatar = `/uploads/${req.file.filename}`; // Store image path
	  }
  
	  await user.save();
	  res.json({ message: "Profile updated successfully", user });
	} catch (error) {
	  console.error("Error updating profile:", error);
	  res.status(500).json({ message: "Server error" });
	}
  });
  
  // Serve static files from uploads folder
  const express = require("express");
  router.use("/uploads", express.static(path.join(__dirname, "../../uploads")));

// POST route for book history (unchanged)
router.post("/book-history", authenticateToken, async (req, res) => {
	try {
	  const userId = req.user._id; // Get the logged-in user ID
	  const { bookId } = req.body; // Book ID passed from the client
  
	  // Find the user and add the book to their history
	  const user = await User.findById(userId);
	  if (!user.bookHistory.includes(bookId)) {
		user.bookHistory.push(bookId);
		await user.save();
	  }
  
	  res.status(200).send("Book added to history");
	} catch (error) {
	  console.error("Error updating book history:", error);
	  res.status(500).send("Error updating book history");
	}
  });  

  router.get("/me", authenticateToken, async (req, res) => {
    try {
        const user = await User.findById(req.user._id).select("-password"); // Exclude password
        if (!user) return res.status(404).json({ error: "User not found" });
        res.json({
			_id: user._id,
			username: user.UserName,  // ✅ Explicitly use `UserName`
			email: user.email,
			avatar: user.avatar,
		  });
    } catch (error) {
        console.error("Server error:", error);
        res.status(500).json({ error: "Server error" });
    }
});
  
module.exports = router;