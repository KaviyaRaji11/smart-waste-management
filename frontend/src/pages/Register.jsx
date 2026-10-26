import React, { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { WasteArt } from "../components/AuthArt";
import { BrandMark, Icon, Alert } from "../components/ui";
import "../auth.css";

const SLIDES = [
  "Report overflowing bins in seconds",
  "Smart priorities for faster collection",
  "Cleaner streets, healthier cities",
];

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ firstName: "", lastName: "", email: "", password: "", role: "citizen", agree: false });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [show, setShow] = useState(false);
  const [slide, setSlide] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setSlide((s) => (s + 1) % SLIDES.length), 4000);
    return () => clearInterval(t);
  }, []);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm({ ...form, [name]: type === "checkbox" ? checked : value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const name = `${form.firstName} ${form.lastName}`.trim();
      const user = await register(name, form.email, form.password, form.role);
      if (user.role === "staff") navigate("/staff/tasks");
      else navigate("/citizen/my-reports");
    } catch (err) {
      setError(err.response?.data?.message || "Registration failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="auth-page auth-page-split">
      <div className="auth-split">
        <div className="auth-art">
          <WasteArt />
          <div className="auth-art-top">
            <span className="auth-wordmark"><BrandMark size={32} /> Smart Waste</span>
            <Link to="/" className="auth-art-back">Back to home <Icon name="arrowRight" size={14} /></Link>
          </div>
          <div className="auth-art-bottom">
            <p key={slide} className="auth-tagline">{SLIDES[slide]}</p>
            <div className="auth-dots" aria-hidden="true">
              {SLIDES.map((_, i) => <span key={i} className={i === slide ? "on" : ""} />)}
            </div>
          </div>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          <h1>Create an account</h1>
          <p className="auth-sub">Already have an account? <Link to="/login">Log in</Link></p>
          {error && <Alert type="error">{error}</Alert>}

          <div className="field-row">
            <div className="field">
              <label htmlFor="firstName">First name</label>
              <input id="firstName" type="text" name="firstName" placeholder="First name" value={form.firstName} onChange={handleChange} required autoComplete="given-name" />
            </div>
            <div className="field">
              <label htmlFor="lastName">Last name</label>
              <input id="lastName" type="text" name="lastName" placeholder="Last name" value={form.lastName} onChange={handleChange} autoComplete="family-name" />
            </div>
          </div>

          <div className="field">
            <label htmlFor="reg-email">Email</label>
            <input id="reg-email" type="email" name="email" placeholder="you@example.com" value={form.email} onChange={handleChange} required autoComplete="email" />
          </div>

          <div className="field">
            <label htmlFor="reg-password">Password</label>
            <div className="input-wrap">
              <input id="reg-password" type={show ? "text" : "password"} name="password" placeholder="Enter your password (min 6 characters)" value={form.password} onChange={handleChange} required minLength={6} autoComplete="new-password" />
              <button type="button" className="input-action" onClick={() => setShow(!show)} aria-label={show ? "Hide password" : "Show password"}>
                <Icon name={show ? "eyeOff" : "eye"} size={18} />
              </button>
            </div>
          </div>

          <div className="field">
            <label htmlFor="role">I am a</label>
            <select id="role" name="role" value={form.role} onChange={handleChange}>
              <option value="citizen">I am a Citizen</option>
              <option value="staff">I am Collection Staff</option>
            </select>
          </div>

          <label className="check">
            <input type="checkbox" name="agree" checked={form.agree} onChange={handleChange} required />
            <span>I agree to the <u>Terms &amp; Conditions</u></span>
          </label>

          <button type="submit" className="btn btn-primary btn-lg btn-block" disabled={busy}>{busy ? "Creating..." : "Create account"}</button>
          <p className="auth-note">Admin accounts are provisioned separately, not through public sign-up.</p>
        </form>
      </div>
    </div>
  );
}
