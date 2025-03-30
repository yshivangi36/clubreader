const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const authenticateToken = require("../middleware/authenticateToken");
const {User} = require("../models/User");
const Book = require("../models/Book");

// Fetch user profile
router.get("/profile", authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .populate("bookHistory")
      .populate("favoriteBooks");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    res.json({
      userId: user._id,
      name: user.name,
      email: user.email,
      bio: user.bio,
      avatar: user.avatar,
      bookHistory: user.bookHistory,
      favoriteBooks: user.favoriteBooks,
      comments: user.comments,
      ratings: user.ratings,
    });
  } catch (error) {
    console.error("Profile Fetch Error:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

// Update user profile
router.put("/profile", authenticateToken, async (req, res) => {
  try {
    const { name, email, bio, avatar } = req.body;
    const user = await User.findByIdAndUpdate(
      req.user._id,
      { name, email, bio, avatar },
      { new: true }
    );
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    res.json({
      message: "Profile updated successfully",
      user: {
        name: user.name,
        email: user.email,
        bio: user.bio,
        avatar: user.avatar,
      },
    });
  } catch (error) {
    console.error("Profile Update Error:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

// Fetch book history
router.get("/book-history", authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).populate("bookHistory");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    res.json(user.bookHistory);
  } catch (error) {
    console.error("Book History Fetch Error:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

// Add book to history
router.post("/book-history", authenticateToken, async (req, res) => {
  try {
    const { bookId } = req.body;
    const user = await User.findById(req.user._id);
    if (!user.bookHistory.includes(bookId)) {
      user.bookHistory.push(bookId);
      await user.save();
    }
    res.status(200).json({ message: "Book added to history" });
  } catch (error) {
    console.error("Book History Update Error:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

// Fetch favorite books
router.get("/favorite", authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).populate("favoriteBooks");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    res.json(user.favoriteBooks);
  } catch (error) {
    console.error("Favorite Books Fetch Error:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

// Toggle favorite book
router.post("/favorite", authenticateToken, async (req, res) => {
  try {
    const { bookId } = req.body;
    const user = await User.findById(req.user._id);
    const index = user.favoriteBooks.indexOf(bookId);
    if (index > -1) {
      user.favoriteBooks.splice(index, 1);
    } else {
      user.favoriteBooks.push(bookId);
    }
    await user.save();
    res.json({ isFavorite: user.favoriteBooks.includes(bookId) });
  } catch (error) {
    console.error("Favorite Toggle Error:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

// Save user comment and rating
router.post("/comment", authenticateToken, async (req, res) => {
  try {
    const { bookTitle, comment, rating } = req.body;
    const user = await User.findById(req.user._id);
    const existingComment = user.comments.find((c) => c.bookTitle === bookTitle);
    if (existingComment) {
      existingComment.text = comment;
      existingComment.rating = rating;
    } else {
      user.comments.push({ bookTitle, text: comment, rating });
    }
    await user.save();
    res.json({ message: "Comment saved successfully" });
  } catch (error) {
    console.error("Comment Save Error:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

module.exports = router;