const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema({
    user: { type: String, ref: "User", required: true },
    username: { type: String, required: true },   // Add username field
    message: { type: String, required: true },
    avatar: { type: String },
    clubId: {type: mongoose.Schema.Types.ObjectId,ref: "Club",required: true},
    timestamp: { type: Date, default: Date.now },
});

// Ensure old messages without `username` or `avatar` get updated before saving
messageSchema.pre("save", async function (next) {
    if (!this.username || !this.avatar) {
        const user = await mongoose.model("User").findById(this.user).select("UserName avatar");
        if (user) {
            this.username = this.username || user.UserName;  // Set username if missing
            this.avatar = this.avatar || user.avatar;  // Set avatar if missing
        }
    }
    next();
});

module.exports = mongoose.model("Message", messageSchema);

