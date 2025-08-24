import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import axios from "axios";
import { getSocket } from "../../utils/socket";

const fmt = (ms) => {
  if (!ms || ms <= 0) return "00:00:00";
  const total = Math.floor(ms / 1000);
  const h = String(Math.floor(total / 3600)).padStart(2, "0");
  const m = String(Math.floor((total % 3600) / 60)).padStart(2, "0");
  const s = String(total % 60).padStart(2, "0");
  return `${h}:${m}:${s}`;
};

export default function LiveRoom() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [product, setProduct] = useState(null);
  const [auction, setAuction] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [placing, setPlacing] = useState(false);
  const [error, setError] = useState("");
  const [finalSeconds, setFinalSeconds] = useState(null);
  const [winner, setWinner] = useState(null);
  const [bidValue, setBidValue] = useState(0);
  const [nowTs, setNowTs] = useState(Date.now());

  const minInc = useMemo(() => product?.minBidIncrement ?? 1, [product]);
  const currentBid = useMemo(() => auction?.currentBid ?? product?.currentBid ?? product?.startingBid ?? 0, [auction, product]);
  const startAt = useMemo(() => (auction?.auctionStartAt ? new Date(auction.auctionStartAt) : (product?.auctionStartAt ? new Date(product.auctionStartAt) : null)), [auction, product]);
  const endAt = useMemo(() => (auction?.auctionEndAt ? new Date(auction.auctionEndAt) : (product?.auctionEndAt ? new Date(product.auctionEndAt) : null)), [auction, product]);
  const isLiveLocal = useMemo(() => {
    const now = new Date();
    if (auction?.biddingStatus === 'ended') return false;
    if (startAt && now < startAt) return false;
    if (endAt && now >= endAt) return false;
    // If we have no times, fallback to server status
    return !!startAt || (auction?.biddingStatus === 'live');
  }, [auction, startAt, endAt]);
  const minAllowed = useMemo(() => Number(currentBid || 0) + Number(minInc || 1), [currentBid, minInc]);

  // On product load, default bid to starting bid
  useEffect(() => {
    if (product) {
      setBidValue(Number(product.startingBid || 0));
    }
  }, [product]);

  // When current bid updates, move default to current bid + 1 (or min increment)
  useEffect(() => {
    const inc = Number(minInc || 1);
    const cb = Number(currentBid || 0);
    // Only bump if there is a live/current bid >= starting
    if (!isNaN(cb)) {
      setBidValue(cb + inc);
    }
  }, [currentBid, minInc]);

  useEffect(() => {
    let mounted = true;
    // ticking clock for Ends in
    const tick = setInterval(() => setNowTs(Date.now()), 1000);
    (async () => {
      try {
        // current user
        try {
          const resU = await axios.get("http://localhost:5000/api/users/getuser", { withCredentials: true });
          if (mounted) setUser(resU.data);
        } catch (_) {}
        // product
        const resP = await axios.get(`http://localhost:5000/api/product/${id}`);
        if (mounted) setProduct(resP.data);
        // initial auction state + history
        try {
          const s = await axios.get(`http://localhost:5000/api/bidding/state/${id}`);
          if (mounted) {
            setAuction(s.data);
            setHistory(s.data?.lastBids || []);
            if (s.data?.winner) setWinner(s.data.winner);
          }
        } catch (_) {}
      } catch (e) {
        console.error(e);
        setError("Failed to load live room");
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; clearInterval(tick); };
  }, [id]);

  useEffect(() => {
    const socket = getSocket();
    if (!socket || !id) return;

    const onState = (payload) => {
      if (payload?.productId !== id) return;
      setAuction(payload);
      if (payload?.lastBids) setHistory(payload.lastBids);
      if (payload?.winner) setWinner(payload.winner);
    };
    const onAccepted = ({ productId, currentBid, highBidder, auctionEndAt, bid }) => {
      if (productId !== id) return;
      setAuction((prev) => ({ ...(prev || {}), currentBid, currentHighBidder: highBidder, auctionEndAt }));
      if (bid) setHistory((h) => [{ id: bid._id || Math.random(), price: bid.price, user: bid.user, at: bid.createdAt || new Date() }, ...(h || [])].slice(0, 50));
    };
    const onEnded = (result) => {
      const productId = result?.product?._id || result?.productId;
      if (productId !== id) return;
      setAuction((prev) => ({ ...(prev || {}), biddingStatus: 'ended', soldPrice: result?.soldPrice ?? prev?.soldPrice }));
      if (result?.winner) setWinner(result.winner);
      setFinalSeconds(null);
    };
    const onJoinRejected = (payload) => {
      if (payload?.error) setError(payload.error);
    };
    const onFinalCountdown = ({ productId, seconds }) => {
      if (productId !== id) return;
      setFinalSeconds(seconds);
    };

    socket.emit('auction:join', { productId: id }, (ack) => {
      if (ack && ack.ok === false) {
        setError(ack.error || 'Unable to join room');
      }
    });
    socket.on('auction:state', onState);
    socket.on('bid:accepted', onAccepted);
    socket.on('auction:ended', onEnded);
    socket.on('auction:join-rejected', onJoinRejected);
    socket.on('auction:final-countdown', onFinalCountdown);

    return () => {
      socket.emit('auction:leave', { productId: id });
      socket.off('auction:state', onState);
      socket.off('bid:accepted', onAccepted);
      socket.off('auction:ended', onEnded);
      socket.off('auction:join-rejected', onJoinRejected);
      socket.off('auction:final-countdown', onFinalCountdown);
    };
  }, [id]);

  const placeBid = async () => {
    setError("");
    if (!user) return setError("You must be logged in");
    const offer = Number(bidValue || 0);
    if (offer < minAllowed) return setError(`Your bid must be at least ${minAllowed}`);
    if ((user.balance ?? 0) < offer) return setError("Insufficient balance");
    setPlacing(true);
    try {
      const socket = getSocket();
      await new Promise((resolve, reject) => {
        socket.emit('bid:place', { productId: id, price: offer }, (ack) => {
          if (!ack?.ok) return reject(new Error(ack?.error || 'Bid rejected'));
          resolve();
        });
      });
    } catch (e) {
      setError(e.message || "Failed to place bid");
    } finally {
      setPlacing(false);
    }
  };

  if (loading) return <div className="px-4 md:px-10 py-10 text-white">Loading live room…</div>;
  if (!product) return <div className="px-4 md:px-10 py-10 text-white">Product not found</div>;

  const remainingMs = endAt ? (endAt.getTime() - nowTs) : null;
  const remaining = remainingMs !== null ? fmt(remainingMs) : "--:--:--";
  // Only show final countdown when server emits it (last 10s or inactivity-case)
  const displayFinalSeconds = (auction?.biddingStatus !== 'ended') ? (finalSeconds ?? null) : null;

  return (
    <div className="px-4 md:px-10 py-6 bg-black text-white min-h-screen">
      <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2">
          {product.image?.filePath && (
            <img src={product.image.filePath} alt={product.title} className="w-full h-auto rounded-lg" />
          )}
          <div className="mt-3 flex items-center gap-3">
            <span className="text-sm bg-gray-800 px-3 py-1 rounded flex items-center gap-2">
              <span>Ends in {remaining}</span>
              {displayFinalSeconds !== null && (
                <span className="bg-red-600/80 text-white font-semibold px-2 py-0.5 rounded">Final {displayFinalSeconds}s</span>
              )}
            </span>
            {isLiveLocal && <span className="w-2 h-2 bg-red-400 rounded-full animate-pulse" />}
            {auction?.biddingStatus === 'ended' && <span className="text-red-400">Auction ended</span>}
          </div>
          <h1 className="text-xl md:text-3xl font-bold mt-3">{product.title}</h1>
          <p className="text-gray-300 mt-1">{product.description}</p>

          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-gray-900 rounded p-4">
              <div className="text-gray-400 text-sm">Starting bid</div>
              <div className="text-xl">{product.startingBid ?? 0}</div>
            </div>
            <div className="bg-gray-900 rounded p-4">
              <div className="text-gray-400 text-sm">Current bid</div>
              <div className="text-xl">{currentBid ?? 0}</div>
            </div>
          </div>

          <div className="mt-6">
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              <input
                type="number"
                className="bg-gray-800 text-white px-3 py-2 rounded border border-gray-700 w-full sm:w-40"
                value={bidValue}
                onChange={(e)=> setBidValue(Number(e.target.value))}
                min={0}
              />
              <button
                className="bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white px-6 py-2 rounded w-full sm:w-auto"
                disabled={
                  !isLiveLocal ||
                  placing ||
                  (Number(bidValue || 0) < minAllowed) ||
                  (user && (user.balance ?? 0) < Number(bidValue || 0))
                }
                onClick={placeBid}
              >
                {placing ? 'Placing…' : 'Place bid'}
              </button>
              {user && <div className="text-sm text-gray-300">Balance: {user.balance ?? 0}</div>}
            </div>
            <div className="text-xs text-gray-400 mt-1">Minimum allowed: {minAllowed}</div>
            {error && <div className="text-red-400 mt-2 text-sm">{error}</div>}
          </div>
        </div>

        <div className="md:col-span-1 space-y-4">
          <div className="bg-gray-900 rounded p-4">
            <div className="font-semibold mb-2">Result</div>
            {auction?.biddingStatus === 'ended' ? (
              <div className="text-green-400 text-sm">
                Winner: <span className="font-semibold">{winner?.name || auction?.currentHighBidder?.name || '—'}</span>
              </div>
            ) : (
              <div className="text-gray-400 text-sm">Auction running…</div>
            )}
          </div>

          <div className="bg-gray-900 rounded p-4">
            <div className="font-semibold mb-2">Bidding history</div>
            <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-2">
              {(history || []).map((b) => (
                <div key={b.id} className="flex justify-between text-sm bg-gray-800 px-3 py-2 rounded">
                  <div className="truncate mr-2">{b.user?.name || b.user?.id || 'User'}</div>
                  <div>${b.price}</div>
                </div>
              ))}
              {!history?.length && <div className="text-gray-400 text-sm">No bids yet.</div>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
