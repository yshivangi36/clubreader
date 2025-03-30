const express = require("express");
const router = express.Router();
const authenticateToken = require("../middleware/authenticateToken");
const BookRequest = require("../models/BookRequest");
const {User} = require("../models/User");
const Book = require("../models/Book");

const adminAuth = (req, res, next) => {
  if (!req.user.isAdmin) {
    return res.status(403).json({ error: "Admin access required" });
  }
  next();
};

// User submits a book request
router.post("/", authenticateToken, async (req, res) => {
  console.log("Request Body:", req.body);
  try {
    const { bookTitle } = req.body; 
    const user = await User.findById(req.user._id);

    if (!bookTitle) {
      return res.status(400).json({ error: "Book title is required" });
    }

    const request = new BookRequest({
      user: req.user._id, 
      bookTitle,
      status: "Pending",
    });

    await request.save();

    user.notifications.push({
      message: `Your request for "${bookTitle}" has been submitted for review`,
      status: "Pending",
      createdAt: new Date()
    });
    await user.save();

    res.status(201).json(request);
  } catch (error) {
    console.error("Book Request Error:", error);
    res.status(500).json({ error: "Server error" });
  }
});

// User gets their own requests
router.get("/", authenticateToken, async (req, res) => {
  try {
    const requests = await BookRequest.find({ user: req.user._id })
      .sort({ createdAt: -1 });
      
    res.json(requests);
  } catch (error) {
    res.status(500).json({ error: "Server error" });
  }
});

// Admin gets all requests
router.get("/admin/all",authenticateToken, adminAuth, async (req, res) => {
  try {
    const pendingRequests = await BookRequest.find({ status: "Pending" })
      .populate("user", "UserName avatar email");

    const approvedRequests = await BookRequest.find({ status: "Approved" })
      .populate("user", "UserName avatar email");

    const rejectedRequests = await BookRequest.find({ status: "Rejected" })
      .populate("user", "UserName avatar email");

    res.json({
      pendingRequests,
      approvedRequests,
      rejectedRequests
    });
  } catch (error) {
    res.status(500).json({ error: "Server error" });
  }
});

// Admin updates request status
router.put("/admin/:id",authenticateToken, adminAuth, async (req, res) => {
  try {
    const { status, reason } = req.body;
    const requestId = req.params.id;

    // Validation
    if (!status) return res.status(400).json({ message: "Status is required" });
    if (status === "Rejected" && !reason) {
      return res.status(400).json({ message: "Rejection reason is required" });
    }

    if (!["Pending", "Approved", "Rejected"].includes(status)) {
      return res.status(400).json({ error: "Invalid status" });
    }

    // Update data
    const updateData = { status };
    if (status === "Rejected") {
      updateData.reason = reason;
    } else {
      updateData.reason = ""; // Clear reason for non-rejected statuses
    }

    // Perform update
    const updatedRequest = await BookRequest.findByIdAndUpdate(
      requestId,
      updateData,
      { new: true }
    ).populate({
      path: 'user',
      model: 'User' 
    });

    if (!updatedRequest) {
      return res.status(404).json({ message: "Request not found" });
    }

    // Notify user
let notificationMessage;
if (status === "Approved") {
  notificationMessage = `Your request for "${updatedRequest.bookTitle}" has been approved. Check the Genre section to find the book.`;
} else if (status === "Rejected") {
  notificationMessage = `Your request for "${updatedRequest.bookTitle}" was rejected. Reason: ${reason}`;
}

if (notificationMessage) {
  if (!updatedRequest.user.notifications) {
    updatedRequest.user.notifications = [];
  }
  updatedRequest.user.notifications.push({
    message: notificationMessage,
    status: status,
    reason: status === "Rejected" ? reason : "No reason provided",
    createdAt: new Date()
  });
  await updatedRequest.user.save();
}

    res.status(200).json(updatedRequest);
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: "Server error" });
  }
});

// Notify users when an approved book is added**
router.post("/notify-users/:bookId", authenticateToken, adminAuth, async (req, res) => {
  try {
    const book = await Book.findById(req.params.bookId);
    if (!book) {
      return res.status(404).json({ error: "Book not found" });
    }

    // Find all users who requested this book
    const requestingUsers = await BookRequest.find({ bookTitle: book.title, status: "Approved" })
      .populate("user");

    // Notify all users who requested this book
    for (const request of requestingUsers) {
      request.user.notifications.push({
        message: `The book "${book.title}" is now available in the Genre section!`,
        status: "Available",
        timestamp: new Date(),
      });
      await request.user.save();
    }

    res.json({ message: "Users notified successfully." });
  } catch (error) {
    console.error("Notification Error:", error);
    res.status(500).json({ error: "Failed to notify users" });
  }
});

router.post("/clear-notifications", authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    user.notifications = [];
    await user.save();
    res.json({ message: "Notifications cleared successfully" });
  } catch (error) {
    console.error("Clear Notifications Error:", error);
    res.status(500).json({ error: "Failed to clear notifications" });
  }
});

// User Notifications (Check Book Request Status)**
router.get("/notifications", authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('notifications');
    res.json(user.notifications);
  } catch (error) {
    console.error("User Notification Fetch Error:", error);
    res.status(500).json({ error: "Failed to fetch user notifications" });
  }
});

// Admin Notifications (New Book Requests)**
router.get("/admin/notifications",authenticateToken, adminAuth, async (req, res) => {
  try {
    const newRequests = await BookRequest.find({ status: "Pending" });
    res.json({ newRequestsCount: newRequests.length });
  } catch (error) {
    console.error("Admin Notification Fetch Error:", error);
    res.status(500).json({ error: "Failed to fetch admin notifications" });
  }
});

// Mark notifications as read
router.put('/notifications/mark-read', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    user.notifications.forEach(n => n.viewed = true);
    await user.save();
    res.json({ message: "All notifications marked as read" });
  } catch (error) {
    res.status(500).json({ error: "Failed to update notifications" });
  }
});

// Mark single notification as read
router.patch('/notifications/:id/mark-read', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    const notification = user.notifications.id(req.params.id);
    if (notification) notification.viewed = true;
    await user.save();
    res.json({ message: "Notification marked as read" });
  } catch (error) {
    res.status(500).json({ error: "Failed to update notification" });
  }
});

module.exports = router;