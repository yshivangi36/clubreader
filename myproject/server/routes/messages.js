const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Message = require('../models/Message');
const User = require('../models/User');
const Club = require('../models/Club');
const authenticateToken = require('../middleware/authenticateToken');

const TIME_LIMIT = 5 * 60 * 1000;

// POST - Send a message
router.post('/', async (req, res) => {
  console.log("📩 Incoming POST request to /api/messages");
  console.log("Request Body:", req.body);
    try {
        const { message, user, clubId, username, avatar, timestamp } = req.body;
        
        console.log("Incoming message request:", req.body);

        // Validate input
        if (!message || !user || !clubId || !username) {
            console.log("Validation failed - Missing fields");
            return res.status(400).json({ error: "All fields are required" });
        }

        // Check if clubId is a valid ObjectId
        if (!mongoose.Types.ObjectId.isValid(clubId)) {
            console.log("Invalid clubId:", clubId);
            return res.status(400).json({ error: "Invalid clubId format" });
        }

        // Create new message
        const newMessage = new Message({
            user,
            username,
            avatar: avatar || userData.avatar,
            message: req.body.message,
            clubId: req.body.clubId,
            timestamp: timestamp || new Date(),
        });

        console.log("Saving new message:", newMessage);

        await newMessage.save();
        console.log("Message saved successfully:", newMessage);

        // Emit to Socket.IO room
        const io = req.app.get('io');
        if (io) {
            io.to(clubId).emit("newMessage", newMessage);
            console.log(`📡 Emitted message to room ${clubId}`);
        }

        res.status(201).json(newMessage);
    } catch (error) {
        console.error('Message error:', error);
        res.status(500).json({ error: error.message });
    }
});

// GET - Fetch messages for a club
router.get('/:clubId', async (req, res) => {
    try {
        const { clubId } = req.params;

        console.log("Fetching messages for clubId:", clubId);

        if (!mongoose.Types.ObjectId.isValid(clubId)) {
            console.log("Invalid clubId format:", clubId);
            return res.status(400).json({ error: "Invalid clubId format" });
        }

        const messages = await Message.find({ clubId: new mongoose.Types.ObjectId(clubId) })
            .sort({ timestamp: 1 })
            .limit(100)
            .lean();  // Convert to plain JavaScript object

        console.log(`Found ${messages.length} messages for club ${clubId}`);

        // Convert clubId to string for client
        const adjustedMessages = messages.map(msg => ({
            ...msg,
            clubId: msg.clubId.toString(),
            user: msg.user.toString()
        }));

        res.json(adjustedMessages);
    } catch (error) {
        console.error('Fetch messages error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Delete message
router.delete('/:id',authenticateToken, async (req, res) => {
    try {
      console.log("🛠 Delete request received for message ID:", req.params.id);
      const message = await Message.findById(req.params.id);
        if (!message) { return res.status(404).send({ message: 'Message not found' });}

        const club = await Club.findById(message.clubId);
        if (!club) return res.status(404).json({ error: "Club not found" });

        const isClubCreator = club.createdBy.toString() === req.user._id.toString();
        const isAdmin = req.user.isAdmin;
        const isMessageOwner = message.user.toString() === req.user._id.toString();

        const timeElapsed = Date.now() - message.timestamp;
        const canDelete = isClubCreator || isAdmin || 
                     (isMessageOwner && timeElapsed <= TIME_LIMIT);


        if (!canDelete) {
        return res.status(403).json({ 
          error: "You don't have permission to delete this message." 
        });
      }
      // In backend delete route
      console.log("Club Creator:", club.createdBy.toString());
      console.log("Requesting User:", req.user._id.toString());
      console.log("Is Club Creator?", isClubCreator);
      console.log("Is Admin?", req.user.isAdmin);

      await Message.findByIdAndDelete(req.params.id);
  
      const io = req.app.get('io');
      io.to(message.clubId.toString()).emit("deleteMessage", message._id);
  
      res.json({ success: true, message: "Message deleted successfully" });
    } catch (error) {
      console.error("❌ Delete error:", error);
      res.status(500).send({ message: error.message });
    }
  });  

  // server/routes/messages.js
router.put('/:id',authenticateToken, async (req, res) => {
    try {
      const message = await Message.findById(req.params.id);
      
      if (!message) {return res.status(404).send({ message: 'Message not found' });}
  
      if (message.user.toString() !== req.user._id.toString()) {
        return res.status(403).send({ message: 'Not authorized to edit this message' });
      }

      const now = new Date();
      const messageTime = new Date(message.timestamp);

      if (now - messageTime > TIME_LIMIT) {
          return res.status(403).json({ error: "You can only edit messages within 5 minutes of sending." });
      }
  
      message.message = req.body.message;  // Update message content
      await message.save();
  
      const io = req.app.get('io');
    io.to(message.clubId.toString()).emit("editMessage", message);
    res.json(message);
    } catch (error) {
      res.status(500).send({ message: error.message });
    }
  });  

  // PUT - Edit a message
router.put('/:messageId', async (req, res) => {
  try {
      const { message, userId } = req.body;
      if (!message) {
          return res.status(400).json({ error: "Message content is required" });
      }
      
      const existingMessage = await Message.findById(req.params.messageId);
      if (!existingMessage) {
          return res.status(404).json({ error: "Message not found" });
      }
      
      if (existingMessage.user.toString() !== userId) {
          return res.status(403).json({ error: "You can only edit your own messages" });
      }

      existingMessage.message = message;
      await existingMessage.save();

      const io = req.app.get('io');
      if (io) io.to(existingMessage.clubId.toString()).emit("editMessage", existingMessage);

      res.json(existingMessage);
  } catch (error) {
      res.status(500).json({ error: error.message });
  }
});

// DELETE - Admin removes a member from a club
router.delete('/removeMember/:clubId/:userId',authenticateToken , async (req, res) => {
  try {
      const { clubId, userId } = req.params;
      const { adminId } = req.body;

      const club = await Club.findById(clubId);
      if (!club) {return res.status(404).json({ error: "Club not found" });}

      if (club.createdBy.toString() !== req.user._id.toString()) {
        return res.status(403).json({ error: "Only club creator can remove members" });
      }

      club.members = club.members.filter(memberId => memberId.toString() !== userId);
      await club.save();

      await User.findByIdAndUpdate(userId, { $pull: { joinedClubs: clubId } });

      res.json({ message: "Member removed successfully" });
  } catch (error) {
      res.status(500).json({ error: error.message });
  }
});

module.exports = router;
