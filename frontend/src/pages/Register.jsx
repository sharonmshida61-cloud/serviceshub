import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    phone: "",
    asCustomer: true,
    asBusinessOwner: false,
  });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.asCustomer && !form.asBusinessOwner) {
      setError("Please select at least one role");
      return;
    }
    setError("");
    setBusy(true);
    try {
      const user = await register(form);
      // Navigate to the appropriate dashboard based on current role
      const currentRole = user.currentRole || user.role;
      navigate(currentRole === "BUSINESS_OWNER" ? "/dashboard/business" : "/dashboard/customer");
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="container">
      <div className="card form-card">
        <h2>Create your account</h2>
        {error && <div className="alert alert-error">{error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="field">
            <label>Full name</label>
            <input required value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
          </div>
          <div className="field">
            <label>Email</label>
            <input type="email" required value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />
          </div>
          <div className="field">
            <label>Password</label>
            <input type="password" required minLength={6} value={form.password} onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))} />
          </div>
          <div className="field">
            <label>Phone (optional)</label>
            <input type="tel" value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} />
          </div>
          <div className="field">
            <label>What do you want to do?</label>
            <div className="checkbox-row" style={{ marginBottom: "12px" }}>
              <input
                type="checkbox"
                checked={form.asCustomer}
                onChange={(e) => setForm((f) => ({ ...f, asCustomer: e.target.checked }))}
              />
              <label style={{ marginBottom: 0 }}>Book services as a customer</label>
            </div>
            <div className="checkbox-row">
              <input
                type="checkbox"
                checked={form.asBusinessOwner}
                onChange={(e) => setForm((f) => ({ ...f, asBusinessOwner: e.target.checked }))}
              />
              <label style={{ marginBottom: 0 }}>List my business and accept bookings</label>
            </div>
            <div className="hint">You can change these anytime from your dashboard.</div>
          </div>
          <button className="btn btn-primary btn-block" disabled={busy}>
            {busy ? "Creating account…" : "Create account"}
          </button>
        </form>
        <p style={{ marginTop: 16, fontSize: "0.85rem" }}>
          Already have an account? <Link to="/login">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
