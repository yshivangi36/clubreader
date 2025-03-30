const mongoose = require("mongoose");
const Grid = require("gridfs-stream");
const { GridFsStorage } = require("multer-gridfs-storage");
const multer = require("multer");
require("dotenv").config(); // Load environment variables

const mongoURI = process.env.DB; // Use environment variable

// ✅ Connect to MongoDB
const conn = mongoose.createConnection(mongoURI);

let gfs;
conn.once("open", () => {
  console.log("✅ GridFS Database Connected");
  gfs = Grid(conn.db, mongoose.mongo);
  gfs.collection("books"); // Files will be stored in "uploads" collection
});

// ✅ Configure Multer GridFS Storage
const storage = new GridFsStorage({
  url: mongoURI,
  file: (req, file) => {
    return {
      filename: `${Date.now()}-${file.originalname}`,
      bucketName: "books",
    };
  },
});

const upload = multer({ storage });

module.exports = { upload, gfs, conn };
