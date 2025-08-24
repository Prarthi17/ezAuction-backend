import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import "../../styles/auth.css"; // make sure path is correct

function SellerLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await axios.post(
        "http://localhost:5000/api/users/seller",
        { email, password },
        { withCredentials: true }
      );

      console.log("Seller login successful:", res.data);
      alert(`Welcome, ${res.data.name}! Redirecting to home...`);

      // Redirect to home page
      navigate("/");
    } catch (error) {
      let message = "Login failed";

      if (error.response) {
        message = error.response.data?.message || error.response.statusText;
        console.error("Response error:", error.response);
      } else if (error.request) {
        message = "No response from server. Please check backend.";
        console.error("Request error:", error.request);
      } else {
        message = error.message;
        console.error("Error:", error);
      }

      alert(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <h2>Seller Login</h2>
      <form onSubmit={handleSubmit}>
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        <button type="submit" disabled={loading}>
          {loading ? "Logging in..." : "Login as Seller"}
        </button>
      </form>
      <p>
        Don't have a seller account? <Link to="/signup">Signup</Link>
      </p>
    </div>
  );
}

export default SellerLogin;
