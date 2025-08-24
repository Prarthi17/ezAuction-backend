import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { getSocket } from "../../utils/socket";

function AllProducts({ onlyLiveUpcoming = false, title = "Available Products" }) {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [auctionMap, setAuctionMap] = useState({}); // productId -> state
  const socketRef = useRef(null);
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const isAdmin = (user?.role || "").toLowerCase() === "admin";

  const categoryCommission = (cat) => {
    switch ((cat || '').toLowerCase()) {
      case 'jewelry': return 20;
      case 'gems': return 25;
      case 'paintings':
      case 'antiques': return 15;
      case 'car':
      case 'bike': return 30;
      default: return 0;
    }
  };

  // helper to format remaining ms
  const fmt = (ms) => {
    if (ms <= 0) return "00:00:00";
    const totalSec = Math.floor(ms / 1000);
    const h = String(Math.floor(totalSec / 3600)).padStart(2, "0");
    const m = String(Math.floor((totalSec % 3600) / 60)).padStart(2, "0");
    const s = String(totalSec % 60).padStart(2, "0");
    return `${h}:${m}:${s}`;
  };

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        // get current user for role-based filtering
        try {
          const u = await axios.get("http://localhost:5000/api/users/getuser", { withCredentials: true });
          setUser(u.data?.data || u.data || null);
        } catch (_) {}

        const res = await axios.get("http://localhost:5000/api/product");
        // show all products to all roles
        const list = res.data || [];
        setProducts(list);
        // Prime auction state via REST for each product
        const states = await Promise.all(
          (res.data || []).map(async (p) => {
            try {
              const sres = await axios.get(`http://localhost:5000/api/bidding/state/${p._id}`);
              return { id: p._id, state: sres.data };
            } catch (_) {
              return { id: p._id, state: null };
            }
          })
        );
        const initialMap = {};
        states.forEach(({ id, state }) => { if (state) initialMap[id] = state; });
        setAuctionMap(initialMap);
      } catch (error) {
        console.error("Error fetching products:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
    // re-run when role loaded to refilter
  }, [user?.role]);

  // Connect sockets and join product rooms when products list is loaded
  useEffect(() => {
    if (!products.length) return;
    let mounted = true;
    let joinedIds = new Set();
    const socket = getSocket();
    if (!mounted || !socket) return;
    socketRef.current = socket;

      const onState = (payload) => {
        const { productId } = payload || {};
        if (!productId) return;
        setAuctionMap((prev) => ({ ...prev, [productId]: payload }));
      };
      const onStarted = ({ productId }) => {
        setAuctionMap((prev) => ({
          ...prev,
          [productId]: { ...(prev[productId] || {}), biddingStatus: "live" },
        }));
      };
      const onEnded = (result) => {
        const productId = result?.product?._id || result?.productId;
        if (!productId) return;
        setAuctionMap((prev) => ({
          ...prev,
          [productId]: { ...(prev[productId] || {}), biddingStatus: "ended" },
        }));
      };
      const onBidAccepted = ({ productId, currentBid, highBidder, auctionEndAt }) => {
        setAuctionMap((prev) => ({
          ...prev,
          [productId]: {
            ...(prev[productId] || {}),
            productId,
            currentBid,
            currentHighBidder: highBidder || prev[productId]?.currentHighBidder || null,
            auctionEndAt: auctionEndAt || prev[productId]?.auctionEndAt || null,
          },
        }));
      };

      socket.on("auction:state", onState);
      socket.on("auction:started", onStarted);
      socket.on("auction:ended", onEnded);
      socket.on("bid:accepted", onBidAccepted);

      // Join rooms
      products.forEach((p) => {
        if (!joinedIds.has(p._id)) {
          socket.emit("auction:join", { productId: p._id });
          joinedIds.add(p._id);
        }
      });

      return () => {
        socket.off("auction:state", onState);
        socket.off("auction:started", onStarted);
        socket.off("auction:ended", onEnded);
        socket.off("bid:accepted", onBidAccepted);
        products.forEach((p) => socket.emit("auction:leave", { productId: p._id }));
      };

    return () => { mounted = false; };
  }, [products]);

  // tick every second to refresh countdowns
  useEffect(() => {
    const t = setInterval(() => {
      // trigger re-render by updating a dummy state via auctionMap clone
      setAuctionMap((prev) => ({ ...prev }));
    }, 1000);
    return () => clearInterval(t);
  }, []);

  const role = (user?.role || '').toLowerCase();
  const isBuyer = role === 'buyer' || role === 'user' || !role;
  const isSeller = role === 'seller';
  // isAdmin already computed above

  // derive filtered list if onlyLiveUpcoming is true
  const filteredProducts = useMemo(() => {
    if (!onlyLiveUpcoming) return products;
    const now = new Date();
    return products.filter((product) => {
      const a = auctionMap[product._id];
      const status = a?.biddingStatus || "";
      const startAt = a?.auctionStartAt ? new Date(a.auctionStartAt) : null;
      const endAt = a?.auctionEndAt ? new Date(a.auctionEndAt) : null;
      // upcoming: explicitly scheduled and in future
      const upcoming = status === 'scheduled' && !!startAt && startAt > now;
      // live: status live OR local within window
      const liveLocal = (
        (!!startAt ? now >= startAt : status === 'live') &&
        (!!endAt ? now < endAt : true) &&
        status !== 'ended'
      );
      return upcoming || liveLocal || status === 'live';
    });
  }, [onlyLiveUpcoming, products, auctionMap]);

  return (
    <div className="px-4 md:px-10 py-10 bg-black text-white">
      <h2 className="text-2xl md:text-3xl font-bold mb-6">{title}</h2>

      {loading ? (
        <p>Loading products...</p>
      ) : (onlyLiveUpcoming ? filteredProducts.length === 0 : products.length === 0) ? (
        <p>No products available.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
          {(onlyLiveUpcoming ? filteredProducts : products).map((product) => {
            const a = auctionMap[product._id];
            let status = a?.biddingStatus || "";
            const startAt = a?.auctionStartAt ? new Date(a.auctionStartAt) : null;
            const endAt = a?.auctionEndAt ? new Date(a.auctionEndAt) : null;
            const now = new Date();
            let label = "";
            let remaining = "--:--:--";
            if (status === "scheduled" && startAt) {
              remaining = fmt(startAt.getTime() - now.getTime());
              // if countdown hit 00:00:00 make live immediately
              if (remaining === "00:00:00") {
                status = "live";
              } else {
                label = `Starts in ${remaining}`;
              }
            }
            if (status === "live" && endAt) {
              remaining = fmt(endAt.getTime() - now.getTime());
              label = `Ends in ${remaining}`;
            } else if (status === "ended") {
              label = "Auction ended";
            }
            // Prefer seller's real price; safely parse and fallback to biddingPrice if needed
            const parsedPrice = product?.price !== undefined && product?.price !== null && product?.price !== ""
              ? Number(product.price) : NaN;
            const displayPrice = Number.isFinite(parsedPrice) && parsedPrice > 0
              ? parsedPrice
              : (Number(product?.biddingPrice) || 0);

            const isLive = status === 'live';
            const isEnded = status === 'ended';
            return (
            <div
              key={product._id}
              className="bg-gray-800 p-4 rounded-lg shadow-lg transition-transform transform hover:scale-105 hover:shadow-2xl cursor-pointer"
              role="button"
              tabIndex={0}
              onKeyDown={(e)=>{ if(e.key==='Enter' || e.key===' ') navigate(`/product/${product._id}`); }}
              onClick={() => navigate(`/product/${product._id}`)}
            >
              {product.image?.filePath && (
                <img
                  src={product.image.filePath}
                  alt={product.title}
                  className="w-full h-56 object-cover rounded-md mb-4"
                />
              )}
              <h3 className="text-xl font-semibold text-white">{product.title}</h3>
              <p className="text-gray-400">{product.description}</p>
              <div className="mt-2 flex items-center justify-between">
                <p className="font-bold text-purple-400">${displayPrice}</p>
                {isLive ? (
                  <span className="text-xs px-2 py-1 rounded bg-red-700 flex items-center gap-1">
                    <span className="w-2 h-2 bg-red-300 rounded-full animate-pulse" /> Live
                  </span>
                ) : (
                  <span className={`text-xs px-2 py-1 rounded ${status === 'scheduled' ? 'bg-yellow-700' : 'bg-gray-700'}`}>
                    {label || 'No auction info'}
                  </span>
                )}
              </div>
              {isAdmin && !product.isverify && (
                <div className="mt-2">
                  <button
                    className="px-3 py-1 text-sm rounded bg-green-700 hover:bg-green-800"
                    onClick={async (e) => {
                      e.stopPropagation();
                      try {
                        const commission = categoryCommission(product.category);
                        await axios.patch(`http://localhost:5000/api/product/admin/product-verified/${product._id}`,
                          { commission }, { withCredentials: true });
                        setProducts((prev) => prev.map(p => p._id === product._id ? { ...p, isverify: true, commission } : p));
                      } catch (err) {
                        console.error(err);
                      }
                    }}
                  >
                    Verify (Commission {categoryCommission(product.category)}%)
                  </button>
                </div>
              )}
              <p className="text-gray-500 text-sm mt-1">Total Bids: {product.totalBids || 0}</p>

              <div className="mt-3">
                {isBuyer ? (
                  <button
                    className={`w-full px-4 py-2 rounded text-white ${isLive ? 'bg-blue-600 hover:bg-blue-700' : isEnded ? 'bg-gray-600 cursor-not-allowed' : 'bg-yellow-700 cursor-not-allowed'}`}
                    disabled={!isLive}
                    onClick={(e) => { e.stopPropagation(); if (isLive) navigate(`/live/${product._id}`); }}
                  >
                    {isEnded ? 'Ended' : isLive ? 'Join' : (label || 'Waiting')}
                  </button>
                ) : (
                  <div className="flex gap-2">
                    <button
                      className="flex-1 px-4 py-2 rounded bg-indigo-700 hover:bg-indigo-800 text-white"
                      onClick={(e)=>{ e.stopPropagation(); navigate(`/product/${product._id}`); }}
                    >
                      Manage
                    </button>
                    {(isAdmin || (isSeller && ((product?.user?._id && product.user._id === user?._id) || (product?.user && product.user === user?._id)))) && (
                      <button
                        className="px-4 py-2 rounded bg-red-700 hover:bg-red-800 text-white"
                        onClick={async (e)=>{
                          e.stopPropagation();
                          if (!confirm('Delete this product?')) return;
                          try {
                            await axios.delete(`http://localhost:5000/api/product/${product._id}`, { withCredentials: true });
                            setProducts(prev => prev.filter(p => p._id !== product._id));
                          } catch (err) {
                            console.error(err);
                            alert('Failed to delete');
                          }
                        }}
                      >
                        Delete
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default AllProducts;
