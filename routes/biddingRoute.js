const express = require("express");
const { placeBid, getBiddingHistory, sellProduct } = require("../controllers/biddingCtr");
const { protect, isSeller } = require("../middleware/authMiddleware");
const { validateBid } = require("../middleware/validationMiddleware");
const { validationResult } = require("express-validator");
const router = express.Router();

function handleValidationErrors(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
}

router.get("/:productId", getBiddingHistory);
router.post("/sell", protect, isSeller, sellProduct);
router.post("/", protect, validateBid, handleValidationErrors, placeBid);

module.exports = router;
