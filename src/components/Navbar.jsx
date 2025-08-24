import React, { useState, useEffect } from "react";

function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userRole, setUserRole] = useState(null); // 'buyer' | 'seller' | 'admin' | null
  const [user, setUser] = useState(null);
  const [avatarVersion, setAvatarVersion] = useState(0);
  const [showSearch, setShowSearch] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [searching, setSearching] = useState(false);

  // Prefer server-side session check (works with HttpOnly cookies)
  async function checkLogin() {
    try {
      const res = await fetch("http://localhost:5000/api/users/loggedin", {
        credentials: "include",
      });
      let logged = false;
      try {
        const data = await res.json();
        logged = data === true || data?.loggedIn === true || data?.status === "logged_in" || data === "true";
      } catch (_) {
        const text = await res.text();
        logged = text === "true" || text === "logged_in";
      }
      setIsLoggedIn(!!logged);
      if (logged) {
        // Set cached user immediately to avoid avatar flash while fetching
        try {
          const cached = localStorage.getItem('currentUser');
          if (cached) {
            const cu = JSON.parse(cached);
            setUser(cu);
            setUserRole(cu?.role || null);
          }
        } catch (_) {}
        // fetch user to get role
        try {
          const ures = await fetch("http://localhost:5000/api/users/getuser", {
            credentials: "include",
          });
          if (ures.ok) {
            const u = await ures.json();
            setUserRole(u?.role || null);
            setUser(u);
          } else {
            setUserRole(null);
            setUser(null);
          }
        } catch (_) {
          setUserRole(null);
          setUser(null);
        }
      } else {
        setUserRole(null);
      }
    } catch (_) {
      setIsLoggedIn(false);
      setUserRole(null);
      setUser(null);
    }
  }

  useEffect(() => {
    // Hydrate from cache on mount (before network) to render avatar instantly
    try {
      const cached = localStorage.getItem('currentUser');
      if (cached) {
        const cu = JSON.parse(cached);
        setUser(cu);
        setUserRole(cu?.role || null);
      }
      const av = Number(localStorage.getItem('avatarVersion') || '0');
      if (!Number.isNaN(av)) setAvatarVersion(av);
    } catch (_) {}
    checkLogin();
    // Re-check shortly after mount to catch freshly set HttpOnly cookie
    const t1 = setTimeout(checkLogin, 800);
    const t2 = setTimeout(checkLogin, 2000);

    const onFocus = () => checkLogin();
    const onVisibility = () => {
      if (document.visibilityState === "visible") checkLogin();
    };
    const onUserUpdated = (e) => {
      const u = e?.detail;
      if (u) {
        setUserRole(u.role || null);
        setUser(u);
        // sync avatar version from localStorage (Dashboard bumps it)
        try {
          const av = Number(localStorage.getItem('avatarVersion') || '0');
          if (!Number.isNaN(av)) {
            setAvatarVersion(av);
          } else {
            setAvatarVersion((v)=>v+1);
          }
          // also persist currentUser in case event sender forgot
          localStorage.setItem('currentUser', JSON.stringify(u));
        } catch (_) {
          setAvatarVersion((v)=>v+1);
        }
      } else {
        // fallback: refetch
        checkLogin();
      }
    };
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener('user:updated', onUserUpdated);
    return () => {
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener('user:updated', onUserUpdated);
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, []);

  const avatarSrc = (() => {
    const src = user?.photo || "profile.png";
    if (!src) return "profile.png";
    if (typeof src === 'string' && src.startsWith('/uploads')) {
      return `http://localhost:5000${src}?v=${avatarVersion}`;
    }
    return src;
  })();

  return (
    <header class="header bg-slate-900 shadow-md sticky top-0 z-50">
      <div class="max-w-7xl mx-auto px-6 py-4">
        <nav class="flex justify-between items-center relative">
          {/* <!-- Left: Logo + Menu --> */}
          <div class="flex items-center gap-14">
            {/* <!-- Logo --> */}
            <div>
              <img src="logo.png" alt="Logo" class="h-11" /> 
            </div>

        {/* <!-- Menu Links (desktop) --> */}
        <ul class="hidden lg:flex items-center gap-8">
          <li class="list-none capitalize">
            <a href="/" class="text-white hover:text-blue-300">Home</a>
          </li>
          <li class="list-none capitalize">
            <a href="/room" class="text-white hover:text-blue-300">Room</a>
          </li>
          <li class="list-none capitalize">
            <a href="#faq" class="text-white hover:text-blue-300">FAQ</a>
          </li>
          <li class="list-none capitalize">
            <a href="#about" class="text-white hover:text-blue-300">About</a>
          </li>
          <li class="list-none capitalize">
            <a href="#contact" class="text-white hover:text-blue-300">Contact Us</a>
          </li>
        </ul>
      </div>

      {/* <!-- Right: Search + Auth Buttons --> */}
      <div class="flex items-center gap-4">
        <div class="hidden lg:flex lg:items-center lg:gap-3">
          <button
            class="text-white p-2 hover:text-blue-300"
            onClick={() => setShowSearch((s) => !s)}
            aria-label="Toggle search"
            title="Search"
          >
            🔍
          </button>
          {showSearch && (
            <form
              class="flex items-center gap-2"
              onSubmit={(e)=>{ e.preventDefault(); const q = searchText.trim(); if(q){ setSearching(true); window.location.href = `/room?search=${encodeURIComponent(q)}`; } }}
            >
              <input
                value={searchText}
                onChange={(e)=>setSearchText(e.target.value)}
                placeholder="Search rooms, events, categories"
                class="bg-gray-800 text-white px-3 py-1 rounded border border-gray-700 w-64"
              />
              <button disabled={searching} class="bg-blue-600 disabled:opacity-60 text-white px-3 py-1 rounded hover:bg-blue-500" type="submit">{searching ? 'Searching…' : 'Go'}</button>
            </form>
          )}

          {isLoggedIn ? (
            <>
              {userRole !== "seller" && userRole !== "admin" && (
                <a href="/seller/login" class="text-white hover:text-blue-300">Become a Seller</a>
              )}
              <a href="/dashboard" class="w-10 h-10 rounded-full overflow-hidden block">
                <img src={avatarSrc} alt="Profile" class="w-full h-full object-cover" />
              </a>
            </>
          ) : (
            <>
              <a href="/login" class="text-white hover:text-blue-300">Login</a>
              <a href="/register" class="bg-purple-400 text-black px-4 py-2 rounded-full  shadow-md hover:bg-purple-500">Signup</a>
            </>
          )}
        </div>

        {/* <!-- Mobile Menu Button --> */}
        <div class="lg:hidden flex items-center gap-4">
          <button
            type="button"
            aria-label="Toggle menu"
            aria-expanded={isOpen}
            onClick={() => setIsOpen((s) => !s)}
            className="text-white text-2xl leading-none focus:outline-none"
          >
            {isOpen ? '✕' : '☰'}
          </button>
        </div>
      </div>

      {/* <!-- Mobile Menu --> */}
      <div className={`lg:hidden absolute right-0 top-full w-full p-5 bg-blue-800 ${isOpen ? '' : 'hidden'}`}>
        <ul class="space-y-2">
          <li><a href="/" class="block text-white uppercase hover:text-blue-300">Home</a></li>
          <li><a href="/room" class="block text-white uppercase hover:text-blue-300">Room</a></li>
          <li><a href="#faq" class="block text-white uppercase hover:text-blue-300">FAQ</a></li>
          <li><a href="#about" class="block text-white uppercase hover:text-blue-300">About</a></li>
          <li><a href="#contact" class="block text-white uppercase hover:text-blue-300">Contact Us</a></li>
          <li>
            <form
              onSubmit={(e)=>{ e.preventDefault(); const q = searchText.trim(); if(q){ setSearching(true); window.location.href = `/room?search=${encodeURIComponent(q)}`; } }}
              class="flex gap-2"
            >
              <input
                value={searchText}
                onChange={(e)=>setSearchText(e.target.value)}
                placeholder="Search rooms, events, categories"
                class="flex-1 bg-blue-700/30 text-white px-3 py-1 rounded border border-blue-600"
              />
              <button disabled={searching} type="submit" class="bg-blue-700 disabled:opacity-60 text-white px-3 py-1 rounded hover:bg-blue-600">{searching ? 'Searching…' : 'Go'}</button>
            </form>
          </li>
          {isLoggedIn ? (
            <>
              <li>
                {userRole !== "seller" && userRole !== "admin" && (
                  <a href="/seller/login" class="block w-full bg-blue-700 text-white px-3 py-1 rounded hover:bg-blue-600">Become a Seller</a>
                )}
              </li>
              <li class="flex items-center gap-2">
                <a href="/dashboard" class="w-10 h-10 rounded-full overflow-hidden block">
                  <img src={avatarSrc} alt="Profile" class="w-full h-full object-cover" />
                </a>
                <a href="/dashboard" class="text-white">Profile</a>
              </li>
            </>
          ) : (
            <>
              <li>
                <a href="/login" class="block w-full bg-blue-700 text-white px-3 py-1 rounded hover:bg-blue-600">Login</a>
              </li>
              <li>
                <a href="/register" class="block w-full bg-purple-400 text-black px-3 py-1 rounded hover:bg-blue-600">Signup</a>
              </li>
            </>
          )}
        </ul>
      </div>
    </nav>
  </div>
</header>

  );
}

export default Navbar;
