const express = require("express");
const multer = require("multer");
const path = require("path");
const Book = require("../models/Book");

const router = express.Router();

const storage = multer.diskStorage({
  destination: "uploads/",
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  },
});

const upload = multer({ storage });

router.post("/books", upload.fields([{ name: "coverImage" }, { name: "bookPdf" }]), async (req, res) => {
  try {
    const { title, author, description, genres } = req.body;
    const coverImage = req.files["coverImage"] ? req.files["coverImage"][0].path : "";
    const bookPdf = req.files["bookPdf"] ? req.files["bookPdf"][0].path : "";

    const newBook = new Book({ title, author, description, genres, coverImage, bookPdf });
    await newBook.save();

    res.status(201).json({ message: "Book uploaded successfully!" });
  } catch (error) {
    res.status(500).json({ error: "Failed to upload book" });
  }
});

module.exports = router;
