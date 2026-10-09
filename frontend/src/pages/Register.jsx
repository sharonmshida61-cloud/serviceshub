import { useEffect, useRef, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import AuthAside from "../components/AuthAside.jsx";
import EyeIcon from "../components/EyeIcon.jsx";
import { api } from "../api";
import { COUNTRIES } from "../utils/countries";
import { useAuth } from "../context/AuthContext.jsx";
import { useLanguage } from "../context/LanguageContext.jsx";

const ROLE_OPTIONS = [
  {
    key: "CUSTOMER",
    title: "auth.register.customerTitle",
    desc: "auth.register.customerDesc",
    chip: "auth.register.customerChip",
    subtitle: "auth.register.customerSubtitle",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none"
        stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="11" cy="11" r="7" />
        <line x1="21" y1="21" x2="16.5" y2="16.5" />
      </svg>
    ),
  },
  {
    key: "BUSINESS_OWNER",
    title: "auth.register.ownerTitle",
    desc: "auth.register.ownerDesc",
    chip: "auth.register.ownerChip",
    subtitle: "auth.register.ownerSubtitle",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none"
        stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 9l1.5-5h15L21 9" />
        <path d="M3 9v11h18V9" />
        <path d="M8 20v-6h8v6" />
      </svg>
    ),
  },
];

const EMPTY_FORM = {
  name: "",
  email: "",
  phone: "",
  nationality: "",
  password: "",
  confirm: "",
  businessName: "",
  categorySlug: "",
  city: "",
};

// Mirrors the 5 MB cap in backend/src/utils/profilePhoto.js.
const MAX_PHOTO_BYTES = 5 * 1024 * 1024;

