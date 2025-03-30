const router = require("express").Router();
require("dotenv").config();
const { User, validate } = require("../models/User");
const multer = require("multer");
const path = require("path");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");
const authenticate = require("../middleware/authenticateToken");

// Middleware for token authentication
const authenticateToken = (req, res, next) => {
	const token = req.headers["authorization"];
	if (!token) return res.status(401).json({ message: "Access Denied" });
  
	jwt.verify(token.split(" ")[1], process.env.JWTPRIVATEKEY, (err, user) => {
	  if (err) return res.status(403).json({ message: "Invalid Token" });
	  req.user = user;
	  next();
	});
  };

  const validateUserId = (req, res, next) => {
	if (!mongoose.Types.ObjectId.isValid(req.params.userId)) {
	  return res.status(400).json({ message: "Invalid user ID format" });
	}
	next();
  };

router.post("/", async (req, res) => {
	try {
		const { error } = validate(req.body);
		if (error)
			return res.status(400).send({ message: error.details[0].message });

			const existingUser = await User.findOne({ 
				$or: [
					{ email: req.body.email },
					{ UserName: req.body.UserName }
				]
			});
			if (existingUser) {
				const conflictField  = existingUser.email === req.body.email ? "Email" : "Username";
				return res.status(409).send({ message: `${conflictField} already exists!` });
			}

		const salt = await bcrypt.genSalt(Number(process.env.SALT));
		const hashPassword = await bcrypt.hash(req.body.password, salt);

		const newUser = await new User({ 
            ...req.body, 
            password: hashPassword,
            isAdmin: req.body.email === process.env.ADMIN_EMAIL
        }).save();

		res.status(201).send({ 
		message: "User created successfully" ,
		user: {
			id: newUser._id,
			email: newUser.email,
			isAdmin: newUser.isAdmin,
			surveyCompleted: newUser.surveyCompleted
		}
	});
	} catch (error) {
		console.error(error); 
		if (error.code === 11000) {
            const key = Object.keys(error.keyPattern)[0];
            const field = key === 'email' ? 'Email' : 'Username';
            return res.status(409).send({ message: `${field} already exists!` });
		}

        console.error("Registration Error:", error);
        res.status(500).send({ 
            message: "Internal Server Error",
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
	}
});

// Toggle favorite book
router.post("/favorites", async (req, res) => {
    const { userId, bookId } = req.body;

    try {
        const user = await User.findById(userId);
        if (!user) return res.status(404).json({ message: "User not found" });

        const index = user.favorites.indexOf(bookId);
        if (index > -1) {
            // Remove from favorites
            user.favorites.splice(index, 1);
        } else {
            // Add to favorites
            user.favorites.push(bookId);
        }

        await user.save();
        res.json({ isFavorite: user.favorites.includes(bookId) });
    } catch (error) {
        res.status(500).json({ message: "Server error" });
    }
});

// Toggle save to favorites
router.post('/toggle-favorite', authenticateToken, async (req, res) => {
	try {
	  const { bookId } = req.body;
	  const userId = req.user._id;
  
	  const user = await User.findById(userId);
	  if (!user) return res.status(404).json({ message: "User not found" });

	  // Initialize favorites array if undefined
	  if (!user.favorites) user.favorites = [];

	  const index = user.favorites.indexOf(bookId);
	  if (index === -1) {
		user.favorites.push(bookId);
	  } else {
		user.favorites.splice(index, 1);
	  }
  
	  await user.save();
	  res.json({ inFavorites: index === -1 });
	} catch (error) {
	  console.error("Toggle favorite error:", error);
	  res.status(500).json({ message: "Server error" });
	}
  });
  
  // Get user favorites
  router.get('/favorites', authenticateToken, async (req, res) => {
	try {
	  const user = await User.findById(req.user._id).populate('favorites').select('favorites');
	  res.json(user?.favorites || []);
	} catch (error) {
	  res.status(500).json({ message: "Server error" });
	}
  });  

router.get("/:userId",authenticateToken, async (req, res) => {
	try {
	  const { userId } = req.params;
  
	  if (!mongoose.Types.ObjectId.isValid(userId)) {
		return res.status(400).json({ message: "Invalid User ID" });
	  }
  
	  const user = await User.findById(userId).populate("joinedClubs");
	  if (!user) return res.status(404).json({ message: "User not found" });
	  
	  res.json(user);
	} catch (error) {
	  res.status(500).json({ message: "Internal Server Error", error });
	}
  });  

  // Set up storage for uploaded images
const storage = multer.diskStorage({
	destination: function (req, file, cb) {
	  cb(null, "uploads/avatars/"); // Store files in uploads/avatars
	},
	filename: function (req, file, cb) {
	  cb(null, req.user._id + path.extname(file.originalname)); // Save as userID.extension
	},
  });
  
  const upload = multer({
	storage: storage,
	limits: { fileSize: 5 * 1024 * 1024 }, // Limit file size to 5MB
	fileFilter: (req, file, cb) => {
	  const fileTypes = /jpeg|jpg|png/;
	  const extName = fileTypes.test(path.extname(file.originalname).toLowerCase());
	  const mimeType = fileTypes.test(file.mimetype);
	  if (extName && mimeType) {
		return cb(null, true);
	  } else {
		cb(new Error("Only .jpeg, .jpg, or .png formats allowed!"));
	  }
	},
  });

  // Route to upload profile picture
  router.post("/profile/avatar", authenticateToken, upload.single("avatar"), async (req, res) => {
	try {
	  const user = await User.findById(req.user._id);
	  if (!user) return res.status(404).json({ message: "User not found" });
  
	  user.avatar = `/uploads/avatars/${req.file.filename}`; // Save file path in DB
	  await user.save();
  
	  res.json({ message: "Profile picture uploaded successfully", avatar: user.avatar });
	} catch (error) {
	  console.error("Avatar Upload Error:", error);
	  res.status(500).json({ message: "Internal Server Error" });
	}
  });

router.patch('/:userId', authenticateToken, validateUserId, async (req, res) => {
	try {
		const user = await User.findById(req.params.userId);
    if (!user) return res.status(404).json({ message: "User not found" });
	  
	  const updatedUser = await User.findByIdAndUpdate(
		req.params.userId,
		{ 
		  surveyCompleted: true,
		  preferences: req.body.preferences 
		},
		{ new: true }
	  );
  
	  if (!updatedUser) {
		return res.status(404).json({ message: "User not found" });
	  }
  
	  res.json(updatedUser);
	} catch (error) {
	  console.error('User Update Error:', error);
	  res.status(500).json({ message: "Server error during update" });
	}
  });

module.exports = router;