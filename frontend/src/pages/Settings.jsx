import { useEffect, useState } from "react";
import { api } from "../api";
import { useLanguage } from "../context/LanguageContext";
import { languages } from "../i18n/translations";

export default function Settings() {
  const { t, language, changeLanguage } = useLanguage();
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

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

  if (loading) return <div className="container page">{t("common.loading")}</div>;
  if (!settings) return <div className="container page">Unable to load settings</div>;

  return (
    <div className="container page">
      <h1>{t("settings.title")}</h1>

      <div className="card">
        <h2>{t("settings.notifications")}</h2>
        <form onSubmit={handleSave}>
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={settings.emailNotifications}
              onChange={(e) =>
                setSettings({ ...settings, emailNotifications: e.target.checked })
              }
            />
            {t("settings.emailNotifications")}
          </label>

          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={settings.smsNotifications}
              onChange={(e) =>
                setSettings({ ...settings, smsNotifications: e.target.checked })
              }
            />
            {t("settings.smsNotifications")}
          </label>

          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={settings.pushNotifications}
              onChange={(e) =>
                setSettings({ ...settings, pushNotifications: e.target.checked })
              }
            />
            {t("settings.pushNotifications")}
          </label>

          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={settings.marketingEmails}
              onChange={(e) =>
                setSettings({ ...settings, marketingEmails: e.target.checked })
              }
            />
            {t("settings.marketingEmails")}
          </label>

          <div style={{ marginTop: 24 }}>
            <label>
              {t("settings.language")}
              <select
                value={language}
                onChange={(e) => changeLanguage(e.target.value)}
              >
                {languages.map((lang) => (
                  <option key={lang.code} value={lang.code}>
                    {lang.nativeName}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div style={{ marginTop: 16 }}>
            <label>
              {t("settings.timezone")}
              <select
                value={settings.timezone}
                onChange={(e) => setSettings({ ...settings, timezone: e.target.value })}
              >
                <option value="UTC">UTC</option>
                <option value="America/New_York">Eastern Time</option>
                <option value="America/Chicago">Central Time</option>
                <option value="America/Denver">Mountain Time</option>
                <option value="America/Los_Angeles">Pacific Time</option>
              </select>
            </label>
          </div>

          <div style={{ marginTop: 24 }}>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? t("settings.saving") : t("settings.save")}
            </button>
          </div>

          {message && (
            <div
              style={{
                marginTop: 16,
                padding: 12,
                background: message.startsWith(t("common.error")) ? "#fee" : "#efe",
                borderRadius: 4,
              }}
            >
              {message}
            </div>
          )}
        </form>
      </div>
    </div>
  );
}
