import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import AuthAside from "../components/AuthAside.jsx";
import EyeIcon from "../components/EyeIcon.jsx";
import { api } from "../api";
import { useAuth } from "../context/AuthContext.jsx";
import { useLanguage } from "../context/LanguageContext.jsx";
import { dashboardPathFor } from "../utils/dashboardRoute.js";

// Mirrors the 5 MB cap in backend/src/utils/profilePhoto.js.
const MAX_ID_BYTES = 5 * 1024 * 1024;

const EMPTY_FORM = { name: "", email: "", phone: "", password: "", confirm: "" };

// The owner's link or QR code lands here: one form, scoped to the listing and
// role that were saved when the person was added to the team.
export default function InviteAccept() {
  const { token } = useParams();
  const navigate = useNavigate();
  const { acceptInvite } = useAuth();
  const { t } = useLanguage();

  const [status, setStatus] = useState(token ? "checking" : "invalid");
  const [invalidMsg, setInvalidMsg] = useState("");
  const [invite, setInvite] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [photo, setPhoto] = useState(null);
  const [preview, setPreview] = useState(null);
  const [show, setShow] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const fileRef = useRef(null);

  useEffect(() => {
    let alive = true;
    api
      .invitation(token)
      .then((res) => {
        if (!alive) return;
        setInvite(res);
        // Whatever the owner typed is a starting point, not a lock: the person
        // finishing the form corrects it if needed.
        setForm((f) => ({ ...f, name: res.name || "", email: res.email || "" }));
        setStatus("ready");
      })
      .catch((err) => {
        if (!alive) return;
        setInvalidMsg(err?.message || "");
        setStatus("invalid");
      });
    return () => {
      alive = false;
    };
  }, [token]);

  function update(key) {
    return (e) => setForm((f) => ({ ...f, [key]: e.target.value }));
  }

  function pickPhoto(next) {
    if (!next) return;
    if (!next.type.startsWith("image/")) {
      setError(t("auth.register.photoTypeError"));
      return;
    }
    if (next.size > MAX_ID_BYTES) {
      setError(t("auth.register.photoTooLarge"));
      return;
    }
    setError("");
    if (preview) URL.revokeObjectURL(preview);
    setPhoto(next);
    setPreview(URL.createObjectURL(next));
  }

  function clearPhoto() {
    if (preview) URL.revokeObjectURL(preview);
    setPhoto(null);
    setPreview(null);
    if (fileRef.current) fileRef.current.value = "";
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!photo) {
      setError(t("auth.invite.idRequired"));
      return;
    }
    if (form.password !== form.confirm) {
      setError(t("auth.error.passwordMismatch"));
      return;
    }
    setError("");
    setBusy(true);
    try {
      const payload = new FormData();
      payload.append("token", token);
      payload.append("name", form.name.trim());
      payload.append("email", form.email.trim());
      payload.append("phone", form.phone.trim());
      payload.append("password", form.password);
      payload.append("confirmPassword", form.confirm);
      payload.append("idfile", photo);

      const user = await acceptInvite(payload);
      navigate(dashboardPathFor(user));
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  function panel() {
    if (status === "checking") {
      return <p className="auth-notice">{t("auth.invite.checking")}</p>;
    }

    if (status === "invalid") {
      return (
        <>
          <div className="auth-hint">{invalidMsg || t("auth.invite.invalid")}</div>
          <Link to="/login" className="auth-submit auth-submit--link">
            {t("auth.invite.signInInstead")}
          </Link>
        </>
      );
    }

    return (
      <form onSubmit={handleSubmit}>
        {error && <div className="alert alert-error">{error}</div>}

        <div className="field">
          <label htmlFor="invite-id">{t("auth.invite.idPhoto")}</label>
          <div className="reg-photo-row">
            <button
              type="button"
              className="invite-id-thumb"
              onClick={() => fileRef.current?.click()}
              aria-label={t("auth.invite.idPick")}
            >
              {preview ? (
                <img src={preview} alt="" />
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none"
                  stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="2.5" y="5" width="19" height="14" rx="2" />
                  <circle cx="8.5" cy="11" r="2.2" />
                  <path d="M5.5 16.5c1-1.7 3-2.3 4.5-1.4" />
                  <path d="M14 10h4M14 13.5h4" />
                </svg>
              )}
            </button>
            <div className="reg-photo-actions">
              <button type="button" className="linklike" onClick={() => fileRef.current?.click()}>
                {t(preview ? "auth.invite.idChange" : "auth.invite.idPick")}
              </button>
              {preview && (
                <button type="button" className="linklike" onClick={clearPhoto}>
                  {t("auth.register.photoRemove")}
                </button>
              )}
              <p className="auth-help">{t("auth.invite.idHint")}</p>
            </div>
          </div>
          <input
            ref={fileRef}
            id="invite-id"
            type="file"
            accept="image/*"
            hidden
            onChange={(e) => pickPhoto(e.target.files?.[0])}
          />
        </div>

        <div className="field">
          <label htmlFor="invite-name">{t("auth.register.name")}</label>
          <input id="invite-name" required autoComplete="name" value={form.name} onChange={update("name")} />
        </div>

        <div className="field">
          <label htmlFor="invite-email">{t("auth.register.email")}</label>
          <input
            id="invite-email"
            type="email"
            required
            autoComplete="email"
            placeholder={t("auth.login.emailPlaceholder")}
            value={form.email}
            onChange={update("email")}
          />
        </div>

        <div className="field">
          <label htmlFor="invite-phone">{t("auth.register.phone")}</label>
          <input
            id="invite-phone"
            type="tel"
            required
            autoComplete="tel"
            placeholder={t("auth.register.phonePlaceholder")}
            value={form.phone}
            onChange={update("phone")}
          />
        </div>

        <div className="field">
          <label htmlFor="invite-password">{t("auth.register.password")}</label>
          <div className="auth-pass">
            <input
              id="invite-password"
              type={show ? "text" : "password"}
              required
              minLength={6}
              autoComplete="new-password"
              value={form.password}
              onChange={update("password")}
            />
            <button
              type="button"
              onClick={() => setShow((v) => !v)}
              aria-label={show ? t("auth.login.hidePassword") : t("auth.login.showPassword")}
            >
              <EyeIcon open={show} />
            </button>
          </div>
        </div>

        <div className="field">
          <label htmlFor="invite-confirm">{t("auth.register.confirmPassword")}</label>
          <input
            id="invite-confirm"
            type={show ? "text" : "password"}
            required
            minLength={6}
            autoComplete="new-password"
            value={form.confirm}
            onChange={update("confirm")}
          />
        </div>

        <button type="submit" className="auth-submit" disabled={busy}>
          {busy ? t("auth.invite.submitting") : t("auth.invite.submit")}
        </button>
      </form>
    );
  }

  return (
    <div className="auth-screen">
      <span className="auth-decor auth-decor--tl" aria-hidden="true" />
      <span className="auth-decor auth-decor--br" aria-hidden="true" />

      <div className="auth-card">
        <AuthAside />

        <main className="auth-panel">
          <h1>{t(status === "invalid" ? "auth.invite.invalidTitle" : "auth.invite.title")}</h1>
          <p className="auth-sub">
            {status === "ready" && invite
              ? t("auth.invite.subtitle")
                  .replace("{owner}", invite.ownerName || t("auth.invite.ownerFallback"))
                  .replace("{business}", invite.business)
                  .replace("{role}", invite.role)
              : t("auth.invite.subtitlePlain")}
          </p>

          {status === "ready" && invite && (
            <div className="auth-rolebar">
              <span className="auth-role-chip">
                {invite.role} · {invite.business}
                {invite.city ? ` · ${invite.city}` : ""}
              </span>
            </div>
          )}

          {panel()}

          {status !== "invalid" && (
            <p className="auth-foot">
              {t("auth.register.hasAccount")} <Link to="/login">{t("auth.register.login")}</Link>
            </p>
          )}
        </main>
      </div>
    </div>
  );
}
