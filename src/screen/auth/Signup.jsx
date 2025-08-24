import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import "../../styles/auth.css"; // make sure path is correct

function Signup() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [photo, setPhoto] = useState(null);
  const [role, setRole] = useState("buyer"); // default role
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const formData = new FormData();
      formData.append("name", name);
      formData.append("email", email);
      formData.append("password", password);
      formData.append("role", role); // append role
      if (photo) formData.append("photo", photo);

      const res = await axios.post(
        "http://localhost:5000/api/users/register",
        formData,
        { withCredentials: true }
      );

      console.log("Signup successful:", res.data);
      alert("Signup successful! Redirecting to home...");
      navigate("/"); // redirect to home
    } catch (error) {
      let message = "Signup failed";
      if (error.response)
        message = error.response.data?.message || error.response.statusText;
      else if (error.request) message = "No response from server.";
      else message = error.message;
      alert(message);
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <h2>Signup</h2>
      <form onSubmit={handleSubmit} encType="multipart/form-data">
        <input
          type="text"
          placeholder="Full Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
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
        <select
          value={role}
          onChange={(e) => setRole(e.target.value)}
          required
        >
          <option value="buyer">Buyer</option>
          <option value="seller">Seller</option>
          <option value="admin">Admin</option>
        </select>
        <input
          type="file"
          onChange={(e) => setPhoto(e.target.files[0])}
          accept="image/*"
        />
        <button type="submit" disabled={loading}>
          {loading ? "Signing up..." : "Signup"}
        </button>
      </form>
      <p style={{ marginTop: "15px", color: "#ccc" }}>
        Already have an account?{" "}
        <span
          style={{ color: "#A78BFA", cursor: "pointer" }}
          onClick={() => navigate("/login")}
        >
          Login
        </span>
      </p>
    </div>
  );
}

export default Signup;
