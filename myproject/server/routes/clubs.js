const express = require("express");
const mongoose = require("mongoose");
const router = express.Router();
const {User} = require("../models/User");
const Club = require("../models/Club");
const authenticateToken = require("../middleware/authenticateToken");
const adminAuth = require("../middleware/adminAuth");

// ✅ Get all clubs
router.get("/",authenticateToken, async (req, res) => {
  try {
    const clubs = await Club.find().populate("createdBy", "UserName") // Fetch creator's username
    .populate("members", "UserName").populate("book", "genres");; // Fetch member names
    res.json(clubs);
  } catch (error) {
    console.error("Error fetching clubs:", error.message);
    res.status(500).json({ message: "Error fetching clubs", error: error.message });
  }
});

// ✅ Create a new club
router.post("/",authenticateToken, async (req, res) => {
  try {
    console.log("Received create club request:", req.body); // Add this
    const { name, book, description, active } = req.body;

    if (!name || !book || !description) {
      return res.status(400).json({ message: "All fields are required" });
    }
    if (!req.user || !req.user._id) {
      return res.status(401).json({ message: "Unauthorized: No user found" });
    }
    const newClub = new Club({
      name,
      book,
      description,
      active,
      createdBy: req.user._id,
      members: [req.user._id],
    });

    await newClub.save();

     // ✅ Add club to user's joined clubs
     await User.findByIdAndUpdate(req.user._id, {
      $push: { joinedClubs: newClub._id },
    });
    res.status(201).json(newClub);
  } catch (error) {
    console.error("Error creating club:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// ✅ Join a club
router.post("/joinClub", authenticateToken, async (req, res) => {
  try {
      const { clubId } = req.body;
      const userId = req.user._id;

      if (!mongoose.Types.ObjectId.isValid(userId) || !mongoose.Types.ObjectId.isValid(clubId)) {
          return res.status(400).json({ message: "Invalid user or club ID" });
      }

      const user = await User.findById(userId);
      const club = await Club.findById(clubId);

      if (!user || !club) {
          return res.status(404).json({ message: "User or club not found" });
      }

      // ✅ Add the user to the club's members if not already added
      if (!club.members.includes(userId)) {
        club.members.push(userId);
        await club.save();
      }

      // Add club to user's joined clubs if not already added
      if (!user.joinedClubs.includes(clubId)) {
          user.joinedClubs.push(clubId);
          await user.save();
      }

      res.status(200).json({ message: "Joined club successfully", user });
  } catch (error) {
      console.error("Error joining club:", error);
      res.status(500).json({ message: "Internal server error" });
  }
});

// ✅ Leave a club
router.post("/leaveClub", authenticateToken, async (req, res) => {
  try {
      const { clubId } = req.body;
      const userId = req.user._id;

      if (!mongoose.Types.ObjectId.isValid(clubId) || !mongoose.Types.ObjectId.isValid(userId)) {
          return res.status(400).json({ message: "Invalid user or club ID" });
      }

      const user = await User.findById(userId);
      if (!user) {
          return res.status(404).json({ message: "User not found" });
      }

      const club = await Club.findById(clubId);
      if (!club) {
          return res.status(404).json({ message: "Club not found" });
      }


      // Remove club from the user's joined clubs
    await User.findByIdAndUpdate(userId, { $pull: { joinedClubs: clubId } });

     // Ensure members array exists and filter out null values
    if (!club.members || !Array.isArray(club.members)) {
      console.error("❌ Club members array is missing or corrupted");
      return res.status(500).json({ error: "Club members data is corrupted" });
    }

    // Remove any `null` values in the members array
    club.members = club.members.filter(member => member !== null);

    // Now filter out the current user
    const updatedMembers = club.members.filter((member) => member.toString() !== userId);
    console.log("✅ Updated members:", updatedMembers);

    club.members = updatedMembers;
    await club.save();
      res.status(200).json({ message: "Successfully left the club" });

  } catch (error) {
      console.error("❌ Error leaving club:", error);
      res.status(500).json({ message: "Server error" });
  }
});

// ✅ Delete a club (❗ Only Creator Can Delete)
/*router.delete("/:id", authenticateToken, async (req, res) => {
  try {
    const club = await Club.findById(req.params.id);
    if (!club) return res.status(404).json({ message: "Club not found" });

    if (club.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Only the creator can delete this club." });
    }

    await Club.findByIdAndDelete(req.params.id);
    res.json({ message: "Club deleted successfully." });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});*/

// ✅ Get clubs the user has joined
router.get("/userClubs", authenticateToken, async (req, res) => {
  try {
    const userId = req.user._id;
    // Get created clubs
    const createdClubs = await Club.find({ createdBy: userId,members: userId }).select("_id name");

    // Get joined clubs (excluding created ones)
    const joinedClubs = await Club.find({ members: userId, createdBy: { $ne: userId } }).select("_id name");

    res.json({createdClubs, joinedClubs});
  } catch (error) {
    console.error("Error fetching user clubs:", error.message);
    res.status(500).json({ message: "Error fetching user clubs", error: error.message });
  }
});

router.get("/:id", authenticateToken, async (req, res) => {
  try {
    const club = await Club.findById(req.params.id)
    .populate("createdBy", "UserName avatar")
    .populate("members", "UserName avatar")
    .exec();
    console.log("📌 Fetched club members:", club.members);
    if (!club) {
      return res.status(404).json({ message: "Club not found" });
    }
    res.json(club);
  } catch (error) {
    console.error("Error fetching club:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Get all clubs (admin only)
router.get("/admin/all", authenticateToken, adminAuth, async (req, res) => {
  try {
    const clubs = await Club.find()
      .populate("createdBy", "UserName email avatar")
      .populate("members", "UserName");
    res.json(clubs);
  } catch (error) {
    res.status(500).json({ error: "Server error" });
  }
});

// Update delete route to allow admin deletion
router.delete("/:id", authenticateToken, async (req, res) => {
  try {
    console.log("➡️ Delete request received for club ID:", req.params.id);
    console.log("🛠 User making request:", req.user);
    console.log("📜 Request Headers:", req.headers);

    const club = await Club.findById(req.params.id);
    if (!club) return res.status(404).json({ message: "Club not found" });

    // Authorization check
    const isAdmin = req.user.isAdmin;
    const isCreator = club.createdBy.toString() === req.user._id.toString();

    if (!isAdmin && !isCreator) {
      console.log("❌ Unauthorized delete attempt by:", req.user._id);
      return res.status(403).json({ message: "Unauthorized: Only admin or creator can delete" });
    }

    // Admin-specific validation
    if (isAdmin && !req.headers['x-admin-reason']) {
      console.log("⚠️ Admin deletion failed due to missing reason.");
      return res.status(400).json({ message: "Admin deletions require a reason" });
    }

    console.log("✅ Club found. Proceeding with deletion...");

    // Check if the club creator exists
    let creator = null;
    if (club.createdBy) {
      creator = await User.findById(club.createdBy);
      if (!creator) {
        console.log("⚠️ Creator not found. Skipping notifications.");
      }
    }

     // Store notification data before deletion
     let notification;
     if (isAdmin && creator) {
       notification = {
         type: 'club_deletion',
         message: `Your club "${club.name}" was deleted by admin`,
         reason: req.headers['x-admin-reason'],
         timestamp: new Date(),
         status: "unread"
       };
     }

     console.log("📩 Notification to creator:", notification);
      if (!creator.notifications) creator.notifications = []; // Ensure notifications array exists
      creator.notifications.push(notification);
      try {
        await creator.save(); // Save notification only if creator exists
      } catch (notificationError) {
        console.error("❌ Error saving notification:", notificationError);
      }

    // Perform deletion
    await Club.findByIdAndDelete(req.params.id);
    console.log("✅ Club deleted successfully!");
    
    // Remove club from all users' joined clubs
    await User.updateMany(
      { joinedClubs: req.params.id },
      { $pull: { joinedClubs: req.params.id } }
    );

    // Add admin notification to creator
    if (isAdmin && club.createdBy) {
      const creator = await User.findById(club.createdBy);
      if (creator) {
        console.log("📩 Sending notification to club creator...");
        creator.notifications.push(notification);
        await creator.save();
      } else {
        console.log("⚠️ Creator not found for notification.");
      }
    }

    console.log("✅ Club deleted successfully!");
    res.json({ message: "Club deleted successfully", deletedBy: isAdmin ? "admin" : "creator" });
  } catch (err) {
    console.error("❌ Backend Delete Error:", err); 
    res.status(500).json({ error: err.message });
  }
});


// Add this route to clubs.js
router.delete('/:clubId/removeMember/:userId', authenticateToken, async (req, res) => {
  try {
    const { clubId, userId } = req.params;
    
    // Validate IDs
    if (!mongoose.Types.ObjectId.isValid(clubId) || !mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ error: "Invalid ID format" });
    }

    const club = await Club.findById(clubId);
    if (!club) return res.status(404).json({ error: "Club not found" });

    // Verify requester is club creator
    if (club.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: "Only club creator can remove members" });
    }

    // Update club members
    club.members = club.members.filter(memberId => memberId.toString() !== userId);
    await club.save();

    // Update user's joined clubs
    await User.findByIdAndUpdate(userId, { 
      $pull: { joinedClubs: clubId } 
    });

    res.json({ message: "Member removed successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/rankings/members', async (req, res) => {
  try {
    const clubs = await Club.aggregate([
      {
        $project: {
          name: 1,
          memberCount: { $size: "$members" },
          createdAt: 1
        }
      },
      { $sort: { memberCount: -1 } },
      { $limit: 10 }
    ]);
    res.json(clubs);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/rankings/most-members', async (req, res) => {
  try {
    const clubs = await Club.aggregate([
      { $project: { name: 1, memberCount: { $size: "$members" } } },
      { $sort: { memberCount: -1 } },
      { $limit: 10 }
    ]);
    res.json(clubs);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
