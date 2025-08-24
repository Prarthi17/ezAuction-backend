import React, { useEffect, useState } from "react";

function ProfileSection({ user, onUpdated }) {
  const [name, setName] = useState(user?.name || "");
  const [email, setEmail] = useState(user?.email || "");
  const [balance, setBalance] = useState(
    typeof user?.balance === "number" ? String(user.balance) : ""
  );
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [photoFile, setPhotoFile] = useState(null);
  const [photoName, setPhotoName] = useState("");
  const [photoPreview, setPhotoPreview] = useState("");
  const [saving, setSaving] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [showPwd, setShowPwd] = useState(false);

  useEffect(() => {
    setName(user?.name || "");
    setEmail(user?.email || "");
    setBalance(typeof user?.balance === "number" ? String(user.balance) : "");
  }, [user]);

  const saveAll = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      // 1) Update name/photo if changed
      const profileForm = new FormData();
      if (name && name !== user?.name) profileForm.append("name", name);
      if (email && email !== user?.email) profileForm.append("email", email);
      if (balance !== "" && balance !== String(user?.balance ?? "")) profileForm.append("balance", balance);
      if (photoFile) profileForm.append("photo", photoFile);
      if ([...profileForm.keys()].length > 0) {
        const res = await fetch("http://localhost:5000/api/users/profile", {
          method: "PUT",
          body: profileForm,
          credentials: "include",
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data?.message || "Failed to update profile");
        onUpdated && onUpdated(data);
        // Persist to localStorage so Navbar can hydrate instantly on reload
        try {
          localStorage.setItem('currentUser', JSON.stringify(data));
          // bump avatar version so cached image invalidates across reloads
          const ver = Number(localStorage.getItem('avatarVersion') || '0') + 1;
          localStorage.setItem('avatarVersion', String(ver));
        } catch (_) {}
        // Notify other components (e.g., Navbar) that user data changed
        try { window.dispatchEvent(new CustomEvent('user:updated', { detail: data })); } catch (_) {}
      }
      // 2) Update password if both provided
      if (oldPassword && newPassword) {
        const res2 = await fetch("http://localhost:5000/api/users/password", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ oldPassword, newPassword }),
        });
        const data2 = await res2.json();
        if (!res2.ok) throw new Error(data2?.message || "Failed to change password");
        setOldPassword("");
        setNewPassword("");
      }

      setEditMode(false);
      setPhotoFile(null);
      alert("Profile saved");
    } catch (err) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  };

  const photoUrl = user?.photo ? (user.photo.startsWith('/uploads') ? `http://localhost:5000${user.photo}` : user.photo) : 'profile.png';
  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        <img src={photoUrl} alt="avatar" className="w-16 h-16 rounded-full object-cover" />
        <div>
          <div className="text-white font-semibold text-base sm:text-lg">Name: {user?.name}</div>
          <div className="text-white">Role: {user?.role}</div>
          <div className="text-white">Email: {user?.email}</div>
          {typeof user?.balance === "number" && (
            <div className="text-white">Balance: {user.balance}</div>
          )}
        </div>
      </div>

      {!editMode && (
        <button
          onClick={()=>{
            setEditMode(true);
            setName(user?.name || "");
            setEmail(user?.email || "");
            setBalance(typeof user?.balance === "number" ? String(user.balance) : "");
            setShowPwd(false);
          }}
          className="bg-blue-600 text-white px-3 py-2 rounded hover:bg-blue-500 w-max"
        >
          Edit Profile
        </button>
      )}

      {editMode && (
        <form onSubmit={saveAll} className="flex flex-col gap-2">
          <label className="text-white">Name</label>
          <input className="p-2 rounded bg-gray-800 text-white border border-gray-600" value={name} onChange={(e)=>setName(e.target.value)} />
          <label className="text-white">Email</label>
          <input className="p-2 rounded bg-gray-800 text-white border border-gray-600" value={email} onChange={(e)=>setEmail(e.target.value)} />
          <label className="text-white">Balance</label>
          <input className="p-2 rounded bg-gray-800 text-white border border-gray-600" type="number" value={balance} onChange={(e)=>setBalance(e.target.value)} />
          <label className="text-white">Profile Photo</label>
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <img
              src={photoPreview || photoUrl}
              alt="preview"
              className="w-14 h-14 rounded object-cover border border-gray-600"
            />
            <div className="flex flex-col gap-1 w-full sm:w-auto">
              <input
                id="photo-input"
                type="file"
                accept="image/*"
                className="block p-2 rounded bg-gray-800 text-white border border-gray-600 w-full sm:w-64"
                onChange={(e)=>{
                  const f = e.target.files && e.target.files[0];
                  setPhotoFile(f || null);
                  setPhotoName(f ? f.name : "");
                  setPhotoPreview(f ? URL.createObjectURL(f) : "");
                }}
              />
              {photoName && <span className="text-sm text-gray-300">Selected: {photoName}</span>}
            </div>
          </div>

          {!showPwd && (
            <button
              type="button"
              onClick={()=> setShowPwd(true)}
              className="mt-2 bg-purple-600 text-white px-3 py-2 rounded hover:bg-purple-500 w-max"
            >
              Change Password
            </button>
          )}

          {showPwd && (
            <div className="mt-2 flex flex-col gap-2">
              <label className="text-white">Old Password</label>
              <input type="password" className="p-2 rounded bg-gray-800 text-white border border-gray-600" value={oldPassword} onChange={(e)=>setOldPassword(e.target.value)} />
              <label className="text-white">New Password</label>
              <input type="password" className="p-2 rounded bg-gray-800 text-white border border-gray-600" value={newPassword} onChange={(e)=>setNewPassword(e.target.value)} />
            </div>
          )}
          <div className="flex flex-col sm:flex-row gap-2">
            <button disabled={saving} className="bg-green-600 text-white px-3 py-2 rounded hover:bg-green-500 w-full sm:w-max">{saving?"Saving...":"Update Profile"}</button>
            <button type="button" onClick={()=>{ setEditMode(false); setPhotoFile(null); setOldPassword(""); setNewPassword(""); setShowPwd(false); setName(user?.name || ""); setEmail(user?.email || ""); setBalance(typeof user?.balance === "number" ? String(user.balance) : ""); }} className="bg-gray-600 text-white px-3 py-2 rounded hover:bg-gray-500 w-full sm:w-max">Cancel</button>
          </div>
        </form>
      )}
    </div>
  );
}

