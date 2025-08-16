const express = require("express");
const router = express.Router();
const { registerUser, loginUser, loginStatus, logoutUser, loginAsSeller, estimateIncome, getUser, getUserBalance, getAllUser } = require("../controllers/userCtr");
const { protect, isAdmin } = require("../middleware/authMiddleware");
const { validateRegister, validateLogin } = require("../middleware/validationMiddleware");
const { validationResult } = require("express-validator");

router.post("/register", validateRegister, handleValidationErrors, registerUser);
router.post("/login", validateLogin, handleValidationErrors, loginUser);
router.get("/loggedin", loginStatus);
router.get("/logout", logoutUser);
router.post("/seller", loginAsSeller);
router.get("/getuser", protect, getUser);
router.get("/sell-amount", protect, getUserBalance);

router.get("/estimate-income", protect, isAdmin, estimateIncome);
router.get("/users", protect, isAdmin, getAllUser);

// Validation error handler
function handleValidationErrors(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
}

module.exports = router;
