const express = require("express");
const { placeBid, getBiddingHistory, sellProduct, getAuctionState } = require("../controllers/biddingCtr");
const { protect, isSeller } = require("../middleware/authMiddleware");
const router = express.Router();

router.get("/state/:productId", getAuctionState);
router.get("/:productId", getBiddingHistory);
router.post("/sell", protect, isSeller, sellProduct);
router.post("/", protect, placeBid);

module.exports = router;