function WonProducts() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("http://localhost:5000/api/product/won-products", { credentials: "include" });
        if (res.ok) {
          const data = await res.json();
          setItems(Array.isArray(data) ? data : []);
        } else {
          setItems([]);
        }
      } catch (_) {
        setItems([]);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) return <div className="text-white">Loading...</div>;
  if (!items.length) return <div className="text-white">No bids yet</div>;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {items.map((p) => (
        <div key={p._id} className="flex items-center gap-3 p-3 rounded bg-slate-800">
          <img src={p?.image?.filePath || "logo.png"} alt="img" className="w-20 h-20 object-cover rounded" />
          <div>
            <div className="text-white font-semibold">{p.title}</div>
            <div className="text-gray-300 text-sm line-clamp-2 max-w-md">{p.description}</div>
            <div className="text-white text-sm">Won at: {p.soldPrice ?? p.biddingPrice ?? p.price}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

function SellerProducts() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("http://localhost:5000/api/product/user", { credentials: "include" });
        const data = await res.json();
        if (res.ok) setProducts(data || []);
      } finally { setLoading(false); }
    })();
  }, []);

  const saveProduct = async (idx, updates, file) => {
    const p = products[idx];
    const form = new FormData();
    Object.entries(updates).forEach(([k,v]) => { if (v !== undefined && v !== null) form.append(k, v); });
    if (file) form.append("image", file);
    const res = await fetch(`http://localhost:5000/api/product/${p._id}`, { method: "PUT", body: form, credentials: "include" });
    const data = await res.json();
    if (!res.ok) throw new Error(data?.message || "Update failed");
    const next = [...products];
    next[idx] = data;
    setProducts(next);
    alert("Product updated");
  };

  if (loading) return <div className="text-white">Loading products...</div>;

  return (
    <div className="space-y-6">
      {products.length === 0 && <div className="text-white">No products yet.</div>}
      {products.map((p, idx) => (
        <EditableProduct key={p._id} product={p} onSave={(updates, file)=>saveProduct(idx, updates, file)} />
      ))}
    </div>
  );
}

