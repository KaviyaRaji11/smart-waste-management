import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { NightForest } from "../components/AuthArt";
import { BrandMark, Icon, Alert } from "../components/ui";
import "../auth.css";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [show, setShow] = useState(false);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const user = await login(form.email, form.password);
      if (user.role === "admin") navigate("/admin/reports");
      else if (user.role === "staff") navigate("/staff/tasks");
      else navigate("/citizen/my-reports");
    } catch (err) {
      setError(err.response?.data?.message || "Login failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="auth-page">
      <NightForest />
      <form className="auth-card" onSubmit={handleSubmit}>
        <div className="auth-brand"><BrandMark size={40} /><span>Smart Waste</span></div>
        <h1>Welcome back</h1>
        <p className="auth-sub">Log in to report, assign or collect.</p>

        {error && <Alert type="error">{error}</Alert>}

        <div className="field">
          <label htmlFor="email">Email</label>
          <div className="input-wrap">
            <Icon name="mail" size={18} className="input-icon" />
            <input id="email" type="email" name="email" placeholder="you@example.com" value={form.email} onChange={handleChange} required autoComplete="email" />
          </div>
        </div>

        <div className="field">
          <label htmlFor="password">Password</label>
          <div className="input-wrap">
            <Icon name="lock" size={18} className="input-icon" />
            <input id="password" type={show ? "text" : "password"} name="password" placeholder="Enter your password" value={form.password} onChange={handleChange} required autoComplete="current-password" />
            <button type="button" className="input-action" onClick={() => setShow(!show)} aria-label={show ? "Hide password" : "Show password"}>
              <Icon name={show ? "eyeOff" : "eye"} size={18} />
            </button>
          </div>
        </div>

        <button type="submit" className="btn btn-primary btn-lg btn-block" disabled={busy}>{busy ? "Logging in..." : "Login"}</button>
        <p className="auth-switch">Don't have an account? <Link to="/register">Register</Link></p>
        <Link to="/" className="auth-back"><Icon name="arrowLeft" size={14} /> Back to home</Link>
      </form>
    </div>
  );
}
