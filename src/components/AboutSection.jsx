import React, { useEffect } from "react";

function AboutSection() {
  // Reveal animation for About headings and intro text
  useEffect(() => {
    try {
      const els = document.querySelectorAll('#about .reveal-left');
      if (!els || els.length === 0) return;
      if (!("IntersectionObserver" in window)) {
        els.forEach((el) => el.classList.add('show'));
        return;
      }
      const io = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('show');
          }
        });
      }, { threshold: 0.2 });
      els.forEach((el) => io.observe(el));
      return () => {
        els.forEach((el) => io.unobserve(el));
        io.disconnect();
      };
    } catch (_) {}
  }, []);

  return (
    <section id="about" className="max-w-7xl mx-auto px-6 py-20 scroll-mt-24">
      {/* Local styles for reveal animation */}
      <style>{`
        #about .reveal-left { opacity: 0; transform: translateX(-24px); transition: opacity 1200ms ease, transform 1200ms ease; }
        #about .reveal-left.show { opacity: 1; transform: translateX(0); }
      `}</style>
      <h2 className="text-3xl font-bold mb-4 reveal-left text-white">About Us</h2>
      <p className="text-gray-300 max-w-3xl reveal-left">We’re building the most engaging live auction platform where buyers feel the rush and sellers get results. Real-time bidding, private rooms, and seamless payments—crafted for speed and trust.</p>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-5 transition-all duration-300 hover:border-purple-500/60 hover:shadow-[0_0_24px_rgba(168,85,247,0.35)]"><h3 className="font-semibold mb-2 text-white">Mission</h3><p className="text-gray-400 text-sm">Make auctions accessible, fair, and thrilling.</p></div>
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-5 transition-all duration-300 hover:border-purple-500/60 hover:shadow-[0_0_24px_rgba(168,85,247,0.35)]"><h3 className="font-semibold mb-2 text-white">Vision</h3><p className="text-gray-400 text-sm">A global marketplace powered by live moments.</p></div>
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-5 transition-all duration-300 hover:border-purple-500/60 hover:shadow-[0_0_24px_rgba(168,85,247,0.35)]"><h3 className="font-semibold mb-2 text-white">Trust</h3><p className="text-gray-400 text-sm">Verified users, secure flows, clear rules.</p></div>
      </div>
    </section>
  );
}

export default AboutSection;
