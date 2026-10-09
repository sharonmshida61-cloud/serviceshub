import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import AuthAside from "../components/AuthAside.jsx";
import EyeIcon from "../components/EyeIcon.jsx";
import { api } from "../api";
import { useLanguage } from "../context/LanguageContext.jsx";

export default function ResetPassword() {
  const { t } = useLanguage();
  const [params] = useSearchParams();
  const token = params.get("token") || "";

  const [status, setStatus] = useState(token ? "checking" : "invalid");
  const [email, setEmail] = useState("");
  const [form, setForm] = useState({ password: "", confirm: "" });
  const [show, setShow] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!token) return undefined;
    let alive = true;
    api
      .verifyResetToken(token)
      .then((res) => {
        if (!alive) return;
        setEmail(res.email);
        setStatus("ready");
      })
      .catch(() => {
        if (alive) setStatus("invalid");
      });
    return () => {
      alive = false;
    };
  }, [token]);

  async function handleSubmit(e) {
    e.preventDefault();
    if (form.password !== form.confirm) {
      setError(t("auth.error.passwordMismatch"));
      return;
    }
    setError("");
    setBusy(true);
    try {
      await api.resetPassword({ token, password: form.password });
      setDone(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  function panel() {
    if (status === "checking") {
      return <p className="auth-notice">{t("auth.reset.checking")}</p>;
    }

    if (status === "invalid") {
      return (
        <>
          <div className="auth-hint">{t("auth.reset.invalid")}</div>
          <Link to="/forgot-password" className="auth-submit auth-submit--link">
            {t("auth.reset.requestNew")}
          </Link>
        </>
      );
    }

    if (done) {
      return (
        <div className="auth-hint auth-hint--sent">{t("auth.reset.done")}</div>
      );
    }

    return (
      <>
        {error && <div className="alert alert-error">{error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="field">
            <label htmlFor="reset-password">{t("auth.reset.password")}</label>
            <div className="auth-pass">
              <input
                id="reset-password"
                type={show ? "text" : "password"}
                required
                minLength={6}
                autoComplete="new-password"
                placeholder={t("auth.reset.passwordPlaceholder")}
                value={form.password}
                onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
              />
              <button
                type="button"
                onClick={() => setShow((v) => !v)}
                aria-label={show ? t("auth.login.hidePassword") : t("auth.login.showPassword")}
              >
                <EyeIcon open={show} />
              </button>
            </div>
            <p className="auth-help">{t("auth.reset.minLength")}</p>
          </div>

          <div className="field">
            <label htmlFor="reset-confirm">{t("auth.reset.confirm")}</label>
            <input
              id="reset-confirm"
              type={show ? "text" : "password"}
              required
              minLength={6}
              autoComplete="new-password"
              placeholder={t("auth.reset.confirmPlaceholder")}
              value={form.confirm}
              onChange={(e) => setForm((f) => ({ ...f, confirm: e.target.value }))}
            />
          </div>

          <button type="submit" className="auth-submit" disabled={busy}>
            {busy ? t("auth.reset.submitting") : t("auth.reset.submit")}
          </button>
        </form>
      </>
    );
  }

  return (
    <div className="auth-screen">
      <span className="auth-decor auth-decor--tl" aria-hidden="true" />
      <span className="auth-decor auth-decor--br" aria-hidden="true" />

      <div className="auth-card">
        <AuthAside />

        <main className="auth-panel">
          <h1>{t(status === "invalid" ? "auth.reset.invalidTitle" : done ? "auth.reset.doneTitle" : "auth.reset.title")}</h1>
          <p className="auth-sub">
            {status === "ready" && !done
              ? t("auth.reset.subtitle").replace("{email}", email)
              : t("auth.reset.subtitlePlain")}
          </p>

          {panel()}

          <p className="auth-foot">
            <Link to="/login">{t("auth.forgot.backToLogin")}</Link>
          </p>
        </main>
      </div>
    </div>
  );
}
