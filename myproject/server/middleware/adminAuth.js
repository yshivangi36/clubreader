const adminAuth = (req, res, next) => {
  console.log("🔍 Admin Auth Middleware - Checking user...");
  console.log("Received req.user:", req.user);  // Log user object

  if (!req.user) {
      console.error("❌ No user found in request (adminAuth rejected)");
      return res.status(401).json({ error: "Unauthorized: No user found in request" });
  }

  console.log("User Data in AdminAuth:", req.user);

  if (!req.user.isAdmin) {
      console.error("❌ Access Denied: User is not an admin");
      return res.status(403).json({ error: "Access denied, admin only" });
  }

  console.log("✅ User is an admin - Access granted");
  next();
};

module.exports = adminAuth;
