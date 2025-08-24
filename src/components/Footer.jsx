import React from "react";

function Footer() {
  return (
    <footer className="border-t border-gray-800 mt-0">
      <div className="max-w-7xl mx-auto px-6 py-10">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 text-gray-300">
          {/* Brand */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <img src="/logo.png" alt="Logo" className="h-8 w-auto" />
              <span className="text-white font-semibold tracking-wide hover:text-purple-400 transition-colors">EZAUCTION</span>
            </div>
            <div className="flex items-center gap-4 text-gray-400">
              <a className="hover:text-purple-400" href="#" aria-label="Facebook">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="w-5 h-5 fill-current"><path d="M22 12a10 10 0 1 0-11.6 9.9v-7h-2.4V12h2.4V9.8c0-2.4 1.4-3.8 3.5-3.8.999 0 2.043.18 2.043.18v2.24h-1.151c-1.134 0-1.487.704-1.487 1.425V12h2.53l-.404 2.9h-2.126v7A10 10 0 0 0 22 12Z"/></svg>
              </a>
              <a className="hover:text-purple-400" href="#" aria-label="Instagram">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="w-5 h-5 fill-current"><path d="M7 2h10a5 5 0 0 1 5 5v10a5 5 0 0 1-5 5H7a5 5 0 0 1-5-5V7a5 5 0 0 1 5-5Zm0 2a3 3 0 0 0-3 3v10a3 3 0 0 0 3 3h10a3 3 0 0 0 3-3V7a3 3 0 0 0-3-3H7Zm5 3.5A5.5 5.5 0 1 1 6.5 13 5.5 5.5 0 0 1 12 7.5Zm0 2A3.5 3.5 0 1 0 15.5 13 3.5 3.5 0 0 0 12 9.5Zm5-2.25a1.25 1.25 0 1 1-1.25 1.25A1.25 1.25 0 0 1 17 7.25Z"/></svg>
              </a>
              <a className="hover:text-purple-400" href="#" aria-label="X">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="w-5 h-5 fill-current"><path d="M18.146 3H21l-6.46 7.373L22.5 21h-6.59l-4.6-5.34L6 21H3l6.89-7.867L1.5 3h6.75l4.2 4.89L18.146 3Zm-1.15 16.2h1.7L7.08 4.66H5.27Z"/></svg>
              </a>
              <a className="hover:text-purple-400" href="#" aria-label="LinkedIn">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="w-5 h-5 fill-current"><path d="M20.447 20.452H17.21v-5.57c0-1.328-.024-3.036-1.85-3.036-1.853 0-2.136 1.447-2.136 2.943v5.663H9v-11.49h3.11v1.57h.044c.433-.82 1.492-1.686 3.068-1.686 3.283 0 3.889 2.16 3.889 4.97v6.636ZM5.337 7.433a1.803 1.803 0 1 1 0-3.606 1.803 1.803 0 0 1 0 3.606Zm-1.62 13.019h3.24V8.96h-3.24v11.49ZM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.226.792 24 1.771 24h20.451c.98 0 1.771-.774 1.771-1.729V1.73C23.996.774 23.205 0 22.225 0Z"/></svg>
              </a>
              <a className="hover:text-purple-400" href="#" aria-label="YouTube">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="w-6 h-5 fill-current"><path d="M23.5 6.2a3 3 0 0 0-2.1-2.1C19.2 3.5 12 3.5 12 3.5s-7.2 0-9.4.6A3 3 0 0 0 .5 6.2 31.2 31.2 0 0 0 0 12a31.2 31.2 0 0 0 .6 5.8 3 3 0 0 0 2.1 2.1c2.2.6 9.4.6 9.4.6s7.2 0 9.4-.6a3 3 0 0 0 2.1-2.1c.4-1.9.6-3.9.6-5.8s-.2-3.9-.6-5.8ZM9.6 15.5v-7l6.2 3.5Z"/></svg>
              </a>
            </div>
          </div>

          {/* Explore */}
          <div>
            <h4 className="text-purple-400 font-semibold mb-3">Explore</h4>
            <ul className="space-y-2 text-sm">
              <li><a href="/" className="hover:text-purple-300">Home</a></li>
              <li><a href="/#about" className="hover:text-purple-300">About</a></li>
              <li><a href="#" className="hover:text-purple-300">Services</a></li>
              <li><a href="/#contact" className="hover:text-purple-300">Contact</a></li>
              <li><a href="/#blog" className="hover:text-purple-300">Blog</a></li>
            </ul>
          </div>

          {/* Discover */}
          <div>
            <h4 className="text-purple-400 font-semibold mb-3">Discover</h4>
            <ul className="space-y-2 text-sm">
              <li><a href="/room" className="hover:text-purple-300">Auctions</a></li>
              <li><a href="/room" className="hover:text-purple-300">Bidding</a></li>
              <li><a href="/room" className="hover:text-purple-300">Rooms</a></li>
              <li><a href="#" className="hover:text-purple-300">Support</a></li>
              <li><a href="#" className="hover:text-purple-300">FAQ</a></li>
            </ul>
          </div>

          {/* Connect */}
          <div>
            <h4 className="text-purple-400 font-semibold mb-3">Connect</h4>
            <ul className="space-y-2 text-sm">
              <li><a href="#" className="hover:text-purple-300">Privacy</a></li>
              <li><a href="#" className="hover:text-purple-300">Terms</a></li>
              <li><a href="#" className="hover:text-purple-300">Policy</a></li>
            </ul>
          </div>
        </div>

        <div className="mt-6 border-t border-gray-800 pt-4 flex flex-col md:flex-row items-center justify-between text-sm text-gray-400">
          <div>All rights reserved {new Date().getFullYear()}</div>
          <div className="flex items-center gap-6 mt-3 md:mt-0">
            <a href="#" className="hover:text-purple-300">Help</a>
            <a href="#" className="hover:text-purple-300">Feedback</a>
            <a href="#" className="hover:text-purple-300">Sitemap</a>
          </div>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
