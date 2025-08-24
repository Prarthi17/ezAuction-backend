const mongoose = require("mongoose");

const productSchema = mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      require: true,
      ref: "User",
    },
    title: {
      type: String,
      require: [true, "Please add a title"],
      trime: true,
    },
    slug: {
      type: String,
      unique: true,
    },
    description: {
      type: String,
      required: [true, "Please add a description"],
      trime: true,
    },
    image: {
      type: Object,
      default: {},
    },
    category: {
      type: String,
      required: [true, "Post category is required"],
      default: "All",
    },
    commission: {
      type: Number,
      default: 0,
    },
    price: {
      type: Number,
      require: [true, "Please add a Price"],
    },
    // --- Auction fields ---
    startingBid: { type: Number, default: 0 },
    minBidIncrement: { type: Number, default: 1 },
    auctionStartAt: { type: Date, default: null },
    auctionEndAt: { type: Date, default: null },
    snipingExtensionSeconds: { type: Number, default: 0 },
    biddingStatus: {
      type: String,
      enum: ["scheduled", "live", "ended"],
      default: "scheduled",
    },
    currentBid: { type: Number, default: 0 },
    currentHighBidder: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    height: {
      type: Number,
    },
    lengthpic: {
      type: Number,
    },
    width: {
      type: Number,
    },
    mediumused: {
      type: String,
    },
    weigth: {
      type: Number,
    },
    isverify: {
      type: Boolean,
      default: false,
    },
    isSoldout: {
      type: Boolean,
      default: false,
    },
    soldTo: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    soldPrice: { type: Number, default: 0 },
  },
  { timestamps: true }
);
// Helpful indexes for auction scheduling/queries
productSchema.index({ auctionStartAt: 1 });
productSchema.index({ auctionEndAt: 1 });

const product = mongoose.model("Product", productSchema);
module.exports = product;
