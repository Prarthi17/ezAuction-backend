const asyncHandler = require("express-async-handler");
const Product = require("../models/productModel");
const BiddingProduct = require("../models/biddingProductModel");
const sendEmail = require("../utils/sendEmail");
const User = require("../models/userModel");
const { placeBidTransactional, finalizeAuction } = require("../services/auctionService");

const placeBid = asyncHandler(async (req, res) => {
  const { productId, price } = req.body;
  const userId = req.user.id;

  const result = await placeBidTransactional({ userId, productId, price: Number(price) });
  if (!result.ok) {
    res.status(400);
    throw new Error(result.error);
  }
  res.status(201).json(result);
});

const getBiddingHistory = asyncHandler(async (req, res) => {
  const { productId } = req.params;

  const biddingHistory = await BiddingProduct.find({ product: productId }).sort("-createdAt").populate("user").populate("product");

  res.status(200).json(biddingHistory);
});

const sellProduct = asyncHandler(async (req, res) => {
  const { productId } = req.body;
  const userId = req.user.id;

  const product = await Product.findById(productId);
  if (!product) {
    return res.status(404).json({ error: "Product not found" });
  }

  if (product.user.toString() !== userId) {
    return res.status(403).json({ error: "You do not have permission to sell this product" });
  }

  const result = await finalizeAuction(productId);
  res.status(200).json({ message: "Auction finalized", result });
});

const getAuctionState = asyncHandler(async (req, res) => {
  const { productId } = req.params;

  const product = await Product.findById(productId)
    .populate("currentHighBidder")
    .populate("soldTo");
  if (!product) {
    res.status(404);
    throw new Error("Product not found");
  }
  const history = await BiddingProduct.find({ product: productId }).sort({ createdAt: -1 }).limit(20).populate("user");
  const payload = {
    productId,
    biddingStatus: product.biddingStatus,
    auctionStartAt: product.auctionStartAt,
    auctionEndAt: product.auctionEndAt,
    currentBid: product.currentBid || 0,
    currentHighBidder: product.currentHighBidder
      ? { id: product.currentHighBidder._id, name: product.currentHighBidder.name }
      : null,
    lastBids: history.map(b => ({ id: b._id, price: b.price, user: { id: b.user._id, name: b.user.name }, at: b.createdAt })),
  };
  if (product.biddingStatus === 'ended') {
    if (product.soldTo) payload.winner = { id: product.soldTo._id, name: product.soldTo.name };
    payload.soldPrice = product.soldPrice || 0;
  }
  res.json(payload);
});

module.exports = {
  placeBid,
  getBiddingHistory,
  sellProduct,
  getAuctionState,
};
