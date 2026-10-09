import { useState } from "react";
import { Link } from "react-router-dom";
import AuthAside from "../components/AuthAside.jsx";
import { api } from "../api";
import { useLanguage } from "../context/LanguageContext.jsx";

export default function ForgotPassword() {
  const { t } = useLanguage();
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [devUrl, setDevUrl] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const res = await api.forgotPassword({ email });
      setDevUrl(res.devResetUrl || "");
      setSubmitted(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="auth-screen">
      <span className="auth-decor auth-decor--tl" aria-hidden="true" />
      <span className="auth-decor auth-decor--br" aria-hidden="true" />

      <div className="auth-card">
        <AuthAside />

        <main className="auth-panel">
          <h1>{t("auth.forgot.title")}</h1>
          <p className="auth-sub">{t("auth.forgot.subtitle")}</p>

          <svg
            className="auth-illus"
            viewBox="0 0 120 76"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.4"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <g strokeDasharray="4 5">
              <path d="M2 18h16" />
              <path d="M2 30h24" />
              <path d="M2 42h16" />
              <path d="M2 54h24" />
            </g>
            <rect x="40" y="10" width="78" height="56" rx="4" />
            <path d="M40.5 13.5 79 41l38.5-27.5" />
          </svg>

          {error && <div className="alert alert-error">{error}</div>}

          {submitted ? (
            <>
              <div className="auth-hint auth-hint--sent">
                {t("auth.forgot.success", "If an account exists for {email}, a reset link has been sent. Check your inbox.").replace("{email}", email)}
              </div>
              {devUrl && (
                <p className="auth-notice">
                  {t("auth.forgot.devNotice")}{" "}
                  <a href={devUrl}>{t("auth.forgot.devLink")}</a>
                </p>
              )}
            </>
          ) : (
            <>
              <div className="auth-hint">{t("auth.forgot.hint")}</div>
              <form onSubmit={handleSubmit}>
                <div className="field">
                  <label htmlFor="forgot-email">{t("auth.forgot.email")}</label>
                  <input
                    id="forgot-email"
                    type="email"
                    required
                    autoComplete="email"
                    placeholder={t("auth.login.emailPlaceholder")}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
                <button type="submit" className="auth-submit" disabled={busy}>
                  {busy ? t("auth.forgot.submitting") : t("auth.forgot.submit")}
                </button>
              </form>
            </>
          )}

          <p className="auth-foot auth-foot--underlined">
            {t("auth.forgot.remember")}{" "}
            <Link to="/login" aria-label={t("auth.forgot.backToLogin")}>
              {t("auth.forgot.clickHere")}
            </Link>
          </p>
        </main>
      </div>
    </div>
  );
}
