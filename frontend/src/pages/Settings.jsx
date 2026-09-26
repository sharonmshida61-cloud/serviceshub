import { useEffect, useState } from "react";
import { api } from "../api";
import { useLanguage } from "../context/LanguageContext";
import { languages } from "../i18n/translations";

// Also rendered inside the customer dashboard, where the panel replaces the page heading.
export function SettingsPanel({ embed = false }) {
  const { t, language, changeLanguage } = useLanguage();
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [pw, setPw] = useState({ current: "", new: "", confirm: "" });
  const [pwSaving, setPwSaving] = useState(false);
  const [pwMessage, setPwMessage] = useState("");
  const [pwError, setPwError] = useState("");

  useEffect(() => {
    api
      .getSettings()
      .then(setSettings)
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    setMessage("");
    try {
      const updated = await api.updateSettings({
        ...settings,
        language,
      });
      setSettings(updated);
      setMessage(t("settings.saved"));
    } catch (err) {
      setMessage(`${t("common.error")}: ${err.message}`);
    } finally {
      setSaving(false);
    }
  }

  async function handleChangePassword(e) {
    e.preventDefault();
    setPwMessage("");
    setPwError("");
    if (pw.new.length < 6) {
      setPwError(t("settings.passwordTooShort"));
      return;
    }
    if (pw.new !== pw.confirm) {
      setPwError(t("settings.passwordMismatch"));
      return;
    }
    setPwSaving(true);
    try {
      await api.changePassword({ currentPassword: pw.current, newPassword: pw.new });
      setPw({ current: "", new: "", confirm: "" });
      setPwMessage(t("success.passwordChanged"));
    } catch (err) {
      setPwError(err.message);
    } finally {
      setPwSaving(false);
    }
  }

  const content = loading ? (
    <p className="hint">{t("common.loading")}</p>
  ) : !settings ? (
    <p className="hint">{t("settings.loadError")}</p>
  ) : (
    <>
      <form onSubmit={handleSave} className="settings-form">
        <div className="settings-group">
          <h2>{t("settings.notifications")}</h2>
        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={settings.emailNotifications}
            onChange={(e) => setSettings({ ...settings, emailNotifications: e.target.checked })}
          />
          {t("settings.emailNotifications")}
        </label>
        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={settings.smsNotifications}
            onChange={(e) => setSettings({ ...settings, smsNotifications: e.target.checked })}
          />
          {t("settings.smsNotifications")}
        </label>
        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={settings.pushNotifications}
            onChange={(e) => setSettings({ ...settings, pushNotifications: e.target.checked })}
          />
          {t("settings.pushNotifications")}
        </label>
        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={settings.marketingEmails}
            onChange={(e) => setSettings({ ...settings, marketingEmails: e.target.checked })}
          />
          {t("settings.marketingEmails")}
        </label>
      </div>

      <div className="settings-group settings-grid">
        <div className="field">
          <label htmlFor="settings-language">{t("settings.language")}</label>
          <select id="settings-language" value={language} onChange={(e) => changeLanguage(e.target.value)}>
            {languages.map((lang) => (
              <option key={lang.code} value={lang.code}>
                {lang.nativeName}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="settings-timezone">{t("settings.timezone")}</label>
          <select
            id="settings-timezone"
            value={settings.timezone}
            onChange={(e) => setSettings({ ...settings, timezone: e.target.value })}
          >
            <option value="UTC">UTC</option>
            <option value="America/New_York">Eastern Time</option>
            <option value="America/Chicago">Central Time</option>
            <option value="America/Denver">Mountain Time</option>
            <option value="America/Los_Angeles">Pacific Time</option>
          </select>
        </div>
      </div>

      <button type="submit" className="btn btn-primary" disabled={saving}>
        {saving ? t("settings.saving") : t("settings.save")}
      </button>

      {message && (
        <div className={`alert ${message.startsWith(t("common.error")) ? "alert-error" : "alert-success"}`}>
          {message}
        </div>
      )}
      </form>

      <form onSubmit={handleChangePassword} className="settings-form settings-form--password">
        <h2>{t("settings.changePassword")}</h2>

        <div className="settings-fields">
          <div className="field">
            <label htmlFor="current-password">{t("settings.currentPassword")}</label>
            <input
              id="current-password"
              type="password"
              autoComplete="current-password"
              required
              value={pw.current}
              onChange={(e) => setPw({ ...pw, current: e.target.value })}
            />
          </div>
          <div className="field">
            <label htmlFor="new-password">{t("settings.newPassword")}</label>
            <input
              id="new-password"
              type="password"
              autoComplete="new-password"
              required
              value={pw.new}
              onChange={(e) => setPw({ ...pw, new: e.target.value })}
            />
          </div>
          <div className="field">
            <label htmlFor="confirm-password">{t("settings.confirmPassword")}</label>
            <input
              id="confirm-password"
              type="password"
              autoComplete="new-password"
              required
              value={pw.confirm}
              onChange={(e) => setPw({ ...pw, confirm: e.target.value })}
            />
          </div>
        </div>

        <button type="submit" className="btn btn-primary" disabled={pwSaving}>
          {pwSaving ? t("settings.saving") : t("settings.updatePassword")}
        </button>

        {pwError && (
          <div className="alert alert-error">{pwError}</div>
        )}
        {pwMessage && (
          <div className="alert alert-success">{pwMessage}</div>
        )}
      </form>
    </>
  );

  if (embed) {
    return (
      <div className="panel settings-panel settings-panel--embed">
        <div className="panel-head">
          <h3>{t("settings.title")}</h3>
        </div>
        <div className="panel-body">{content}</div>
      </div>
    );
  }

  return (
    <div className="container page">
      <h1>{t("settings.title")}</h1>
      <div className="card settings-panel">{content}</div>
    </div>
  );
}

export default function Settings() {
  return <SettingsPanel />;
}
