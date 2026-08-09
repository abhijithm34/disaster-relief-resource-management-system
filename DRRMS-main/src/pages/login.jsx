import React, { useState } from "react";
import { API_URL } from "../config/api";
import "../styles/login.css";

function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("citizen");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError(""); // Reset error state

    if (!email || !password || !role) {
      setError("Please fill all fields");
      return;
    }

    setIsLoading(true); // Set loading state to true

    try {
      // Adjusted URL based on your backend API
      const response = await fetch(`${API_URL}/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password, role }),
        credentials: "include",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Login failed");
      }

      // Store user and token in localStorage
      localStorage.setItem("user", JSON.stringify(data.user));  // Storing the user object
      localStorage.setItem("token", data.token);

      const routes = {
        volunteer: "/volunteer",
        admin: "/admin",
        citizen: "/citizen",
      };

      // Reloading makes the route guard read the just-saved authenticated session.
      const destination = routes[data.user.role.toLowerCase()] || "/";
      window.location.assign(destination);

    } catch (err) {
      // Handle errors
      console.error("Login error:", err);
      setError(err.message || "Login failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-image-section">
        <div className="welcome-text">
          <h1>Disaster Relief Resource Management</h1>
          <p>Helping you connect with relief during a crisis</p>
        </div>
      </div>

      <div className="login-form-section">
        <form className="login-card" onSubmit={handleLogin}>
          <h2>Login</h2>

          {/* Error message display */}
          {error && (
            <div className="error-message">
              {error}
            </div>
          )}

          {/* User role selection */}
          <label htmlFor="role-select">Role:</label>
          <select
            id="role-select"
            value={role}
            onChange={(e) => setRole(e.target.value)}
            required
          >
            <option value="citizen">Citizen</option>
            <option value="volunteer">Volunteer</option>
            <option value="admin">Admin</option>
          </select>

          {/* Email input */}
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          {/* Password input */}
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          {/* Submit button */}
          <button 
            type="submit" 
            className="login-button"
            disabled={isLoading}
          >
            {isLoading ? "Logging in..." : "Login"}
          </button>

          {/* Register link */}
          <p className="link-text">
            New user? <a href="/register">Register here</a>
          </p>
        </form>
      </div>
    </div>
  );
}

export default Login;
