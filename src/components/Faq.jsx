import React, { useEffect } from "react";

function Faq() {
  // Reveal animation for FAQ headings and intro text
  useEffect(() => {
    try {
      const els = document.querySelectorAll('#faq .reveal-left');
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
    <section id="faq" className="max-w-7xl mx-auto px-6 py-20 scroll-mt-24">
      {/* Local styles for reveal animation */}
      <style>{`
        #faq .reveal-left { opacity: 0; transform: translateX(-24px); transition: opacity 1200ms ease, transform 1200ms ease; }
        #faq .reveal-left.show { opacity: 1; transform: translateX(0); }
      `}</style>
      <p className="text-sm tracking-widest text-gray-400 mb-2">FAQ</p>
      <h2 className="text-4xl md:text-5xl font-semibold mb-3 reveal-left text-white">Bidding, made easy</h2>
      <p className="text-gray-300 mb-10 max-w-3xl reveal-left">Your auction questions, answered fast. Get the scoop on live bidding, personal rooms, and winning big—no confusion, just clarity.</p>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="p-6 bg-transparent border-l border-gray-800 transform transition-transform duration-300 md:duration-500 hover:scale-110 origin-left will-change-transform">
          <h3 className="text-lg font-semibold mb-2 text-white">How do live auctions work?</h3>
          <p className="text-gray-400 text-sm">Join a live room, watch the bids fly, and click to compete. When the timer hits zero, the top bid takes it home!</p>
        </div>
        <div className="p-6 bg-transparent border-l border-gray-800 transform transition-transform duration-300 md:duration-500 hover:scale-110 origin-left will-change-transform">
          <h3 className="text-lg font-semibold mb-2 text-white">Can I create my own auction room?</h3>
          <p className="text-gray-400 text-sm">You bet! Launch a room in a flash. Go solo, invite friends, or open it up—your auction, your vibe.</p>
        </div>
        <div className="p-6 bg-transparent border-l border-gray-800 transform transition-transform duration-300 md:duration-500 hover:scale-110 origin-left will-change-transform">
          <h3 className="text-lg font-semibold mb-2 text-white">What if two people bid at once?</h3>
          <p className="text-gray-400 text-sm">First click wins! The system locks in the fastest bid. Missed it? No sweat—there’s always another shot.</p>
        </div>
        <div className="p-6 bg-transparent border-l border-gray-800 transform transition-transform duration-300 md:duration-500 hover:scale-110 origin-left will-change-transform">
          <h3 className="text-lg font-semibold mb-2 text-white">Is there a fee to join or bid?</h3>
          <p className="text-gray-400 text-sm">No entry fees, no bidding costs. Only pay if you win—simple, fair, and fun every time.</p>
        </div>
        <div className="p-6 bg-transparent border-l border-gray-800 transform transition-transform duration-300 md:duration-500 hover:scale-110 origin-left will-change-transform">
          <h3 className="text-lg font-semibold mb-2 text-white">How do I know if I’ve won?</h3>
          <p className="text-gray-400 text-sm">A bid winner alert pops up and you’ll get a message right away. Check your dashboard for all your wins.</p>
        </div>
        <div className="p-6 bg-transparent border-l border-gray-800 transform transition-transform duration-300 md:duration-500 hover:scale-110 origin-left will-change-transform">
          <h3 className="text-lg font-semibold mb-2 text-white">Can I bid from my phone?</h3>
          <p className="text-gray-400 text-sm">Absolutely! Bid on any device—phone, tablet, or laptop. Auctions go wherever you do.</p>
        </div>
      </div>
    </section>
  );
}

export default Faq;
