import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

const DASHBOARD_BY_ROLE = {
  CUSTOMER: "/dashboard/customer",
  BUSINESS_OWNER: "/dashboard/business",
  EMPLOYEE: "/dashboard/employee",
  ADMIN: "/dashboard/admin",
};

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const user = await login(form.email, form.password);
      navigate(DASHBOARD_BY_ROLE[user.role] || "/");
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="container">
      <div className="card form-card">
        <h2>Sign in</h2>
        {error && <div className="alert alert-error">{error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="field">
            <label>Email</label>
            <input type="email" required value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />
          </div>
          <div className="field">
            <label>Password</label>
            <input type="password" required value={form.password} onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))} />
          </div>
          <button className="btn btn-primary btn-block" disabled={busy}>
            {busy ? "Signing in…" : "Sign in"}
          </button>
        </form>
        <p style={{ marginTop: 16, fontSize: "0.85rem" }}>
          No account? <Link to="/register">Create one</Link>
        </p>
        <p style={{ fontSize: "0.78rem", color: "var(--ink-2)" }}>
          Seed accounts (password: <code>password123</code>): admin@platform.test,
          owner.barber@platform.test, employee1@platform.test, customer1@platform.test
        </p>
      </div>
    </div>
  );
}
