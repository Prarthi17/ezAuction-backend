const mongoose = require("mongoose");
const Product = require("../models/productModel");
const BiddingProduct = require("../models/biddingProductModel");
const User = require("../models/userModel");

function now() { return new Date(); }

async function placeBidTransactional({ userId, productId, price }) {
  async function perform(useTxn) {
    const session = await mongoose.startSession();
    try {
      if (useTxn) session.startTransaction();

      const productQuery = Product.findById(productId).populate("user");
      const product = useTxn ? await productQuery.session(session) : await productQuery;
      if (!product) throw new Error("Product not found");

      if (!product.isverify) throw new Error("Bidding is not verified for this product.");
      if (product.isSoldout || product.biddingStatus === "ended") throw new Error("Bidding is closed for this product.");

      const t = now();
      if (!product.auctionStartAt || !product.auctionEndAt) throw new Error("Auction window not configured.");
      if (t < product.auctionStartAt) throw new Error("Auction has not started yet.");
      if (t >= product.auctionEndAt) throw new Error("Auction already ended.");

      let highestQuery = BiddingProduct
        .findOne({ product: productId })
        .sort({ price: -1 });
      const highest = useTxn ? await highestQuery.session(session) : await highestQuery;

      const floor = Math.max(product.startingBid || 0, product.price || 0, product.currentBid || 0);

      const requiredMin = highest
        ? highest.price + (product.minBidIncrement || 1)
        : floor + (product.minBidIncrement || 1);

      if (price < requiredMin) {
        throw new Error(`Your bid must be at least ${requiredMin}.`);
      }

      // Upsert user's bid (one row per user+product)
      let userBidQuery = BiddingProduct.findOne({ user: userId, product: productId });
      let userBid = useTxn ? await userBidQuery.session(session) : await userBidQuery;
      if (userBid) {
        if (price <= userBid.price) throw new Error("Your new bid must be higher than your previous bid.");
        userBid.price = price;
        if (useTxn) {
          await userBid.save({ session });
        } else {
          await userBid.save();
        }
      } else {
        if (useTxn) {
          userBid = await BiddingProduct.create([
            {
              user: userId,
              product: productId,
              price
            }
          ], { session });
          userBid = userBid[0];
        } else {
          userBid = await BiddingProduct.create({ user: userId, product: productId, price });
        }
      }

      // Anti-sniping extension
      if (product.snipingExtensionSeconds > 0) {
        const secondsLeft = Math.floor((product.auctionEndAt.getTime() - t.getTime()) / 1000);
        if (secondsLeft > 0 && secondsLeft <= product.snipingExtensionSeconds) {
          product.auctionEndAt = new Date(product.auctionEndAt.getTime() + (product.snipingExtensionSeconds * 1000));
        }
      }

      product.currentBid = price;
      product.currentHighBidder = userId;
      product.biddingStatus = "live";
      if (useTxn) {
        await product.save({ session });
      } else {
        await product.save();
      }

      if (useTxn) await session.commitTransaction();
      session.endSession();

      return {
        ok: true,
        product: {
          id: product._id,
          currentBid: product.currentBid,
          currentHighBidder: product.currentHighBidder,
          auctionEndAt: product.auctionEndAt,
          biddingStatus: product.biddingStatus,
        },
        bid: { id: userBid._id, price: userBid.price, user: userId, product: productId }
      };
    } catch (err) {
      try {
        if (useTxn) await session.abortTransaction();
      } catch (_) {}
      session.endSession();
      throw err;
    }
  }

  try {
    return await perform(true);
  } catch (err) {
    const msg = String(err && err.message || err || "");
    const txnUnsupported = msg.includes("Transaction numbers are only allowed") || msg.includes("replica set") || msg.includes("not supported");
    if (txnUnsupported) {
      try {
        return await perform(false);
      } catch (e2) {
        return { ok: false, error: e2.message };
      }
    }
    return { ok: false, error: msg };
  }
}

async function finalizeAuction(productId) {
  const product = await Product.findById(productId).populate("user");
  if (!product || product.biddingStatus === "ended") return null;

  const top = await BiddingProduct.findOne({ product: productId }).sort({ price: -1 }).populate("user");
  product.biddingStatus = "ended";

  let admin, seller, buyer, commissionAmount = 0, finalPrice = 0;
  if (top) {
    const commissionRate = product.commission || 0;
    commissionAmount = (commissionRate / 100) * top.price;
    finalPrice = top.price - commissionAmount;

    product.isSoldout = true;
    product.soldTo = top.user._id;
    // Displayed sold price should be the highest bid (gross)
    product.soldPrice = top.price;

    // Update balances
    admin = await User.findOne({ role: "admin" });
    if (admin) {
      admin.commissionBalance = (admin.commissionBalance || 0) + commissionAmount;
      admin.balance = (admin.balance || 0) + commissionAmount;
      await admin.save();
      try {
        console.log("Admin commission applied", {
          adminId: String(admin._id),
          commissionAmount,
          adminBalance: admin.balance,
          adminCommissionBalance: admin.commissionBalance,
        });
      } catch (_) {}
    }
    else {
      console.warn("No admin user found; commission not credited", { commissionAmount });
    }

    seller = await User.findById(product.user._id);
    if (seller) {
      seller.balance = (seller.balance || 0) + finalPrice;
      await seller.save();
    }

    buyer = await User.findById(top.user._id);
    if (buyer) {
      buyer.balance = Math.max(0, (buyer.balance || 0) - top.price);
      await buyer.save();
    }
  }

  await product.save();

  // Emails (Mailtrap via sendEmail util)
  try {
    if (top && top.user?.email) {
      const sendEmail = require("../utils/sendEmail");
      await sendEmail({
        email: top.user.email,
        subject: "You won the auction!",
        message: `Congratulations! You won \"${product.title}\" for $${top.price}.`,
      });
    }
    if (product?.user?._id) {
      const sendEmail = require("../utils/sendEmail");
      const sellerUser = seller || await User.findById(product.user._id);
      if (sellerUser?.email) {
        await sendEmail({
          email: sellerUser.email,
          subject: "Your product has been sold",
          message: `Your product \"${product.title}\" has been sold. Highest bid: $${top ? top.price : 0}. Commission: $${commissionAmount.toFixed(2)}. Net credited: $${finalPrice.toFixed(2)}. Winner: ${top?.user?.name || ''} ${top?.user?.email || ''}.`,
        });
      }
    }
  } catch (e) {
    // log only
    console.warn("Email send failed:", e.message);
  }

  return {
    productId,
    hasWinner: !!top,
    winner: top ? { id: top.user._id, email: top.user.email, name: top.user.name, price: top.price } : null,
    soldPrice: product.soldPrice || 0
  };
}

module.exports = {
  placeBidTransactional,
  finalizeAuction,
};