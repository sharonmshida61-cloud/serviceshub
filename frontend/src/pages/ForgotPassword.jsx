import { useState } from "react";
import { Link } from "react-router-dom";
import { useLanguage } from "../context/LanguageContext.jsx";

export default function ForgotPassword() {
  const { t } = useLanguage();
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setBusy(true);
    // Simulate a request — replace with a real API call when the endpoint is ready
    await new Promise((r) => setTimeout(r, 800));
    setBusy(false);
    setSubmitted(true);
  }

  return (
    <div className="container">
      <div className="card form-card">
        <h2>{t("auth.forgot.title")}</h2>

        {submitted ? (
          <>
            <div className="alert alert-success">
              {t("auth.forgot.success", "If an account exists for {email}, a reset link has been sent. Check your inbox.").replace("{email}", email)}
            </div>
            <p style={{ marginTop: 16, fontSize: "0.85rem" }}>
              <Link to="/login">Back to sign in</Link>
            </p>
          </>
        ) : (
          <>
            <p style={{ marginBottom: 16, fontSize: "0.9rem", color: "var(--ink-2)" }}>
              {t("auth.forgot.subtitle")}
            </p>
            <form onSubmit={handleSubmit}>
              <div className="field">
                <label>{t("auth.forgot.email")}</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                />
              </div>
              <button className="btn btn-primary btn-block" disabled={busy}>
                {busy ? t("auth.forgot.submitting") : t("auth.forgot.submit")}
              </button>
            </form>
            <p style={{ marginTop: 16, fontSize: "0.85rem" }}>
              <Link to="/login">Back to sign in</Link>
            </p>
          </>
        )}
      </div>
    </div>
  );
}
