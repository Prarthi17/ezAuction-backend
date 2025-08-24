import React from "react";

function ContactSection() {
  return (
    <section id="contact" className="max-w-7xl mx-auto px-0 md:px-6 py-20">
      <h2 className="text-3xl font-bold mb-4 text-white">Contact Us</h2>
      <p className="text-gray-300 mb-6">Have questions or feedback? Send us a message and we’ll get back to you.</p>
      <form
        className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full"
        onSubmit={(e) => {
          e.preventDefault();
          const name = e.target.name.value;
          const email = e.target.email.value;
          const msg = e.target.message.value;
          window.location.href = `mailto:support@example.com?subject=Support%20Request%20from%20${encodeURIComponent(
            name
          )}&body=${encodeURIComponent(msg + "\n\nFrom: " + email)}`;
        }}
      >
        <input
          name="name"
          required
          placeholder="Your name"
          className="w-full bg-gray-900 border border-gray-800 rounded p-3 text-white"
        />
        <input
          name="email"
          type="email"
          required
          placeholder="Your email"
          className="w-full bg-gray-900 border border-gray-800 rounded p-3 text-white"
        />
        <textarea
          name="message"
          required
          placeholder="Your message"
          className="w-full md:col-span-2 bg-gray-900 border border-gray-800 rounded p-3 h-32 text-white"
        />
        <div className="md:col-span-2">
          <button
            type="submit"
            className="w-full md:w-auto bg-purple-500 hover:bg-purple-600 text-black font-medium text-lg px-16 py-3 rounded-lg whitespace-nowrap"
          >
            Send
          </button>
        </div>
      </form>
    </section>
  );
}

export default ContactSection;
