const mongoose = require('mongoose');

const ClubSchema = new mongoose.Schema({
  name: { type: String, required: true },
  book:{ type: String, required: true },
  description: {type: String},
  active: {type: Boolean, default: true},
  members: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, // ✅ Track creator
  createdAt: { type: Date, default: Date.now },
  discussions: { type: Number, default: 0 },
});

const Club = mongoose.model('Club', ClubSchema);

module.exports = Club;