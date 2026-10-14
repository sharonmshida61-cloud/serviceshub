import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import AuthAside from "../components/AuthAside.jsx";
import EyeIcon from "../components/EyeIcon.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { useLanguage } from "../context/LanguageContext.jsx";
import { dashboardPathFor } from "../utils/dashboardRoute.js";

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;

// Providers shown in the mockup that have no backend behind them yet.
const PLACEHOLDER_PROVIDERS = [
  { key: "facebook", icon: "https://api.iconify.design/mdi:facebook.svg?color=%23ffffff&height=18", cls: "auth-prov--facebook" },
  { key: "github", icon: "https://api.iconify.design/mdi:github.svg?color=%23ffffff&height=18", cls: "auth-prov--github" },
  { key: "twitter", icon: "https://api.iconify.design/mdi:twitter.svg?color=%23ffffff&height=18", cls: "auth-prov--twitter" },
];

const GOOGLE_ICON = "https://api.iconify.design/logos:google-icon.svg?height=18";

let gsiPromise = null;

function loadGoogleScripts() {
  if (window.google?.accounts?.id) return Promise.resolve();
  if (!gsiPromise) {
    gsiPromise = new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = "https://accounts.google.com/gsi/client";
      script.async = true;
      script.defer = true;
      script.onload = () => resolve();
      script.onerror = () => {
        gsiPromise = null;
        reject(new Error("Could not reach Google"));
      };
      document.head.appendChild(script);
    });
  }
  return gsiPromise;
}

export default function Login() {
  const { login, loginWithGoogle, authNotice } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();

  const [form, setForm] = useState({ email: "", password: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setNotice("");
    setBusy(true);
    try {
      const user = await login(form.email, form.password, remember);
      navigate(dashboardPathFor(user));
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function handleGoogle() {
    setError("");
    setNotice("");
    try {
      await loadGoogleScripts();
      await new Promise((resolve) => {
        window.google.accounts.id.initialize({
          client_id: GOOGLE_CLIENT_ID,
          auto_select: false,
          cancel_on_tap_outside: true,
          callback: async (response) => {
            try {
              const user = await loginWithGoogle(response.credential, remember);
              navigate(dashboardPathFor(user));
            } catch (err) {
              setError(err.message);
            }
            resolve();
          },
        });
        window.google.accounts.id.prompt((notification) => {
          if (notification.isNotDisplayed() || notification.isSkippedMoment() || notification.isDismissedMoment()) {
            resolve();
            setError(t("auth.login.googleUnavailable"));
          }
        });
      });
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="auth-screen">
      <span className="auth-decor auth-decor--tl" aria-hidden="true" />
      <span className="auth-decor auth-decor--br" aria-hidden="true" />

      <div className="auth-card">
        <AuthAside />

        <main className="auth-panel">
          <h1>{t("auth.login.title")}</h1>
          <p className="auth-sub">{t("auth.login.subtitle")}</p>

          {authNotice === "session-ended" && <div className="auth-hint">{t("auth.login.sessionEnded")}</div>}

          {error && <div className="alert alert-error">{error}</div>}

          <form onSubmit={handleSubmit}>
            <div className="field">
              <label htmlFor="auth-email">{t("auth.login.email")}</label>
              <input
                id="auth-email"
                type="email"
                required
                autoComplete="email"
                placeholder={t("auth.login.emailPlaceholder")}
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              />
            </div>

            <div className="field">
              <div className="auth-label-row">
                <label htmlFor="auth-password">{t("auth.login.password")}</label>
                <Link to="/forgot-password">{t("auth.login.forgotPassword")}</Link>
              </div>
              <div className="auth-pass">
                <input
                  id="auth-password"
                  type={showPassword ? "text" : "password"}
                  required
                  autoComplete="current-password"
                  placeholder={t("auth.login.passwordPlaceholder")}
                  value={form.password}
                  onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? t("auth.login.hidePassword") : t("auth.login.showPassword")}
                >
                  <EyeIcon open={showPassword} />
                </button>
              </div>
            </div>

            <label className="auth-remember">
              <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} />
              {t("auth.login.remember")}
            </label>

            <button type="submit" className="auth-submit" disabled={busy}>
              {busy ? t("auth.login.submitting") : t("auth.login.submit")}
            </button>
          </form>

          <div className="auth-divider">
            <span>{t("auth.login.socialDivider")}</span>
          </div>

          <div className="auth-providers">
            {GOOGLE_CLIENT_ID && (
              <button
                type="button"
                className="auth-prov auth-prov--google"
                onClick={handleGoogle}
                aria-label={t("auth.login.google")}
              >
                <img src={GOOGLE_ICON} alt="" />
              </button>
            )}
            {PLACEHOLDER_PROVIDERS.map((p) => (
              <button
                key={p.key}
                type="button"
                className={`auth-prov ${p.cls}`}
                onClick={() => setNotice(t("auth.login.socialUnavailable"))}
                aria-label={t(`auth.login.${p.key}`)}
              >
                <img src={p.icon} alt="" />
              </button>
            ))}
          </div>
          {notice && <p className="auth-notice">{notice}</p>}

          <p className="auth-foot">
            {t("auth.login.noAccount")} <Link to="/register">{t("auth.login.register")}</Link>
          </p>
        </main>
      </div>
    </div>
  );
}