function EditableProduct({ product, onSave }) {
  const [editMode, setEditMode] = useState(false);
  const [title, setTitle] = useState(product.title || "");
  const [price, setPrice] = useState(product.price || 0);
  const [description, setDescription] = useState(product.description || "");
  const [imageFile, setImageFile] = useState(null);
  const [saving, setSaving] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await onSave({ title, price, description }, imageFile);
    } catch (e1) {
      alert(e1.message);
    } finally { setSaving(false); }
  };

  return (
    <div className="p-4 rounded bg-slate-800">
      {/* Compact view */}
      {!editMode && (
        <div className="flex flex-col sm:flex-row sm:items-center gap-4 justify-between">
          <div className="flex items-center gap-3">
            <img src={product?.image?.filePath || "logo.png"} alt="img" className="w-20 h-20 object-cover rounded" />
            <div>
              <div className="text-white font-semibold">{product.title}</div>
              <div className="text-gray-300 text-sm line-clamp-2 max-w-md">{product.description}</div>
              <div className="text-white text-sm">Price: {product.price}</div>
              <div className="text-gray-400 text-xs">Slug: {product.slug}</div>
            </div>
          </div>
          <button
            className="bg-blue-600 text-white px-3 py-2 rounded hover:bg-blue-500 w-full sm:w-auto"
            onClick={() => {
              setEditMode(true);
              setTitle(product.title || "");
              setPrice(product.price || 0);
              setDescription(product.description || "");
              setImageFile(null);
            }}
          >
            Update
          </button>
        </div>
      )}

      {/* Edit mode */}
      {editMode && (
        <form onSubmit={submit} className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
          <label className="text-white">Title</label>
          <input className="p-2 rounded bg-gray-800 text-white border border-gray-600" value={title} onChange={(e)=>setTitle(e.target.value)} />
          <label className="text-white">Price</label>
          <input className="p-2 rounded bg-gray-800 text-white border border-gray-600" type="number" value={price} onChange={(e)=>setPrice(e.target.value)} />
          <label className="text-white">Description</label>
          <textarea className="p-2 rounded bg-gray-800 text-white border border-gray-600" value={description} onChange={(e)=>setDescription(e.target.value)} />
          <label className="text-white">Image</label>
          <input className="p-2 rounded bg-gray-800 text-white border border-gray-600" type="file" accept="image/*" onChange={(e)=>setImageFile(e.target.files[0])} />
          <div className="col-span-1 md:col-span-2 flex flex-col sm:flex-row gap-2">
            <button disabled={saving} className="bg-green-600 text-white px-3 py-2 rounded hover:bg-green-500 w-full sm:w-auto">{saving?"Saving...":"Save"}</button>
            <button type="button" className="bg-gray-600 text-white px-3 py-2 rounded hover:bg-gray-500 w-full sm:w-auto" onClick={()=>{ setEditMode(false); }}>
              Cancel
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

function Dashboard() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showSellerProducts, setShowSellerProducts] = useState(false);

  const handleLogout = async () => {
    try {
      await fetch("http://localhost:5000/api/users/logout", { credentials: "include" });
    } catch (_) {}
    window.location.href = "/";
  };

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("http://localhost:5000/api/users/getuser", { credentials: "include" });
        const data = await res.json();
        if (res.ok) setUser(data);
      } finally { setLoading(false); }
    })();
  }, []);

  if (loading) return <div className="max-w-5xl mx-auto p-6 text-white">Loading...</div>;
  if (!user) return <div className="max-w-5xl mx-auto p-6 text-white">Please login.</div>;

  return (
    <div className="max-w-5xl mx-auto p-6">
      <h1 className="text-2xl text-white mb-4">Dashboard</h1>
      <ProfileSection user={user} onUpdated={setUser} />

      {user.role === "buyer" && (
        <div className="mt-8">
          <h2 className="text-xl text-white mb-2">Won Products</h2>
          <WonProducts />
        </div>
      )}

      {user.role === "seller" && (
        <div className="mt-8">
          <h2 className="text-xl text-white mb-2">Seller</h2>
          {!showSellerProducts ? (
            <button
              className="bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-500"
              onClick={() => setShowSellerProducts(true)}
            >
              my products
            </button>
          ) : (
            <>
              <div className="mb-3 flex justify-between items-center">
                <h3 className="text-lg text-white">Your Products</h3>
                <button className="text-sm text-blue-300 hover:text-blue-200" onClick={()=>setShowSellerProducts(false)}>Hide</button>
              </div>
              <SellerProducts />
            </>
          )}
        </div>
      )}

      {user.role === "admin" && (
        <div className="mt-8">
          <h2 className="text-xl text-white mb-2">Admin</h2>
          <div className="text-white">Coming soon: manage users/products</div>
        </div>
      )}

      <div className="mt-10">
        <button onClick={handleLogout} className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-500">Logout</button>
      </div>
    </div>
  );
}

export default Dashboard;
