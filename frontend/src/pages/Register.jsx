import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { useLanguage } from "../context/LanguageContext.jsx";

const EyeIcon = ({ open }) =>
  open ? (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  ) : (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.94 17.94A10.94 10.94 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  );

export default function Register() {
  const { register } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    phone: "",
    asCustomer: true,
    asBusinessOwner: false,
  });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.asCustomer && !form.asBusinessOwner) {
      setError(t("auth.register.atLeastOne"));
      return;
    }
    setError("");
    setBusy(true);
    try {
      const user = await register(form);
      // If they registered as a business owner, send them to the dashboard
      // with a notice that their account is pending admin approval before
      // they can list a business.
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
        <h2>{t("auth.register.title")}</h2>
        {error && <div className="alert alert-error">{error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="field">
            <label>{t("auth.register.name")}</label>
            <input required value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
          </div>
          <div className="field">
            <label>{t("auth.register.email")}</label>
            <input type="email" required value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />
          </div>
          <div className="field">
            <label>{t("auth.register.password")}</label>
            <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
              <input
                type={showPassword ? "text" : "password"}
                required
                minLength={6}
                value={form.password}
                onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                style={{ paddingRight: "2.4rem", width: "100%" }}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                style={{
                  position: "absolute",
                  right: "0.6rem",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  color: "var(--ink-2)",
                  display: "flex",
                  alignItems: "center",
                  padding: 0,
                }}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                <EyeIcon open={showPassword} />
              </button>
            </div>
          </div>
          <div className="field">
            <label>{t("auth.register.phone")}</label>
            <input type="tel" value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} />
          </div>
          <div className="field">
            <label>{t("auth.register.role")}</label>
            <div className="checkbox-row" style={{ marginBottom: "12px" }}>
              <input
                type="checkbox"
                checked={form.asCustomer}
                onChange={(e) => setForm((f) => ({ ...f, asCustomer: e.target.checked }))}
              />
              <label style={{ marginBottom: 0 }}>{t("auth.register.customer")}</label>
            </div>
            <div className="checkbox-row">
              <input
                type="checkbox"
                checked={form.asBusinessOwner}
                onChange={(e) => setForm((f) => ({ ...f, asBusinessOwner: e.target.checked }))}
              />
              <label style={{ marginBottom: 0 }}>{t("auth.register.businessOwner")}</label>
            </div>
            <div className="hint">{t("auth.register.roleHint")}</div>
          </div>
          <button className="btn btn-primary btn-block" disabled={busy}>
            {busy ? t("auth.register.submitting") : t("auth.register.submit")}
          </button>
        </form>
        <p style={{ marginTop: 16, fontSize: "0.85rem" }}>
          {t("auth.register.hasAccount")} <Link to="/login">{t("auth.register.login")}</Link>
        </p>
      </div>
    </div>
  );
}
