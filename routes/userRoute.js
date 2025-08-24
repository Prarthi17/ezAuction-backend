const express = require("express");
const router = express.Router();
const { registerUser, loginUser, loginStatus, logoutUser, loginAsSeller, estimateIncome, getUser, getUserBalance, getAllUser, updateUserProfile, updateUserPassword } = require("../controllers/userCtr");
const { protect, isAdmin } = require("../middleware/authMiddleware");
const { upload } = require("../utils/fileUpload");

// router.post("/register", registerUser);
router.post("/register", upload.single("photo"), registerUser);
router.post("/login", loginUser);
router.get("/loggedin", loginStatus);
router.get("/logout", logoutUser);
router.post("/seller", loginAsSeller);
router.get("/getuser", protect, getUser);
router.put("/profile", protect, upload.single("photo"), updateUserProfile);
router.put("/password", protect, updateUserPassword);
router.get("/sell-amount", protect, getUserBalance);
router.get("/estimate-income", protect, isAdmin, estimateIncome);
router.get("/users", protect, isAdmin, getAllUser);

module.exports = router;   // ✅ THIS must be here
