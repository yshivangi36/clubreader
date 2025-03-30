const mongoose = require('mongoose');

const BookSchema = new mongoose.Schema({
  title: { type: String, required: true },
  author: { type: String, required: true },
  genres: {
    type: [String],
    required: [true, 'At least one genre is required'],
    validate: [arrayLimit, 'At least one genre is required'],
    set: function(genres) {
      return genres.map(genre => 
        genre.toLowerCase().replace(/s$/, '')
      );
    }
  },
  description: { type: String, required: true },
  coverImage: { type: String, required: true }, // Path to the image
  pdfUrl: { type: String, required: true }, // Path to the PDF
  createdAt: {
    type: Date,
    default: Date.now
  },
  ratings: {
    type: [{
      userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
      rating: { type: Number, required: true, min: 0, max: 5 }
    }],
    default: []
  },
  averageRating: { type: Number, default: 0,min: 0, max: 5,  set: v => Number(v.toFixed(1)) },
  ratingCount: { type: Number, default: 0 },
  comments: [
    {
      userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
      text: { type: String, required: true },
      createdAt: { type: Date, default: Date.now }
    }
  ],
  highlights: [{
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    text: String,
    page: Number,
    coordinates: Object,
    createdAt: Date
  }],
  bookmarks: [{
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    page: Number,
    createdAt: Date
  }],
  pageCount: Number,
  pdfUrl: {
    type: String,
    required: true,
    get: value => value.replace(/\\/g, '/') 
  },
  reads: { type: Number, default: 0 },
  toc: [{
    title: String,
    page: Number,
    level: { type: Number, default: 1 } // For hierarchy (e.g., chapters/sections)
  }]
});
BookSchema.index({ genres: 'text' });

function arrayLimit(val) {
  return val.length > 0;
}

module.exports = mongoose.model('Book', BookSchema);