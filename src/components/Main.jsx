import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Navbar from "./Navbar";
import Faq from "./Faq";
import Footer from "./Footer";
import AboutSection from "./AboutSection";
import ContactSection from "./ContactSection";

// Import your pages/screens
import Home from "../screen/home/Home";
import Products from "../screen/products/Products";
import Blog from "../screen/blog/Blog";
import About from "../screen/about/About";
import Contact from "../screen/contact/Contact";
import Login from "../screen/auth/Login";
import Signup from "../screen/auth/Signup"; // Make sure this path is correct

import Search from "../screen/search/Search";
import SellerLogin from "../screen/seller/SellerLogin";
import Dashboard from "../screen/dashboard/Dashboard";
import Room from "../screen/room/Room";
import ProductDetail from "../screen/products/ProductDetail";
import LiveRoom from "../screen/live/LiveRoom";

function Main() {
  return (
    <Router>
      {/* Global smooth scrolling for anchor navigation */}
      <style>{`html { scroll-behavior: smooth; }`}</style>
      {/* Navbar is always visible */}
      <Navbar />

      {/* Define Routes */}
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/products" element={<Products />} />
        <Route path="/blog" element={<Blog />} />
        <Route path="/about" element={<About />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Signup />} />
        <Route path="/search" element={<Search />} />
        <Route path="/seller/login" element={<SellerLogin />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/room" element={<Room />} />
        <Route path="/product/:id" element={<ProductDetail />} />
        <Route path="/live/:id" element={<LiveRoom />} />
      </Routes>

      {/* Shared sections across all pages */}
      <Faq />
      <AboutSection />
      <ContactSection />
      <Footer />
    </Router>
  );
}

export default Main;
