import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import axios from "axios";
import { getSocket } from "../../utils/socket";

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

const fmt = (ms) => {
  if (ms <= 0) return "00:00:00";
  const totalSec = Math.floor(ms / 1000);
  const h = String(Math.floor(totalSec / 3600)).padStart(2, "0");
  const m = String(Math.floor((totalSec % 3600) / 60)).padStart(2, "0");
  const s = String(totalSec % 60).padStart(2, "0");
  return `${h}:${m}:${s}`;
};

function ProductDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [product, setProduct] = useState(null);
  const [auction, setAuction] = useState(null);
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        // get user
        try {
          const u = await axios.get("http://localhost:5000/api/users/getuser", { withCredentials: true });
          setUser(u.data?.data || u.data || null);
        } catch (_) {}
        // product base info
        const p = await axios.get(`http://localhost:5000/api/product/${id}`);
        setProduct(p.data);
        // auction state
        try {
          const s = await axios.get(`http://localhost:5000/api/bidding/state/${id}`);
          setAuction(s.data);
        } catch (_) {}
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id]);

  // Edit mode for admin/owning seller
  const [editMode, setEditMode] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ title: '', description: '', price: '', height: '', width: '' });
  useEffect(() => {
    if (product) {
      setForm({
        title: product.title || '',
        description: product.description || '',
        price: product.price || '',
        height: product.height || '',
        width: product.width || '',
      });
    }
  }, [product]);

  const handleSave = async () => {
    if (!product) return;
    setSaving(true);
    try {
      const payload = {
        title: form.title,
        description: form.description,
        price: form.price,
        height: form.height,
        width: form.width,
      };
      const res = await axios.put(`http://localhost:5000/api/product/${product._id}`, payload, { withCredentials: true });
      setProduct(res.data);
      setEditMode(false);
    } catch (e) {
      console.error(e);
      alert('Failed to save changes');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!product) return;
    if (!confirm('Delete this product?')) return;
    try {
      await axios.delete(`http://localhost:5000/api/product/${product._id}`, { withCredentials: true });
      navigate('/');
    } catch (e) {
      console.error(e);
      alert('Failed to delete');
    }
  };

  // socket live updates
  useEffect(() => {
    const socket = getSocket();
    if (!socket || !id) return;

    const onState = (payload) => { if (payload?.productId === id) setAuction(payload); };
    const onStarted = ({ productId }) => { if (productId === id) setAuction((prev) => ({ ...(prev||{}), biddingStatus: 'live' })); };
    const onEnded = (result) => { const productId = result?.product?._id || result?.productId; if (productId === id) setAuction((prev) => ({ ...(prev||{}), biddingStatus: 'ended' })); };
    const onBidAccepted = ({ productId, currentBid, highBidder, auctionEndAt }) => {
      if (productId === id) setAuction((prev) => ({ ...(prev||{}), currentBid, currentHighBidder: highBidder || prev?.currentHighBidder || null, auctionEndAt: auctionEndAt || prev?.auctionEndAt || null }));
    };

    socket.emit('auction:join', { productId: id });
    socket.on('auction:state', onState);
    socket.on('auction:started', onStarted);
    socket.on('auction:ended', onEnded);
    socket.on('bid:accepted', onBidAccepted);

    return () => {
      socket.emit('auction:leave', { productId: id });
      socket.off('auction:state', onState);
      socket.off('auction:started', onStarted);
      socket.off('auction:ended', onEnded);
      socket.off('bid:accepted', onBidAccepted);
    };
  }, [id]);

  // tick for countdown
  useEffect(() => {
    const t = setInterval(() => setAuction((prev) => ({ ...(prev||{}) })), 1000);
    return () => clearInterval(t);
  }, []);

  const role = user?.role;
  const isAdmin = role === 'admin';
  const isSeller = role === 'seller' && user?._id && product?.user && (product.user?._id ? product.user._id : String(product.user)) === String(user._id);
  const isBuyer = !role || role === 'buyer' || role === 'user';

  const status = auction?.biddingStatus || product?.biddingStatus || 'scheduled';
  const startAt = auction?.auctionStartAt ? new Date(auction.auctionStartAt) : (product?.auctionStartAt ? new Date(product.auctionStartAt) : null);
  const endAt = auction?.auctionEndAt ? new Date(auction.auctionEndAt) : (product?.auctionEndAt ? new Date(product.auctionEndAt) : null);
  const now = new Date();
  let statusLabel = '';
  if (status === 'scheduled' && startAt) {
    const rem = fmt(startAt.getTime() - now.getTime());
    if (rem === '00:00:00') statusLabel = 'Live'; else statusLabel = `Starts in ${rem}`;
  } else if (status === 'live' && endAt) {
    statusLabel = `Ends in ${fmt(endAt.getTime() - now.getTime())}`;
  } else if (status === 'ended') {
    statusLabel = 'Auction ended';
  }

  const currentBid = (auction?.currentBid && auction.currentBid > 0) ? auction.currentBid : (product?.biddingPrice ?? product?.price ?? 0);
  const highBidder = auction?.currentHighBidder;

  const handleVerify = async () => {
    if (!product) return;
    setVerifying(true);
    try {
      const commission = categoryCommission(product.category);
      await axios.patch(`http://localhost:5000/api/product/admin/product-verified/${product._id}`,
        { commission },
        { withCredentials: true }
      );
      setProduct((p) => ({ ...(p||{}), isverify: true, commission }));
    } catch (e) {
      console.error(e);
    } finally {
      setVerifying(false);
    }
  };

  if (loading) return <div className="px-10 py-10 text-white">Loading...</div>;
  if (!product) return <div className="px-10 py-10 text-white">Product not found.</div>;

  // Buyer access control: only verified
  if ((!isAdmin && !isSeller) && !product.isverify) {
    return <div className="px-10 py-10 text-white">This product is not verified yet.</div>;
  }

  return (
    <div className="px-6 md:px-10 py-8 bg-black text-white min-h-screen">
      <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-8">
        <div>
          {product.image?.filePath && (
            <img src={product.image.filePath} alt={product.title} className="w-full h-auto rounded-lg" />
          )}
          {product.isSoldout ? (
            <div className="mt-3 inline-flex items-center gap-2 bg-red-700 text-white px-3 py-1 rounded">Sold out</div>
          ) : (
            <div className="mt-3 inline-flex items-center gap-2 px-3 py-1 rounded bg-gray-800">
              {status === 'live' ? (<><span className="w-2 h-2 bg-red-400 rounded-full animate-pulse"/> Live</>) : statusLabel}
            </div>
          )}
        </div>

        <div>
          <h1 className="text-2xl md:text-3xl font-bold">{product.title}</h1>
          <p className="text-gray-300 mt-2">{product.description}</p>
          <div className="mt-3 text-sm text-gray-400">Category: {product.category} {product.isverify ? (<span className="ml-2 text-green-400">✔ Verified</span>) : (<span className="ml-2 text-red-400">✖ Not verified</span>)}</div>
          <div className="mt-2 font-semibold">Price: ${product.price}</div>
          <div className="mt-2">Starting bid: {product.startingBid ?? 0}</div>
          <div className="mt-2">Current bid: {currentBid}</div>
          <div className="mt-2">High bidder: {highBidder ? (typeof highBidder === 'object' ? (highBidder.name || highBidder.email || String(highBidder._id)) : String(highBidder)) : '-'}</div>
          <div className="mt-2">Created at: {new Date(product.createdAt).toLocaleString()}</div>
          <div className="mt-2">Seller: {product.user?.name || product.user?.email || '-'}</div>
          <div className="mt-1 text-xs text-gray-400">Seller email: {product.user?.email || '-'}</div>
          {product.isSoldout && (
            <div className="mt-3 p-3 rounded bg-gray-800">
              <div className="font-semibold">Sold price: ${product.soldPrice}</div>
              <div>Winner: {product.soldTo?.name || product.soldTo?.email || (product.soldTo ? String(product.soldTo) : '-')}</div>
              <div className="text-xs text-gray-400">Winner email: {product.soldTo?.email || '-'}</div>
            </div>
          )}

          {(isAdmin || isSeller) && (
            <div className="mt-4 flex gap-3">
              {/* Edit/Save/Cancel */}
              {!editMode ? (
                <>
                  <button className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded" onClick={() => setEditMode(true)}>Edit</button>
                  <button className="bg-red-700 hover:bg-red-800 text-white px-4 py-2 rounded" onClick={handleDelete}>Delete</button>
                </>
              ) : (
                <>
                  <button className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded disabled:opacity-60" disabled={saving} onClick={handleSave}>{saving ? 'Saving...' : 'Save'}</button>
                  <button className="bg-gray-700 hover:bg-gray-800 text-white px-4 py-2 rounded" onClick={() => { setEditMode(false); setForm({ title: product.title||'', description: product.description||'', price: product.price||'', height: product.height||'', width: product.width||'' }); }}>Cancel</button>
                </>
              )}
              {!product.isverify && (
                <button onClick={handleVerify} disabled={verifying} className="bg-green-600 hover:bg-green-700 disabled:opacity-60 text-white px-4 py-2 rounded">
                  {verifying ? 'Verifying...' : `Verify (Commission ${categoryCommission(product.category)}%)`}
                </button>
              )}
            </div>
          )}

          {/* Join button for live auctions (buyers only) */}
          {isBuyer && status === 'live' && !product.isSoldout && (
            <div className="mt-6">
              <button className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded" onClick={() => navigate(`/live/${product._id}`)}>
                Join Room
              </button>
            </div>
          )}

          {/* Inline edit form */}
          {(isAdmin || isSeller) && editMode && (
            <div className="mt-6 space-y-3 bg-gray-900 p-4 rounded">
              <div>
                <label className="block text-sm text-gray-300 mb-1">Title</label>
                <input className="w-full bg-gray-800 text-white p-2 rounded border border-gray-700" value={form.title} onChange={(e)=>setForm(f=>({...f,title:e.target.value}))} />
              </div>
              <div>
                <label className="block text-sm text-gray-300 mb-1">Description</label>
                <textarea className="w-full bg-gray-800 text-white p-2 rounded border border-gray-700" rows={3} value={form.description} onChange={(e)=>setForm(f=>({...f,description:e.target.value}))} />
              </div>
              <div>
                <label className="block text-sm text-gray-300 mb-1">Price</label>
                <input type="number" className="w-full bg-gray-800 text-white p-2 rounded border border-gray-700" value={form.price} onChange={(e)=>setForm(f=>({...f,price:e.target.value}))} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm text-gray-300 mb-1">Height</label>
                  <input type="number" className="w-full bg-gray-800 text-white p-2 rounded border border-gray-700" value={form.height} onChange={(e)=>setForm(f=>({...f,height:e.target.value}))} />
                </div>
                <div>
                  <label className="block text-sm text-gray-300 mb-1">Width</label>
                  <input type="number" className="w-full bg-gray-800 text-white p-2 rounded border border-gray-700" value={form.width} onChange={(e)=>setForm(f=>({...f,width:e.target.value}))} />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default ProductDetail;
