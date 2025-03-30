// routes/books.js
const express = require('express');
const multer = require('multer');
const path = require('path');
const crypto = require('crypto');
const Book = require('../models/Book');
const {User} = require('../models/User');
const mongoose = require('mongoose');
const fs = require('fs');
const authenticateToken = require('../middleware/authenticateToken');
const adminAuth =require("../../server/middleware/adminAuth");
const pdfjsLib = require('pdfjs-dist/legacy/build/pdf');

const router = express.Router();

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const type = file.mimetype.startsWith('image/') ? 'images' : 'pdfs';
    cb(null, `uploads/${type}`);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const uniqueName = `${Date.now()}-${crypto.randomBytes(8).toString('hex')}${ext}`;
    cb(null, uniqueName);
  }
});

const validateGenres = (req, res, next) => {
  try {
    const parsedGenres = JSON.parse(req.body.genres);
    
    if (!Array.isArray(parsedGenres)) {
      return res.status(400).json({ error: "Genres must be an array" });
    }

    req.validatedGenres = parsedGenres;
    next();
  } catch (error) {
    res.status(400).json({ error: "Invalid genres format" });
  }
};

const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image/') || file.mimetype === 'application/pdf') {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only images (JPEG, PNG) and PDFs are allowed'), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 50 * 1024 * 1024 } // 50MB
});

router.post('/books', 
  authenticateToken,
  upload.fields([
    { name: 'coverImage', maxCount: 1 },
    { name: 'bookPdf', maxCount: 1 }
  ]),
  async (req, res) => {
    try {
      const { title, author, description, genres } = req.body;

      // Validate required fields
      const errors = [];
      if (!title) errors.push('Title is required');
      if (!author) errors.push('Author is required');
      if (!description) errors.push('Description is required');
      if (!genres || !JSON.parse(genres)?.length) errors.push('At least one genre is required');

      // Validate files
      if (!req.files?.coverImage?.[0]) errors.push('Cover image is required');
      if (!req.files?.bookPdf?.[0]) errors.push('PDF file is required');

      if (errors.length > 0) {
        return res.status(400).json({ errors });
      }

      const parsedGenres = JSON.parse(genres);
      const pdfPath = path.join(__dirname, '../uploads/pdfs', req.files.bookPdf[0].filename);
      const stats = fs.statSync(pdfPath);
      
      if (stats.size < 1024) {
        throw new Error('Uploaded PDF is too small (possibly corrupted)');
      }
      const data = new Uint8Array(fs.readFileSync(pdfPath));
      const pdf = await pdfjsLib.getDocument(data).promise;
      if (pdf.numPages < 1) {
        throw new Error('Invalid PDF document structure');
      }
      const toc = Array.isArray(req.body.toc) ? req.body.toc : [];

      const newBook = new Book({
        title,
        author,
        description,
        genres: Array.isArray(parsedGenres) ? 
        parsedGenres.map(g => g.trim()) : 
        [],
        coverImage: `/uploads/images/${req.files.coverImage[0].filename}`,
        pdfUrl: `/uploads/pdfs/${req.files.bookPdf[0].filename}`,
        pageCount: pdf.numPages,
        toc: toc
      });

      await newBook.save();
      res.status(201).json({ message: 'Book uploaded successfully' });

    } catch (error) {
      if (req.files?.coverImage) {
        fs.unlinkSync(path.join(__dirname, '../uploads/images', req.files.coverImage[0].filename));
      }
      if (req.files?.bookPdf) {
        fs.unlinkSync(pdfPath);
      }
      console.error('Upload error:', error);
      const status = error.name === 'ValidationError' ? 400 : 500;
      res.status(status).json({ 
        error: error.message || 'Server error during upload'
      });
    }
  }
);

