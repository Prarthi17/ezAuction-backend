import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import "../../styles/auth.css"; // dark-themed styles

function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await axios.post(
        "http://localhost:5000/api/users/login",
        { email, password },
        { withCredentials: true }
      );

      console.log("Login successful:", res.data);
      alert(`Welcome back, ${res.data.name}! Redirecting to home...`);
      navigate("/"); // redirect to home
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
      <h2>Login</h2>
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
          {loading ? "Logging in..." : "Login"}
        </button>
      </form>
      <p style={{ marginTop: "15px", color: "#ccc" }}>
        Don't have an account?{" "}
        <span
          style={{ color: "#A78BFA", cursor: "pointer" }}
          onClick={() => navigate("/signup")}
        >
          Signup
        </span>
      </p>
    </div>
  );
}

export default Login;
