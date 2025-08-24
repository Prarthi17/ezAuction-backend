import React, { useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import { useNavigate, useLocation } from "react-router-dom";
import { getSocket } from "../../utils/socket";

function Room() {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [allRooms, setAllRooms] = useState([]);
  const [myRooms, setMyRooms] = useState([]);
  const [loadingRooms, setLoadingRooms] = useState(true);
  const [roomsError, setRoomsError] = useState(null);
  const [auctionMap, setAuctionMap] = useState({});
  const [selectedCategory, setSelectedCategory] = useState("All");

  const socketRef = useRef(null);
  const navigate = useNavigate();
  const location = useLocation();
  // search query from URL (?search=...)
  const searchQuery = useMemo(() => {
    const sp = new URLSearchParams(location.search);
    return (sp.get("search") || "").trim().toLowerCase();
  }, [location.search]);

  const [form, setForm] = useState({
    title: "",
    description: "",
    price: "",
    category: "",
    image: null,
    startingBid: "0",
    minBidIncrement: "1",
    auctionStartAt: "",
    auctionEndAt: "",
    snipingExtensionSeconds: "0",
    height: "",
    width: "",
  });
  const commissionByCategory = (cat) => {
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

  // Category filter: when a category is selected (not All), show ONLY that category
  const categoryFilterMatches = (p) => {
    const cat = (p?.category || "").toLowerCase();
    const sel = (selectedCategory || "All").toLowerCase();
    return sel === "all" ? true : cat === sel;
  };

  const searchMatches = (p) => {
    if (!searchQuery) return true;
    const t = (p?.title || "").toLowerCase();
    const d = (p?.description || "").toLowerCase();
    const c = (p?.category || "").toLowerCase();
    return t.includes(searchQuery) || d.includes(searchQuery) || c.includes(searchQuery);
  };

  const availableRoomsProcessed = useMemo(() => {
    return (allRooms || [])
      .filter(searchMatches)
      .filter(categoryFilterMatches);
  }, [allRooms, searchQuery, selectedCategory]);
  const [imagePreview, setImagePreview] = useState("");

  // preview cleanup on unmount
  useEffect(() => {
    return () => {
      if (imagePreview) URL.revokeObjectURL(imagePreview);
    };
  }, [imagePreview]);

  const fmt = (ms) => {
    if (ms <= 0) return "00:00:00";
    const totalSec = Math.floor(ms / 1000);
    const h = String(Math.floor(totalSec / 3600)).padStart(2, "0");
    const m = String(Math.floor((totalSec % 3600) / 60)).padStart(2, "0");
    const s = String(totalSec % 60).padStart(2, "0");
    return `${h}:${m}:${s}`;
  };

  useEffect(() => {
    // fetch user to know role
    (async () => {
      try {
        const res = await fetch("http://localhost:5000/api/users/getuser", { credentials: "include" });
        if (res.ok) {
          const u = await res.json();
          setUser(u);
          setRole(u?.role || null);
        }
      } catch (_) {}
    })();
  }, []);

  

  const fetchRooms = async () => {
    setLoadingRooms(true);
    setRoomsError(null);
    try {
      const [allRes, myRes] = await Promise.all([
        axios.get("http://localhost:5000/api/product"),
        axios
          .get("http://localhost:5000/api/product/user", { withCredentials: true })
          .catch(() => ({ data: [] })),
      ]);
      // show all rooms to all roles
      setAllRooms(allRes.data || []);
      setMyRooms(Array.isArray(myRes.data) ? myRes.data : []);

      const products = [
        ...(allRes.data || []),
        ...((Array.isArray(myRes.data) ? myRes.data : [])),
      ];
      const unique = Array.from(new Map(products.map((p) => [p._id, p])).values());
      const states = await Promise.all(
        unique.map(async (p) => {
          try {
            const sres = await axios.get(`http://localhost:5000/api/bidding/state/${p._id}`);
            return { id: p._id, state: sres.data };
          } catch (_) {
            return { id: p._id, state: null };
          }
        })
      );
      const initialMap = {};
      states.forEach(({ id, state }) => {
        if (state) initialMap[id] = state;
      });
      setAuctionMap(initialMap);
    } catch (err) {
      console.error(err);
      setRoomsError(err?.message || "Failed to load rooms");
    } finally {
      setLoadingRooms(false);
    }
  };

  useEffect(() => {
    fetchRooms();
  }, []);

  // socket join for all known rooms
  useEffect(() => {
    const socket = getSocket();
    socketRef.current = socket;
    if (!socket) return;

    const onState = (payload) => {
      const { productId } = payload || {};
      if (!productId) return;
      setAuctionMap((prev) => ({ ...prev, [productId]: payload }));
    };
    const onStarted = ({ productId }) => {
      setAuctionMap((prev) => ({ ...prev, [productId]: { ...(prev[productId] || {}), biddingStatus: "live" } }));
    };
    const onEnded = (result) => {
      const productId = result?.product?._id || result?.productId;
      if (!productId) return;
      setAuctionMap((prev) => ({ ...prev, [productId]: { ...(prev[productId] || {}), biddingStatus: "ended" } }));
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

    const allIds = Array.from(new Set([ ...allRooms, ...myRooms ].map(p => p._id)));
    allIds.forEach((id) => socket.emit("auction:join", { productId: id }));

    return () => {
      socket.off("auction:state", onState);
      socket.off("auction:started", onStarted);
      socket.off("auction:ended", onEnded);
      socket.off("bid:accepted", onBidAccepted);
      allIds.forEach((id) => socket.emit("auction:leave", { productId: id }));
    };
  }, [allRooms, myRooms]);

  // tick per second
  useEffect(() => {
    const t = setInterval(() => setAuctionMap((p) => ({ ...p })), 1000);
    return () => clearInterval(t);
  }, []);

  const submitCreate = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const fd = new FormData();
      Object.entries({
        title: form.title,
        description: form.description,
        price: form.price,
        category: form.category,
        height: form.height,
        width: form.width,
        startingBid: form.startingBid,
        minBidIncrement: form.minBidIncrement,
        auctionStartAt: form.auctionStartAt,
        auctionEndAt: form.auctionEndAt,
        snipingExtensionSeconds: form.snipingExtensionSeconds,
      }).forEach(([k, v]) => v !== "" && v !== null && fd.append(k, v));
      if (form.image) fd.append("image", form.image);

      const res = await fetch("http://localhost:5000/api/product", {
        method: "POST",
        body: fd,
        credentials: "include",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || "Failed to create room");
      setShowForm(false);
      setForm({ title: "", description: "", price: "", category: "All", image: null, startingBid: "0", minBidIncrement: "1", auctionStartAt: "", auctionEndAt: "", snipingExtensionSeconds: "0", height: "", width: "" });
      // refresh lists
      const [allRes, myRes] = await Promise.all([
        axios.get("http://localhost:5000/api/product"),
        axios.get("http://localhost:5000/api/product/user", { withCredentials: true }).catch(() => ({ data: [] })),
      ]);
      setAllRooms(allRes.data || []);
      setMyRooms(Array.isArray(myRes.data) ? myRes.data : []);
      alert("Room created");
    } catch (err) {
      alert(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const RoomCard = ({ p }) => {
    const a = auctionMap[p._id];
    let status = a?.biddingStatus || "";
    const startAt = a?.auctionStartAt ? new Date(a.auctionStartAt) : null;
    const endAt = a?.auctionEndAt ? new Date(a.auctionEndAt) : null;
    const now = new Date();
    let label = "";
    let remaining = "--:--:--";
    if (status === "scheduled" && startAt) {
      remaining = fmt(startAt.getTime() - now.getTime());
      if (remaining !== "00:00:00") {
        label = `Starts in ${remaining}`;
      }
    }
    if (status === "live" && endAt) {
      remaining = fmt(endAt.getTime() - now.getTime());
      label = `Ends in ${remaining}`;
    } else if (status === "ended") {
      label = "Auction ended";
    }
    // Local live detection: if current time >= startAt and < endAt (when provided) and not ended, treat as live
    const isLiveLocal = (
      (!!startAt ? now >= startAt : status === 'live') &&
      (!!endAt ? now < endAt : true) &&
      status !== 'ended'
    );
    // Align with AllProducts price display: prefer seller price if valid, else fallback to biddingPrice/currentBid
    const parsedPrice = p?.price !== undefined && p?.price !== null && p?.price !== "" ? Number(p.price) : NaN;
    const displayPriceBase = Number.isFinite(parsedPrice) && parsedPrice > 0 ? parsedPrice : (Number(p?.biddingPrice) || 0);
    const currentBid = a?.currentBid ?? p.biddingPrice ?? p.price;
    const isLive = isLiveLocal || status === 'live';
    const isEnded = status === 'ended';
    const isAdmin = (user?.role || '').toLowerCase() === 'admin';
    const isSeller = (user?.role || '').toLowerCase() === 'seller';
    const isOwner = !!(p?.user?._id ? (p.user._id === user?._id) : (p?.user === user?._id));
    const isBuyer = !user?.role || (user?.role || '').toLowerCase() === 'buyer' || (user?.role || '').toLowerCase() === 'user';

    return (
      <div
        className="bg-gray-800 p-4 rounded-lg shadow-lg transition-transform transform hover:scale-105 hover:shadow-2xl cursor-pointer"
        role="button"
        tabIndex={0}
        onKeyDown={(e)=>{ if(e.key==='Enter' || e.key===' ') navigate(`/product/${p._id}`); }}
        onClick={() => navigate(`/product/${p._id}`)}
      >
        {p.image?.filePath && (
          <img src={p.image.filePath} alt={p.title} className="w-full h-56 object-cover rounded-md mb-4" />
        )}
        <h3 className="text-xl font-semibold text-white">{p.title}</h3>
        <p className="text-gray-400">{p.description}</p>
        <div className="mt-2 flex items-center justify-between">
          <p className="font-bold text-purple-400">${displayPriceBase}</p>
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
        <div className="mt-3">
          {isBuyer ? (
            <button
              className={`w-full px-4 py-2 rounded text-white ${isLive ? 'bg-blue-600 hover:bg-blue-700' : isEnded ? 'bg-gray-600 cursor-not-allowed' : 'bg-yellow-700 cursor-not-allowed'}`}
              disabled={!isLive}
              onClick={(e)=>{ e.stopPropagation(); if(isLive) navigate(`/live/${p._id}`); }}
            >
              {isEnded ? 'Ended' : isLive ? 'Join' : (label || 'Waiting')}
            </button>
          ) : (
            <div className="flex gap-2">
              <button
                className="flex-1 px-4 py-2 rounded bg-indigo-700 hover:bg-indigo-800 text-white"
                onClick={(e)=>{ e.stopPropagation(); navigate(`/product/${p._id}`); }}
              >
                Manage
              </button>
              {(isAdmin || (isSeller && isOwner)) && (
                <button
                  className="px-4 py-2 rounded bg-red-700 hover:bg-red-800 text-white"
                  onClick={async (e)=>{
                    e.stopPropagation();
                    if (!confirm('Delete this product?')) return;
                    try {
                      await axios.delete(`http://localhost:5000/api/product/${p._id}`, { withCredentials: true });
                      setAllRooms(prev => prev.filter(x => x._id !== p._id));
                      setMyRooms(prev => prev.filter(x => x._id !== p._id));
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
  };

  return (
    <div className="px-4 md:px-10 py-10 bg-black text-white min-h-screen">
      <h1 className="text-2xl md:text-3xl font-bold mb-6">Rooms</h1>

      {(role === "seller" || role === "admin") && (
        <div className="mb-8">
          {/* Big Plus Card */}
          <div
            role="button"
            tabIndex={0}
            onClick={() => setShowForm((s) => !s)}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setShowForm((s)=>!s); }}
            className="cursor-pointer rounded-xl border-2 border-dashed border-purple-500/60 bg-[#0f1220] hover:border-purple-400 transition p-6 md:p-8 flex flex-col items-center justify-center text-center max-w-xl"
          >
            <div className="w-14 h-14 md:w-16 md:h-16 rounded-2xl flex items-center justify-center mb-3"
                 style={{ background: 'linear-gradient(145deg,#3b1d6b,#29174d)' }}>
              <span className="text-3xl md:text-4xl text-white">+</span>
            </div>
            <div className="text-blue-400 text-lg md:text-xl font-semibold">{showForm ? 'Close' : 'Create a Room'}</div>
            <div className="text-gray-400 text-sm mt-1">Start a new auction space</div>
          </div>

          {showForm && (
            <form onSubmit={submitCreate} className="mt-6 space-y-4 bg-gray-900 p-6 rounded max-w-2xl">
              {/* Add product photo */}
              <div>
                <label className="block text-sm text-gray-300 mb-2">Add product photo</label>
                <input
                  type="file"
                  accept="image/*"
                  className="block w-full bg-gray-800 text-white p-2 rounded border border-gray-700"
                  onChange={(e)=>{
                    const file = e.target.files?.[0] || null;
                    setForm(f=>({...f,image:file}));
                    // update preview
                    try {
                      if (imagePreview) URL.revokeObjectURL(imagePreview);
                    } catch(_) {}
                    setImagePreview(file ? URL.createObjectURL(file) : "");
                  }}
                />
                {imagePreview && (
                  <div className="mt-3">
                    <img src={imagePreview} alt="Preview" className="w-48 h-32 object-cover rounded border border-gray-700" />
                  </div>
                )}
              </div>

              {/* Title */}
              <div>
                <label className="block text-sm text-gray-300 mb-1">Title</label>
                <input
                  className="w-full bg-gray-800 text-white p-2 rounded border border-gray-700"
                  value={form.title}
                  onChange={(e)=>setForm(f=>({...f,title:e.target.value}))}
                  required
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm text-gray-300 mb-1">Description</label>
                <textarea
                  className="w-full bg-gray-800 text-white p-2 rounded border border-gray-700"
                  rows={3}
                  value={form.description}
                  onChange={(e)=>setForm(f=>({...f,description:e.target.value}))}
                  required
                />
              </div>

              {/* Category */}
              <div>
                <label className="block text-sm text-gray-300 mb-1">Category</label>
                <select
                  className="w-full bg-gray-800 text-white p-2 rounded border border-gray-700"
                  value={form.category}
                  onChange={(e)=>setForm(f=>({...f,category:e.target.value}))}
                  required
                >
                  <option value="" disabled>Select a category</option>
                  <option>Jewelry</option>
                  <option>Gems</option>
                  <option>Paintings</option>
                  <option>Antiques</option>
                  <option>Car</option>
                  <option>Bike</option>
                  <option>Other</option>
                </select>
                <p className="text-xs text-gray-400 mt-1">
                  Commission: {commissionByCategory(form.category)}% {form.category ? `(=${commissionByCategory(form.category)}% * price)` : "(0 if not selected)"}
                </p>
              </div>

              {/* Price */}
              <div>
                <label className="block text-sm text-gray-300 mb-1">Price</label>
                <input
                  type="number"
                  className="w-full bg-gray-800 text-white p-2 rounded border border-gray-700"
                  value={form.price}
                  onChange={(e)=>setForm(f=>({...f,price:e.target.value}))}
                  required
                />
              </div>

              {/* Dimensions */}
              <div>
                <label className="block text-sm text-gray-300 mb-1">Height</label>
                <input
                  type="number"
                  className="w-full bg-gray-800 text-white p-2 rounded border border-gray-700"
                  value={form.height}
                  onChange={(e)=>setForm(f=>({...f,height:e.target.value}))}
                  required
                />
              </div>
              <div>
                <label className="block text-sm text-gray-300 mb-1">Width</label>
                <input
                  type="number"
                  className="w-full bg-gray-800 text-white p-2 rounded border border-gray-700"
                  value={form.width}
                  onChange={(e)=>setForm(f=>({...f,width:e.target.value}))}
                  required
                />
              </div>

              {/* Auction Start At */}
              <div>
                <label className="block text-sm text-gray-300 mb-1">Auction start at</label>
                <input
                  type="datetime-local"
                  className="w-full bg-gray-800 text-white p-2 rounded border border-gray-700"
                  value={form.auctionStartAt}
                  onChange={(e)=>setForm(f=>({...f,auctionStartAt:e.target.value}))}
                />
              </div>

              {/* Auction End At */}
              <div>
                <label className="block text-sm text-gray-300 mb-1">Auction end at</label>
                <input
                  type="datetime-local"
                  className="w-full bg-gray-800 text-white p-2 rounded border border-gray-700"
                  value={form.auctionEndAt}
                  onChange={(e)=>setForm(f=>({...f,auctionEndAt:e.target.value}))}
                />
              </div>

              {/* Starting Bid */}
              <div>
                <label className="block text-sm text-gray-300 mb-1">Starting bid</label>
                <input
                  type="number"
                  className="w-full bg-gray-800 text-white p-2 rounded border border-gray-700"
                  value={form.startingBid}
                  onChange={(e)=>setForm(f=>({...f,startingBid:e.target.value}))}
                />
              </div>

              {/* Min Bid Increment */}
              <div>
                <label className="block text-sm text-gray-300 mb-1">Minimum bid increment (default 1)</label>
                <input
                  type="number"
                  className="w-full bg-gray-800 text-white p-2 rounded border border-gray-700"
                  value={form.minBidIncrement}
                  onChange={(e)=>setForm(f=>({...f,minBidIncrement:e.target.value}))}
                  placeholder="Default 1"
                  min={1}
                />
              </div>

              {/* Submit */}
              <div className="flex justify-end">
                <button disabled={submitting} className="bg-green-600 disabled:opacity-60 text-white px-6 py-2 rounded">
                  {submitting ? 'Creating...' : 'Create'}
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      {(role === "seller" || role === "admin") && (
        <>
          <h2 className="text-2xl font-semibold mb-3">Your Rooms</h2>
          {myRooms.length === 0 ? (
            <p className="text-gray-400 mb-8">No rooms yet.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-10">
              {myRooms.map((p) => (<RoomCard key={p._id} p={p} />))}
            </div>
          )}
        </>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-3">
        <h2 className="text-xl md:text-2xl font-semibold">Available Rooms</h2>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm text-gray-300 flex items-center gap-1">
            <span aria-hidden>⚙️</span>
            Filter
          </span>
          <select
            className="bg-gray-800 text-white px-2 py-1 rounded border border-gray-700 w-full sm:w-auto"
            value={selectedCategory}
            onChange={(e)=>setSelectedCategory(e.target.value)}
            aria-label="Filter by category"
            title="Filter by category"
          >
            <option>All</option>
            <option>Jewelry</option>
            <option>Gems</option>
            <option>Paintings</option>
            <option>Antiques</option>
            <option>Car</option>
            <option>Bike</option>
            <option>Other</option>
          </select>
          <button
            type="button"
            className="text-xs px-2 py-1 rounded border border-gray-600 text-gray-200 hover:bg-gray-700 w-full sm:w-auto"
            onClick={() => { setSelectedCategory('All'); if (searchQuery) navigate('/room'); }}
            title="Clear search and category filters"
            aria-label="Clear search and category filters"
          >
            Clear filters
          </button>
        </div>
      </div>
      {loadingRooms ? (
        <p className="text-gray-400">Loading rooms...</p>
      ) : roomsError ? (
        <div className="text-red-400 bg-red-900/20 border border-red-800 rounded p-4">
          <p className="mb-3">{roomsError}</p>
          <button
            className="px-3 py-1 rounded bg-red-700 hover:bg-red-600 text-white"
            onClick={fetchRooms}
          >
            Retry
          </button>
        </div>
      ) : availableRoomsProcessed.length === 0 ? (
        <p className="text-gray-400">
          {selectedCategory !== 'All' || searchQuery
            ? 'No rooms match your filters.'
            : 'No rooms available.'}
        </p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {availableRoomsProcessed.map((p) => (<RoomCard key={p._id} p={p} />))}
        </div>
      )}
    </div>
  );
}

export default Room;
