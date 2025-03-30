// models/Message.js
const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  user: { type: String, required: true },
  message: { type: String, required: true },
  clubId: { type: mongoose.Schema.Types.ObjectId, ref: 'Club', required: true },
  timestamp: { type: Date, required: true }
});

const Message = mongoose.model('Message', messageSchema);
module.exports = Message;
