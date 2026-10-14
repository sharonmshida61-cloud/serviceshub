import { useEffect, useRef, useState } from "react";
import { api } from "../api";
import { useAuth } from "../context/AuthContext.jsx";
import Icon from "./Icon.jsx";

function initials(name) {
  return (name || "?").split(" ").filter(Boolean).map((w) => w[0]).slice(0, 2).join("").toUpperCase();
}

// The account panel every signed-in role sees. It stays inside the dashboard
// shell, so it carries no listing chrome and shows only what the person gave at
// sign-up — name and picture are the only editable fields.
export default function ProfileCard({ user }) {
  const { updateProfile } = useAuth();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(user?.name || "");
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const fileRef = useRef(null);

  // Drop the previous preview URL when it is replaced or the panel unmounts
  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);

  const photo = preview || user?.avatarUrl || null;
  const [photoBroken, setPhotoBroken] = useState(false);
  useEffect(() => setPhotoBroken(false), [photo]);
  const visible = !!photo && !photoBroken;

  // Only what the owner actually gave at sign-up — nothing they never filled.
  const details = [
    { label: "Email", value: user?.email },
    { label: "Phone", value: user?.phone },
    { label: "Nationality", value: user?.nationality },
  ].filter((d) => d.value);

  function startEdit() {
    setName(user?.name || "");
    setFile(null); setPreview(null); setError("");
    setEditing(true);
  }

  function cancelEdit() {
    setFile(null); setPreview(null); setError("");
    setEditing(false);
  }

  function pickFile(next) {
    if (!next) return;
    if (!next.type.startsWith("image/")) { setError("Choose an image file"); return; }
    setFile(next);
    setPreview(URL.createObjectURL(next));
  }

  async function save() {
    const trimmed = name.trim();
    if (trimmed.length < 2) { setError("Enter a name with at least 2 characters"); return; }
    setSaving(true); setError("");
    try {
      // Name and picture are the only account fields an owner may change; the
      // rest is what they registered with.
      await updateProfile({
        name: trimmed,
        ...(file && { avatarUrl: (await api.uploadAvatar(file)).url }),
      });
      setFile(null); setPreview(null);
      setEditing(false);
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="panel" style={{ maxWidth: 480 }}>
      <div className="panel-head">
        <h3>My Profile</h3>
        {!editing && <button className="linklike" onClick={startEdit}>Edit</button>}
      </div>
      <div className="panel-body">
        {error && <div className="alert alert-error">{error}</div>}

        <div className="profile-id">
          {editing ? (
            <div className="avatar-edit">
              <button
                type="button"
                className="profile-avatar profile-avatar--pick"
                onClick={() => fileRef.current?.click()}
                aria-label="Choose a profile picture"
              >
                {visible ? <img className="avatar-img" src={photo} alt="" onError={() => setPhotoBroken(true)} /> : initials(user?.name)}
              </button>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                hidden
                onChange={(e) => pickFile(e.target.files?.[0])}
              />
              <div className="avatar-edit-actions">
                <button type="button" className="linklike" onClick={() => fileRef.current?.click()}>
                  {visible ? "Change photo" : "Upload photo"}
                </button>
              </div>
            </div>
          ) : (
            visible
              ? <img className="profile-avatar avatar-img" src={photo} alt="" onError={() => setPhotoBroken(true)} />
              : <span className="profile-avatar">{initials(user?.name)}</span>
          )}

          <div style={{ minWidth: 0 }}>
            {editing ? (
              <div className="field" style={{ marginBottom: 0 }}>
                <label htmlFor="owner-profile-name">Name</label>
                <input
                  id="owner-profile-name"
                  value={name}
                  maxLength={80}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
            ) : (
              <div style={{ fontWeight: 800, fontSize: "1.05rem" }}>{user?.name}</div>
            )}
          </div>
        </div>

        {details.map((d) => (
          <div className="profile-row" key={d.label}>
            <span className="hint">{d.label}</span>
            <strong>{d.value}</strong>
          </div>
        ))}

        <p className="hint" style={{ marginTop: 14 }}>
          {editing
            ? "Only your name and profile picture can be changed here."
            : "These are the details you registered with."}
        </p>

        {editing && (
          <div style={{ marginTop: 16, display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
            <button className="btn btn-primary btn-sm" style={{ background: "var(--dash-active)", border: "none" }} disabled={saving} onClick={save}>
              {saving ? "Saving…" : "Save changes"}
            </button>
            <button className="btn btn-outline btn-sm" disabled={saving} onClick={cancelEdit}>Cancel</button>
          </div>
        )}
      </div>
    </div>
  );
}
