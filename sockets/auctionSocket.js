const jwt = require("jsonwebtoken");
const Product = require("../models/productModel");
const BiddingProduct = require("../models/biddingProductModel");
const User = require("../models/userModel");
const { placeBidTransactional, finalizeAuction } = require("../services/auctionService");

// Helper to pull userId from cookie or auth payload
function getUserIdFromSocket(socket) {
  try {
    const token = socket.handshake.auth?.token
      || socket.handshake.headers?.cookie?.split(";").map(s => s.trim()).find(c => c.startsWith("token="))?.split("=")[1];

    if (!token) return null;
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    return decoded.id;
  } catch (_) {
    return null;
  }
}

function installAuctionSocket(io) {
  // Track per-product timers
  const inactivityTimers = new Map(); // productId -> timeout
  const finalCountdownIntervals = new Map(); // productId -> interval
  const finalCountdownTimers = new Map(); // productId -> timeout to start countdown

  // Utility: emit current state to a room
  async function emitState(productId) {
    const product = await Product.findById(productId).populate("currentHighBidder").populate("soldTo");
    const history = await BiddingProduct.find({ product: productId }).sort({ createdAt: -1 }).limit(20).populate("user");
    const payload = {
      productId,
      biddingStatus: product?.biddingStatus,
      auctionStartAt: product?.auctionStartAt,
      auctionEndAt: product?.auctionEndAt,
      currentBid: product?.currentBid || 0,
      currentHighBidder: product?.currentHighBidder ? {
        id: product.currentHighBidder._id,
        name: product.currentHighBidder.name
      } : null,
      lastBids: history.map(b => ({
        id: b._id, price: b.price, user: { id: b.user._id, name: b.user.name }, at: b.createdAt
      })),
    };
    if (product?.biddingStatus === 'ended') {
      if (product?.soldTo) payload.winner = { id: product.soldTo._id, name: product.soldTo.name };
      payload.soldPrice = product?.soldPrice || 0;
    }
    io.to(`product:${productId}`).emit("auction:state", payload);
  }

  // Schedule start/end for a product
  function scheduleAuction(product) {
    const now = Date.now();

    // Start
    if (product.auctionStartAt && product.biddingStatus === "scheduled") {
      const ms = product.auctionStartAt.getTime() - now;
      if (ms <= 0) {
        product.biddingStatus = "live";
        product.save().then(() => {
          io.to(`product:${product._id}`).emit("auction:started", { productId: product._id, at: new Date() });
          emitState(product._id);
        });
      } else {
        setTimeout(async () => {
          const fresh = await Product.findById(product._id);
          if (fresh && fresh.biddingStatus !== "ended") {
            fresh.biddingStatus = "live";
            await fresh.save();
            io.to(`product:${product._id}`).emit("auction:started", { productId: product._id, at: new Date() });
            emitState(product._id);
          }
        }, ms);
      }
    }

    // End
    if (product.auctionEndAt && product.biddingStatus !== "ended") {
      const msEnd = product.auctionEndAt.getTime() - now;
      if (msEnd > 0) {
        // Start 10-second final countdown before end
        const msToFinal = Math.max(0, msEnd - 10000);
        const startFinal = () => startFinalCountdown(String(product._id), { seconds: 10, override: true });
        const t = setTimeout(startFinal, msToFinal);
        finalCountdownTimers.set(String(product._id), t);

        setTimeout(async () => {
          await finalizeAndCleanup(String(product._id));
        }, msEnd);
      } else {
        // Already past end => finalize immediately (server restart scenario)
        finalizeAndCleanup(String(product._id));
      }
    }
  }

  // Start a server-driven countdown ticker for a product (default 10s). If override is true, replace any running countdown.
  function startFinalCountdown(productId, opts = {}) {
    const secondsStart = typeof opts.seconds === 'number' ? Math.max(0, Math.floor(opts.seconds)) : 10;
    const override = !!opts.override;
    if (finalCountdownIntervals.has(productId)) {
      if (!override) return; // already running; do not replace
      // override: clear existing
      try { clearInterval(finalCountdownIntervals.get(productId)); } catch (_) {}
      finalCountdownIntervals.delete(productId);
    }
    let seconds = secondsStart;
    io.to(`product:${productId}`).emit("auction:final-countdown", { productId, seconds });
    const interval = setInterval(() => {
      seconds -= 1;
      if (seconds <= 0) {
        clearInterval(interval);
        finalCountdownIntervals.delete(productId);
        return;
      }
      io.to(`product:${productId}`).emit("auction:final-countdown", { productId, seconds });
    }, 1000);
    finalCountdownIntervals.set(productId, interval);
  }

  async function finalizeAndCleanup(productId) {
    // Clear all timers for this product
    const t = inactivityTimers.get(productId);
    if (t) { clearTimeout(t); inactivityTimers.delete(productId); }
    const ft = finalCountdownTimers.get(productId);
    if (ft) { clearTimeout(ft); finalCountdownTimers.delete(productId); }
    const fi = finalCountdownIntervals.get(productId);
    if (fi) { clearInterval(fi); finalCountdownIntervals.delete(productId); }
    const result = await finalizeAuction(productId);
    if (result) io.to(`product:${productId}`).emit("auction:ended", result);
  }

  // On every (re)start, attach schedules for all active/scheduled auctions
  async function bootstrapSchedules() {
    const active = await Product.find({
      biddingStatus: { $in: ["scheduled", "live"] },
      auctionEndAt: { $ne: null }
    });
    active.forEach(scheduleAuction);
  }

  io.on("connection", (socket) => {
    const userId = getUserIdFromSocket(socket);

    socket.on("auction:join", async ({ productId }, ack) => {
      try {
        // Room capacity check
        const roomName = `product:${productId}`;
        const room = socket.adapter.rooms.get(roomName);
        const size = room ? room.size : 0;
        if (size >= 5) {
          const payload = { ok: false, error: "Room is full (max 5 participants)" };
          if (ack) return ack(payload);
          return socket.emit("auction:join-rejected", payload);
        }

        // Balance check (buyers must have at least starting bid to join). Bidding-time checks still enforce >= offer.
        if (userId) {
          const [user, product] = await Promise.all([
            User.findById(userId).select("balance role"),
            Product.findById(productId).select("startingBid biddingStatus")
          ]);
          if (user && user.role === 'buyer' && product) {
            const threshold = Number(product.startingBid || 0);
            if (Number(user.balance || 0) < threshold) {
              const payload = { ok: false, error: "Insufficient balance to join" };
              if (ack) return ack(payload);
              return socket.emit("auction:join-rejected", payload);
            }
          }
        }

        socket.join(roomName);
        if (ack) ack({ ok: true });
        await emitState(productId);
      } catch (err) {
        const payload = { ok: false, error: err.message };
        if (ack) return ack(payload);
        socket.emit("auction:join-rejected", payload);
      }
    });

    socket.on("auction:leave", ({ productId }) => {
      socket.leave(`product:${productId}`);
    });

    socket.on("bid:place", async (payload, ack) => {
      try {
        if (!userId) throw new Error("Unauthorized");
        const { productId, price } = payload || {};
        if (!productId || typeof price !== "number") throw new Error("Invalid payload");
        // Basic product state and balance guards
        const [user, product] = await Promise.all([
          User.findById(userId).select("balance"),
          Product.findById(productId).select("biddingStatus currentBid minBidIncrement startingBid auctionStartAt auctionEndAt")
        ]);
        if (!product) throw new Error("Product not found");
        const nowTs = Date.now();
        const startTs = product.auctionStartAt ? product.auctionStartAt.getTime() : null;
        const endTs = product.auctionEndAt ? product.auctionEndAt.getTime() : null;
        if (startTs && nowTs < startTs) throw new Error("Auction has not started yet");
        if (endTs && nowTs >= endTs) throw new Error("Auction already ended");
        const minInc = Number(product.minBidIncrement || 1);
        const mustBeAtLeast = Number((product.currentBid || product.startingBid || 0) + minInc);
        if (price < mustBeAtLeast) throw new Error("Bid below minimum increment");
        if (!user || (user.balance || 0) < price) throw new Error("Insufficient balance");

        // Determine if we are in the final 10s window
        const endTsEval = product.auctionEndAt ? product.auctionEndAt.getTime() : nowTs;
        const secondsLeft = Math.floor((endTsEval - nowTs) / 1000);

        const result = await placeBidTransactional({ userId, productId, price });
        if (!result.ok) {
          if (ack) ack({ ok: false, error: result.error });
          socket.emit("bid:rejected", { productId, error: result.error });
          return;
        }

        // Broadcast to all in room
        io.to(`product:${productId}`).emit("bid:accepted", {
          productId,
          currentBid: result.product.currentBid,
          highBidder: result.product.currentHighBidder,
          auctionEndAt: result.product.auctionEndAt,
          bid: result.bid,
        });

        // Also send refreshed state
        await emitState(productId);

        // Reset inactivity 60s timer
        const prev = inactivityTimers.get(productId);
        if (prev) clearTimeout(prev);
        const timer = setTimeout(async () => {
          // Start final 10s countdown (override any running long countdown)
          startFinalCountdown(productId, { seconds: 10, override: true });
          // After 10s, finalize (if not already)
          setTimeout(async () => {
            await finalizeAndCleanup(productId);
          }, 10000);
        }, 60000);
        inactivityTimers.set(productId, timer);

        // If in final 10 seconds (<=10), immediately finalize to this bidder
        if (secondsLeft <= 10 && secondsLeft >= 0) {
          await finalizeAndCleanup(productId);
        }

        if (ack) ack({ ok: true });
      } catch (err) {
        if (ack) ack({ ok: false, error: err.message });
        socket.emit("bid:rejected", { error: err.message });
      }
    });
  });

  // Kick off schedules
  bootstrapSchedules().catch(console.error);

  return { scheduleAuction };
}

module.exports = { installAuctionSocket };