export default function Register() {
  const { register } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [role, setRole] = useState(null); // null keeps the account-type chooser open
  const [categories, setCategories] = useState([]);
  const [form, setForm] = useState(EMPTY_FORM);
  const [photo, setPhoto] = useState(null);
  const [preview, setPreview] = useState(null);
  const fileRef = useRef(null);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const option = ROLE_OPTIONS.find((o) => o.key === role);

  useEffect(() => {
    if (role !== "BUSINESS_OWNER" || categories.length) return;
    api
      .categories()
      .then(setCategories)
      .catch(() => setError(t("auth.register.categoryLoadError")));
  }, [role]);

  function update(key) {
    return (e) => setForm((f) => ({ ...f, [key]: e.target.value }));
  }

  function choose(next) {
    setRole(next);
    setError("");
  }

  function back() {
    setRole(null);
    setError("");
  }

  function pickPhoto(next) {
    if (!next) return;
    if (!next.type.startsWith("image/")) {
      setError(t("auth.register.photoTypeError"));
      return;
    }
    if (next.size > MAX_PHOTO_BYTES) {
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
      setError(t("auth.register.photoRequired"));
      return;
    }
    if (form.password !== form.confirm) {
      setError(t("auth.error.passwordMismatch"));
      return;
    }
    setError("");
    setBusy(true);
    try {
      // One multipart request: the picture has to reach the server while the
      // account is being created, since it is part of the new profile.
      const payload = new FormData();
      payload.append("name", form.name.trim());
      payload.append("email", form.email.trim());
      payload.append("phone", form.phone.trim());
      if (form.nationality) payload.append("nationality", form.nationality);
      payload.append("password", form.password);
      payload.append("role", role);
      payload.append("file", photo);
      if (role === "BUSINESS_OWNER") {
        payload.append(
          "business",
          JSON.stringify({
            name: form.businessName.trim(),
            categorySlug: form.categorySlug,
            city: form.city.trim() || undefined,
          })
        );
      }

      const user = await register(payload);

      navigate((user.currentRole || user.role) === "BUSINESS_OWNER" ? "/dashboard/business" : "/dashboard/customer");
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
          <h1>{t("auth.register.title")}</h1>
          <p className="auth-sub">{t(role ? option.subtitle : "auth.register.chooseSubtitle")}</p>

          {role && (
            <div className="auth-rolebar">
              <span className="auth-role-chip">{t(option.chip)}</span>
              <button type="button" className="auth-change" onClick={back}>
                {t("auth.register.change")}
              </button>
            </div>
          )}

          {error && <div className="alert alert-error">{error}</div>}

          {!role && (
            <>
              <div className="auth-choices">
                {ROLE_OPTIONS.map((o) => (
                  <button key={o.key} type="button" className="auth-choice" onClick={() => choose(o.key)}>
                    <span className="auth-choice-icon">{o.icon}</span>
                    <span className="auth-choice-text">
                      <strong>{t(o.title)}</strong>
                      <small>{t(o.desc)}</small>
                    </span>
                    <svg className="auth-choice-arrow" xmlns="http://www.w3.org/2000/svg" width="18" height="18"
                      viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                      strokeLinecap="round" strokeLinejoin="round">
                      <line x1="4" y1="12" x2="19" y2="12" />
                      <polyline points="13 6 19 12 13 18" />
                    </svg>
                  </button>
                ))}
              </div>
              <p className="auth-notice">{t("auth.register.staffNote")}</p>
            </>
          )}

          {role && (
            <form onSubmit={handleSubmit}>
              {role === "BUSINESS_OWNER" && (
                <>
                  <h2 className="auth-group">{t("auth.register.businessGroup")}</h2>
                  <div className="field">
                    <label htmlFor="reg-business-name">{t("auth.register.businessName")}</label>
                    <input
                      id="reg-business-name"
                      required
                      value={form.businessName}
                      onChange={update("businessName")}
                      placeholder={t("auth.register.businessNamePlaceholder")}
                    />
                  </div>
                  <div className="auth-row">
                    <div className="field">
                      <label htmlFor="reg-category">{t("auth.register.category")}</label>
                      <select id="reg-category" required value={form.categorySlug} onChange={update("categorySlug")}>
                        <option value="" disabled>
                          {categories.length ? t("auth.register.categoryPlaceholder") : t("auth.register.categoryLoading")}
                        </option>
                        {categories.map((c) => (
                          <option key={c.slug} value={c.slug}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="field">
                      <label htmlFor="reg-city">{t("auth.register.city")}</label>
                      <input
                        id="reg-city"
                        value={form.city}
                        onChange={update("city")}
                        placeholder={t("auth.register.cityPlaceholder")}
                      />
                    </div>
                  </div>
                  <p className="auth-help">{t("auth.register.listingHint")}</p>

                  <h2 className="auth-group">{t("auth.register.accountGroup")}</h2>
                </>
              )}

              <div className="field">
                <label htmlFor="reg-photo">{t("auth.register.photo")}</label>
                <div className="reg-photo-row">
                  <button
                    type="button"
                    className="reg-photo-avatar"
                    onClick={() => fileRef.current?.click()}
                    aria-label={t("auth.register.photoPick")}
                  >
                    {preview ? (
                      <img className="avatar-img" src={preview} alt="" />
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none"
                        stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M3 8.5A1.5 1.5 0 0 1 4.5 7h2L8 5h8l1.5 2h2A1.5 1.5 0 0 1 21 8.5v9A1.5 1.5 0 0 1 19.5 19h-15A1.5 1.5 0 0 1 3 17.5z" />
                        <circle cx="12" cy="13" r="3.5" />
                      </svg>
                    )}
                  </button>
                  <div className="reg-photo-actions">
                    <button type="button" className="linklike" onClick={() => fileRef.current?.click()}>
                      {t(preview ? "auth.register.photoChange" : "auth.register.photoPick")}
                    </button>
                    {preview && (
                      <button type="button" className="linklike" onClick={clearPhoto}>
                        {t("auth.register.photoRemove")}
                      </button>
                    )}
                    <p className="auth-help">{t("auth.register.photoHint")}</p>
                  </div>
                </div>
                <input
                  ref={fileRef}
                  id="reg-photo"
                  type="file"
                  accept="image/*"
                  hidden
                  onChange={(e) => pickPhoto(e.target.files?.[0])}
                />
              </div>

              <div className="field">
                <label htmlFor="reg-name">{t("auth.register.name")}</label>
                <input id="reg-name" required autoComplete="name" value={form.name} onChange={update("name")} />
              </div>

              <div className="field">
                <label htmlFor="reg-email">{t("auth.register.email")}</label>
                <input
                  id="reg-email"
                  type="email"
                  required
                  autoComplete="email"
                  placeholder={t("auth.login.emailPlaceholder")}
                  value={form.email}
                  onChange={update("email")}
                />
              </div>

              <div className="field">
                <label htmlFor="reg-phone">{t("auth.register.phone")}</label>
                <input
                  id="reg-phone"
                  type="tel"
                  required
                  autoComplete="tel"
                  placeholder={t("auth.register.phonePlaceholder")}
                  value={form.phone}
                  onChange={update("phone")}
                />
              </div>

              <div className="field">
                <label htmlFor="reg-nationality">{t("auth.register.nationality")}</label>
                <select id="reg-nationality" value={form.nationality} onChange={update("nationality")}>
                  <option value="">{t("auth.register.nationalityPlaceholder")}</option>
                  {COUNTRIES.map((country) => (
                    <option key={country} value={country}>
                      {country}
                    </option>
                  ))}
                </select>
              </div>

              <div className="field">
                <label htmlFor="reg-password">{t("auth.register.password")}</label>
                <div className="auth-pass">
                  <input
                    id="reg-password"
                    type={showPassword ? "text" : "password"}
                    required
                    minLength={6}
                    autoComplete="new-password"
                    value={form.password}
                    onChange={update("password")}
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

              <div className="field">
                <label htmlFor="reg-confirm">{t("auth.register.confirmPassword")}</label>
                <input
                  id="reg-confirm"
                  type={showPassword ? "text" : "password"}
                  required
                  minLength={6}
                  autoComplete="new-password"
                  value={form.confirm}
                  onChange={update("confirm")}
                />
              </div>

              <button type="submit" className="auth-submit" disabled={busy}>
                {busy ? t("auth.register.submitting") : t("auth.register.submit")}
              </button>
            </form>
          )}

          <p className="auth-foot">
            {t("auth.register.hasAccount")} <Link to="/login">{t("auth.register.login")}</Link>
          </p>
        </main>
      </div>
    </div>
  );
}