// Get all books with image and PDF URLs
router.get('/', async (req, res) => {
  try {
    const books = await Book.find({});
    res.status(200).json(books);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Submit rating
router.post("/:bookId/rate", authenticateToken, async (req, res) => {
  try {
    const { rating } = req.body;
    const bookId = req.params.bookId;
    const userId = new mongoose.Types.ObjectId(req.user._id);

    if (typeof rating !== 'number' || rating < 0 || rating > 5) {
      return res.status(400).json({ message: "Invalid rating value" });
    }

    const book = await Book.findById(bookId);
    if (!book) return res.status(404).json({ message: "Book not found" });

    // Check for existing rating using ObjectId
    const existingRating = book.ratings.find(r => 
      r.userId.equals(userId)
    );

    if (existingRating) {
      return res.status(409).json({ 
        message: "You have already rated this book!",
        existingRating: existingRating.rating
      });
    }

    // Add new rating with proper ObjectId
    book.ratings.push({ userId, rating });
    
    
    // Calculate new averages
    const total = book.ratings.reduce((sum, r) => sum + r.rating, 0);
    book.averageRating = total / book.ratings.length;
    book.ratingCount = book.ratings.length;

    await book.save();

    res.json({
      averageRating: book.averageRating,
      ratingCount: book.ratingCount,
      userRating: rating
    });

  } catch (error) {
    console.error("Rating error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

router.get("/:bookId",authenticateToken, async (req, res) => {
  try {
    const book = await Book.findById(req.params.bookId)
    .populate('comments.userId', 'UserName avatar')
    .populate({
      path: 'ratings.userId',
      select: '_id',
      transform: (doc) => doc ? doc._id.toString() : null
    })
    if (!book) return res.status(404).json({ message: "Book not found" });

     const transformedRatings = book.ratings.map(rating => ({
      userId: rating.userId, // Now a string
      rating: rating.rating
    }));

    res.json({
      ...book.toObject(),
      ratings: transformedRatings,
      averageRating: book.averageRating,
      ratingCount: book.ratingCount
    });
    
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});

// Add comments endpoints
router.post('/:bookId/comments', authenticateToken, async (req, res) => {
  try { 
    const { text } = req.body;
    const bookId = req.params.bookId;
    const userId = req.user._id;

    if (!text?.trim()) return res.status(400).json({ message: "Comment text required" });

    const newComment = {
      userId: new mongoose.Types.ObjectId(userId),
      text: text.trim(),
      createdAt: new Date()
    };

    const updatedBook = await Book.findByIdAndUpdate(
      bookId,
      { $push: { comments: newComment } },
      { 
        new: true,
        runValidators: true,
        context: 'query',
        populate: { path: 'comments.userId', select: 'UserName avatar' }
      }
    );

    if (!updatedBook) return res.status(404).json({ message: "Book not found" });

    const addedComment = updatedBook.comments.slice(-1)[0];
    const responseComment = {
      _id: addedComment._id,
      text: addedComment.text,
      createdAt: addedComment.createdAt,
      user: {
        _id: addedComment.userId._id,
        UserName: addedComment.userId.UserName,
        avatar: addedComment.userId.avatar
      }
    };

    res.status(201).json(responseComment);
  } catch (error) {
    console.error("Error adding comment:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

router.get('/:bookId/comments',authenticateToken, async (req, res) => {
  try {
    const book = await Book.findById(req.params.bookId).populate({
      path: 'comments.userId',
      select: 'UserName avatar'
    });
    if (!book) return res.status(404).json({ message: "Book not found" });

    const comments = book.comments.map(comment => {
      // Handle cases where userId is not populated (invalid or deleted user)
      const userData = comment.userId ? {
        _id: comment.userId._id,
        UserName: comment.userId.UserName,
        avatar: comment.userId.avatar
      } : {
        _id: null,
        UserName: 'Anonymous',
        avatar: null
      };

      return {
        _id: comment._id,
        text: comment.text,
        createdAt: comment.createdAt,
        user: userData
      };
    });

    res.json(comments);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Serve PDF file
router.get('/pdf/:filename',authenticateToken, (req, res) => {
  const filePath = path.join(__dirname, '../uploads/pdfs', req.params.filename);

  if (fs.existsSync(filePath)) {
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'inline; filename="document.pdf"');
    res.sendFile(filePath);
  } else {
    res.status(404).json({ error: 'PDF not found' });
  }
});

// Serve image file
router.get('/image/:filename', (req, res) => {
  const filePath = path.join(__dirname, '../uploads/images', req.params.filename);
  if (fs.existsSync(filePath)) {
    res.sendFile(filePath);
  } else {
    res.status(404).json({ error: 'Image not found' });
  }
});

router.get('/:filename', (req, res) => {
  const filePath = path.join(__dirname, '../uploads/pdfs', req.params.filename);
  
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', 'inline; filename="book.pdf"');
  res.sendFile(filePath, (err) => {
    if (err) {
      console.error('PDF serve error:', err);
      res.status(404).json({ error: 'PDF not found' });
    }
  });
});

// Add this endpoint to handle PDF access by book ID
router.get('/:bookId/pdf', authenticateToken, async (req, res) => {
  try {
    const book = await Book.findById(req.params.bookId);
    if (!book) return res.status(404).json({ error: 'Book not found' });

    const pdfPath = path.join(__dirname, '../', book.pdfUrl);
    const stats = fs.statSync(pdfPath);
    
    // Validate PDF size
    if (stats.size < 1024) {
      throw new Error('PDF file appears corrupted');
    }

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Length': stats.size,
      'Content-Disposition': `inline; filename="${book.title}.pdf"`
    });

    // Stream with proper error handling
    const fileStream = fs.createReadStream(pdfPath)
    .on('error', (err) => {
      console.error('Stream error:', err);
      if (!res.headersSent) res.status(500).json({ error: 'Error streaming PDF' });
    });
    
    // Track read count after successful stream
    fileStream.on('end', async () => {
      try {
        book.reads += 1;
        await book.save();
      } catch (dbError) {
        console.error('Read count update failed:', dbError);
      }
    });

    fileStream.pipe(res);
  } catch (error) {
    console.error('PDF delivery error:', error);
    res.status(500).json({ 
      error: process.env.NODE_ENV === 'development' 
        ? error.message 
        : 'Internal server error'
    });
  }
});

router.post('/:bookId/bookmarks', authenticateToken, async (req, res) => {
  try {
    const { page } = req.body;
    const bookmark = {
      userId: req.user._id,
      page,
      createdAt: new Date()
    };

    const updatedBook = await Book.findByIdAndUpdate(
      req.params.bookId,
      { $addToSet: { bookmarks: bookmark } },
      { new: true }
    );

    res.json(updatedBook.bookmarks);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get bookmarks
router.get('/:bookId/bookmarks', authenticateToken, async (req, res) => {
  try {
    const book = await Book.findById(req.params.bookId);
    const userBookmarks = book.bookmarks.filter(b => b.userId.equals(req.user._id));
    res.json(userBookmarks);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Highlights endpoints
router.get('/:bookId/highlights', authenticateToken, async (req, res) => {
  try {
    const book = await Book.findById(req.params.bookId);
    const userHighlights = book.highlights.filter(h => h.userId.equals(req.user._id));
    res.json(userHighlights);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/:bookId/highlights', authenticateToken, async (req, res) => {
  try {
    const { text, page, coordinates } = req.body;
    
    const newHighlight = {
      userId: req.user._id,
      text,
      page,
      coordinates,
      createdAt: new Date()
    };

    const updatedBook = await Book.findByIdAndUpdate(
      req.params.bookId,
      { $push: { highlights: newHighlight } },
      { new: true }
    );

    res.status(201).json(newHighlight);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update book details
router.put('/:bookId/admin', authenticateToken, adminAuth, async (req, res) => {
  try {
    const { title, author, description, genres } = req.body;

    // Validate input
    if (!title || !author || !description || !genres) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const updatedBook = await Book.findByIdAndUpdate(
      req.params.bookId,
      { title, 
        author, 
        description, 
        genres: Array.isArray(genres) ? genres : genres.split(','),
      updatedAt: new Date()
     },
      { new: true, runValidators: true }
    );

    if (!updatedBook) return res.status(404).json({ error: 'Book not found' });

    res.json(updatedBook);
  } catch (error) {
    console.error('Update error:', error);
    res.status(500).json({ 
      error: error.message || 'Server error during update'
    });
  }
});

// Delete book
router.delete('/:bookId/admin', authenticateToken, adminAuth, async (req, res) => {
  console.log("Delete request received...");
    console.log("User attempting to delete:", req.user);
    console.log("Book ID:", req.params.bookId);

  try {
    const book = await Book.findByIdAndDelete(req.params.bookId);
    if (!book) {
      console.error("❌ Book not found");
      return res.status(404).json({ error: "Book not found" });
  }

  console.log("✅ Book found, proceeding with deletion...");

        await Book.findByIdAndDelete(req.params.bookId);
        
     // File deletion helper
     const deleteFile = (filePath) => {
      const fullPath = path.join(__dirname, '../', filePath);
      if (fs.existsSync(fullPath)) {
        fs.unlinkSync(fullPath);
      }
    };

    // Delete associated files
    if (book.coverImage) deleteFile(book.coverImage);
    if (book.pdfUrl) deleteFile(book.pdfUrl);

    console.log("✅ Book deleted successfully");
    res.json({ 
      message: 'Book deleted successfully',
      deletedBook: book
    });
  } catch (error) {
    console.error('Delete error:', error);
    res.status(500).json({ 
      error: error.message || 'Server error during deletion'
    });
  }
});

router.get('/genres', async (req, res) => {
  try {
    // Verify database connection
    if (mongoose.connection.readyState !== 1) {
      return res.status(500).json({ 
        message: "Database connection error",
        connected: false
      });
    }

    // Check if books collection exists
    const collectionExists = await mongoose.connection.db.listCollections({ name: 'books' }).hasNext();
    if (!collectionExists) {
      return res.json([]);
    }

    // Get distinct genres with error handling
    const genres = await Book.distinct('genres').catch(error => {
      console.error('Database query error:', error);
      return [];
    });

    res.json(genres.filter(Boolean)); // Remove any null/undefined values

  } catch (error) {
    console.error('[GENRES] Critical Error:', {
      message: error.message,
      stack: error.stack
    });
    res.status(500).json({ 
      message: "Failed to fetch genres",
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

router.get('/rankings/reads', async (req, res) => {
  try {
    const books = await Book.find().sort({ reads: -1 }).limit(10);
    res.json(books);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/rankings/most-visited', async (req, res) => {
  try {
    const books = await Book.find().sort({ reads: -1 }).limit(10);
    res.json(books);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/rankings/highest-rated', async (req, res) => {
  try {
    const books = await Book.find().sort({ averageRating: -1 }).limit(10);
    res.json(books);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/rankings/most-discussed', async (req, res) => {
  try {
    const books = await Book.aggregate([
      { $project: { title: 1, author: 1, commentCount: { $size: "$comments" } } },
      { $sort: { commentCount: -1 } },
      { $limit: 10 }
    ]);
    res.json(books);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get TOC for a book
router.get('/:bookId/toc', authenticateToken, async (req, res) => {
  try {
    const book = await Book.findById(req.params.bookId, 'toc');
    if (!book) return res.status(404).json({ error: 'Book not found' });
    
    res.json(book.toc || []);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update TOC (Admin only)
router.put('/:bookId/toc', authenticateToken, adminAuth, async (req, res) => {
  try {
    const { toc } = req.body;
    
    if (!Array.isArray(toc)) {
      return res.status(400).json({ error: 'TOC must be an array' });
    }

    const updatedBook = await Book.findByIdAndUpdate(
      req.params.bookId,
      { toc : toc },
      { new: true, runValidators: true }
    );

    res.json(updatedBook.toc);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;