import React, { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import img1 from "../../assets/img1.png";
import img2 from "../../assets/img2.png";
import img3 from "../../assets/img3.png";
import img4 from "../../assets/img4.png";
import img5 from "../../assets/img5.png";
import img6 from "../../assets/img6.png";
import img7 from "../../assets/img7.png";
import img8 from "../../assets/img8.png";

import AllProducts from "../products/Allproducts";

function Home() {
  const navigate = useNavigate();
  const location = useLocation();
  const [role, setRole] = useState("");
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("http://localhost:5000/api/users/getuser", { credentials: "include" });
        if (res.ok) {
          const u = await res.json();
          setRole((u?.role || "").toLowerCase());
        }
      } catch (_) {}
    })();
  }, []);
  const leftColumn = [img6, img4, img5, img1];
  const rightColumn = [img3, img2, img7, img8];

  

  return (
    <div className="bg-black text-white">
      {/* Global smooth scrolling for anchor navigation */}
      <style>{`html { scroll-behavior: smooth; }`}</style>
      {/* Hero Section */}
      <div className="w-full min-h-[70vh] md:h-screen flex flex-col md:flex-row">
        {/* Left Panel */}
        <div className="w-full md:w-1/2 flex flex-col justify-center px-6 md:px-20 py-10 md:py-0 space-y-4">
          <h1 className="text-4xl md:text-5xl font-bold leading-tight">
            Bid live. Win big. Repeat.
          </h1>
          <p className="text-base md:text-lg text-gray-300">
            Join the action with real-time bidding, private rooms, and a rush
            you won’t forget. Auctions just got personal—ready to play?
          </p>
          <button
            className="bg-purple-400 text-black text-lg px-12 py-4 rounded-lg w-full sm:w-1/2 hover:bg-purple-500 transition-all duration-300 transform hover:-translate-y-0.5 hover:scale-105 focus:outline-none focus:ring-2 focus:ring-purple-400/60"
            onClick={() => navigate("/room")}
          >
            {role === 'seller' ? 'Create room' : 'Start bidding'}
          </button>
        </div>

        {/* Right Panel (Desktop/Tablet: animated) */}
        <div className="hidden md:block md:w-1/2 relative overflow-hidden">
          <div className="absolute top-0 animate-scroll flex gap-x-8">
            {/* Left Column */}
            <div className="flex flex-col gap-y-6">
              {leftColumn.map((img, idx) => (
                <img
                  key={idx}
                  src={img}
                  alt={`img-${idx}`}
                  className="w-96 h-56 object-cover rounded-lg shadow-lg"
                />
              ))}
            </div>

            {/* Right Column */}
            <div className="flex flex-col gap-y-6">
              {rightColumn.map((img, idx) => (
                <img
                  key={idx}
                  src={img}
                  alt={`img-${idx}`}
                  className="w-96 h-56 object-cover rounded-lg shadow-lg"
                />
              ))}
            </div>
          </div>
        </div>

        {/* Right Panel (Mobile: static single column) */}
        <div className="md:hidden w-full px-6 pb-10">
          <div className="flex flex-col gap-4 max-w-md mx-auto">
            {leftColumn.map((img, idx) => (
              <img
                key={`m-${idx}`}
                src={img}
                alt={`mobile-img-${idx}`}
                className="w-full h-40 object-cover rounded-lg shadow-lg"
                loading="lazy"
              />
            ))}
          </div>
        </div>

        {/* Tailwind CSS animation */}
        <style>
          {`
            @keyframes scroll {
              0% { transform: translateY(0); }
              100% { transform: translateY(-50%); } 
            }
            .animate-scroll {
              animation: scroll 20s linear infinite;
            }
          `}
        </style>
      </div>

      {/* If navigated with #blog, ensure smooth scroll into view on mount/hash change */}
      {location?.hash && (
        <span style={{display:'none'}} />
      )}
      {/* side-effect: scroll to blog when hash matches */}
      {(() => {
        if (location?.hash === '#blog') {
          try {
            const el = document.getElementById('blog');
            if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
          } catch (_) {}
        }
        return null;
      })()}

      {/* Auctions Section BELOW Hero */}
      <AllProducts onlyLiveUpcoming={true} title="Auctions" />

      {/* WHY YOU'LL LOVE IT */}
      <section className="max-w-7xl mx-auto px-6 py-20">
        <p className="text-center text-sm tracking-widest text-gray-400 mb-2">WHY YOU'LL LOVE IT</p>
        <h2 className="text-center text-3xl md:text-4xl font-semibold mb-12">Auction fun, your way</h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Real-time action */}
          <div className="border border-gray-800 rounded-xl p-6 bg-black/40 transition-all duration-300 hover:border-purple-500/60 hover:shadow-[0_0_24px_rgba(168,85,247,0.35)] hover:-translate-y-1">
            <div className="text-purple-400 text-xl mb-3">✓</div>
            <h3 className="text-xl font-medium mb-2">Real-time action</h3>
            <p className="text-gray-400">Bid live, feel the rush. Every second counts—don't blink or you'll miss it.</p>
          </div>

          {/* Private rooms */}
          <div className="border border-gray-800 rounded-xl p-6 bg-black/40 transition-all duration-300 hover:border-purple-500/60 hover:shadow-[0_0_24px_rgba(168,85,247,0.35)] hover:-translate-y-1">
            <div className="text-purple-400 text-xl mb-3">📅</div>
            <h3 className="text-xl font-medium mb-2">Private rooms</h3>
            <p className="text-gray-400">Host your own auction party. Invite friends or keep it just for you.</p>
          </div>

          {/* Live alerts */}
          <div className="border border-gray-800 rounded-xl p-6 bg-black/40 transition-all duration-300 hover:border-purple-500/60 hover:shadow-[0_0_24px_rgba(168,85,247,0.35)] hover:-translate-y-1">
            <div className="text-purple-400 text-xl mb-3">💬</div>
            <h3 className="text-xl font-medium mb-2">Live alerts</h3>
            <p className="text-gray-400">Get instant pings for every bid and win. Stay ahead, always.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
          {/* Fast checkout */}
          <div className="border border-gray-800 rounded-xl p-6 bg-black/40 transition-all duration-300 hover:border-purple-500/60 hover:shadow-[0_0_24px_rgba(168,85,247,0.35)] hover:-translate-y-1">
            <div className="text-purple-400 text-xl mb-3">✺</div>
            <h3 className="text-xl font-medium mb-2">Fast checkout</h3>
            <p className="text-gray-400">Win, pay, done.</p>
          </div>

          {/* Track it all */}
          <div className="border border-gray-800 rounded-xl p-6 bg-black/40 transition-all duration-300 hover:border-purple-500/60 hover:shadow-[0_0_24px_rgba(168,85,247,0.35)] hover:-translate-y-1">
            <div className="text-purple-400 text-xl mb-3">🧑</div>
            <h3 className="text-xl font-medium mb-2">Track it all</h3>
            <p className="text-gray-400">See your bids and wins at a glance. Stay organized, stay winning.</p>
          </div>
        </div>
      </section>
      {/* FAQ moved to global component */}

      {/* About moved to global component */}

      {/* Contact moved to global component */}

      {/* CTA Section */}
      <div className="w-full bg-[#241b2e]">
        <section className="max-w-7xl mx-auto px-6 py-24">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-10 items-center">
          {/* Left: Big headline */}
          <div>
            <h2 className="text-5xl md:text-6xl font-extrabold leading-tight text-white">
              Bid live.
              <br />
              Win every time.
            </h2>
          </div>

          {/* Right: points + buttons */}
          <div>
            <ul className="space-y-5">
              <li className="flex items-center justify-between gap-4 pb-4 border-b border-[#2f2740]">
                <div className="flex items-center gap-3 text-gray-300">
                  <span aria-hidden className="text-purple-400">→</span>
                  Jump into live auctions—anywhere, anytime.
                </div>
              </li>
              <li className="flex items-center justify-between gap-4 pb-4 border-b border-[#2f2740]">
                <div className="flex items-center gap-3 text-gray-300">
                  <span aria-hidden className="text-purple-400">→</span>
                  Host your own private bidding room.
                </div>
              </li>
              <li className="flex items-center justify-between gap-4 pb-2">
                <div className="flex items-center gap-3 text-gray-300">
                  <span aria-hidden className="text-purple-400">→</span>
                  Snag deals instantly. No waiting.
                </div>
              </li>
            </ul>

            <div className="mt-6 flex items-center gap-3">
              <a href="/room" className="px-5 py-2 rounded bg-purple-500 hover:bg-purple-600 text-black font-semibold">Bid now</a>
              <a href="/register" className="px-5 py-2 rounded bg-purple-700/40 border border-purple-600 text-purple-200 hover:bg-purple-700/60">Join free</a>
            </div>
          </div>
          </div>
        </section>
      </div>

      {/* Footer moved to global component */}
    </div>
  );
}

export default Home;
