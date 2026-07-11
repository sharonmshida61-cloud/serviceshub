import { useRef, useState } from "react";
import { api } from "../api";

const ACCEPTED = "image/jpeg,image/png,image/gif,image/webp,image/avif,video/mp4,video/webm,video/quicktime,video/x-msvideo";

export default function MediaUpload({ businessId, onUploadComplete, onCancel }) {
  const [mode, setMode] = useState("file"); // "file" | "url"
  const [dragging, setDragging] = useState(false);
  const [previews, setPreviews] = useState([]); // [{ file, objectUrl, type }]
  const [urlInput, setUrlInput] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [mediaType, setMediaType] = useState("PHOTO");
  const [progress, setProgress] = useState(null); // "uploading N/M" | null
  const [error, setError] = useState("");
  const fileInputRef = useRef();

  // ---- file selection ----
  function addFiles(fileList) {
    const next = [];
    for (const f of fileList) {
      if (!f.type.startsWith("image/") && !f.type.startsWith("video/")) continue;
      next.push({ file: f, objectUrl: URL.createObjectURL(f), type: f.type.startsWith("video/") ? "VIDEO" : "PHOTO" });
    }
    if (!next.length) return setError("Only image or video files are accepted.");
    setError("");
    setPreviews((p) => [...p, ...next]);
  }

  function removePreview(i) {
    setPreviews((p) => {
      URL.revokeObjectURL(p[i].objectUrl);
      return p.filter((_, idx) => idx !== i);
    });
  }

  function onDragOver(e) { e.preventDefault(); setDragging(true); }
  function onDragLeave() { setDragging(false); }
  function onDrop(e) { e.preventDefault(); setDragging(false); addFiles(e.dataTransfer.files); }

  // ---- submit ----
  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    if (mode === "file") {
      if (!previews.length) return setError("Add at least one file first.");
      setProgress(`Uploading 0 / ${previews.length}…`);
      let done = 0;
      try {
        for (const item of previews) {
          // 1. Upload the actual file → get back a URL
          const { url, type } = await api.uploadMedia(businessId, item.file);
          // 2. Save the portfolio record with that URL
          await api.addEnhancedPortfolio({
            businessId,
            type,
            title: title || `${type === "VIDEO" ? "Video" : "Photo"} ${new Date().toLocaleDateString()}`,
            description,
            mediaUrl: url,
          });
          done++;
          setProgress(`Uploading ${done} / ${previews.length}…`);
        }
        previews.forEach((p) => URL.revokeObjectURL(p.objectUrl));
        setPreviews([]);
        setTitle("");
        setDescription("");
        setProgress(null);
        onUploadComplete?.();
      } catch (err) {
        setProgress(null);
        setError(err.message);
      }
    } else {
      // URL mode
      if (!urlInput.trim()) return setError("Paste a URL first.");
      try {
        setProgress("Saving…");
        await api.addEnhancedPortfolio({
          businessId,
          type: mediaType,
          title: title || `${mediaType} ${new Date().toLocaleDateString()}`,
          description,
          mediaUrl: urlInput.trim(),
        });
        setUrlInput("");
        setTitle("");
        setDescription("");
        setProgress(null);
        onUploadComplete?.();
      } catch (err) {
        setProgress(null);
        setError(err.message);
      }
    }
  }

  const busy = progress !== null;

  return (
    <form onSubmit={handleSubmit} className="card" style={{ maxWidth: 540 }}>
      <h3 style={{ marginTop: 0 }}>Add photos or videos</h3>

      {/* Mode toggle */}
      <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
        {["file", "url"].map((m) => (
          <button
            key={m} type="button"
            className={`btn btn-sm ${mode === m ? "btn-primary" : "btn-outline"}`}
            onClick={() => { setMode(m); setError(""); }}
          >
            {m === "file" ? "📁 Upload from device" : "🔗 Paste URL"}
          </button>
        ))}
      </div>

      {error && <div className="alert alert-error" style={{ marginBottom: 12 }}>{error}</div>}

      {/* ---- FILE MODE ---- */}
      {mode === "file" && (
        <>
          {/* Drop zone */}
          <div
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            onDrop={onDrop}
            onClick={() => fileInputRef.current?.click()}
            style={{
              border: `2px dashed ${dragging ? "var(--amber, #f59e0b)" : "var(--line, #e5e7eb)"}`,
              borderRadius: 10,
              padding: "32px 20px",
              textAlign: "center",
              cursor: "pointer",
              background: dragging ? "var(--amber-light, #fef9c3)" : "var(--paper-2, #f9fafb)",
              transition: "all 0.15s",
              marginBottom: 16,
            }}
          >
            <div style={{ fontSize: "2.5rem", marginBottom: 8 }}>📸</div>
            <p style={{ margin: 0, fontWeight: 600 }}>Drag & drop files here</p>
            <p style={{ margin: "4px 0 0", color: "var(--ink-2)", fontSize: "0.85rem" }}>
              or click to browse — JPG, PNG, GIF, WebP, MP4, WebM, MOV (max 50 MB each)
            </p>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept={ACCEPTED}
            style={{ display: "none" }}
            onChange={(e) => addFiles(e.target.files)}
          />

          {/* Preview grid */}
          {previews.length > 0 && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(100px, 1fr))", gap: 8, marginBottom: 16 }}>
              {previews.map((p, i) => (
                <div key={i} style={{ position: "relative", borderRadius: 8, overflow: "hidden", aspectRatio: "1", background: "#000" }}>
                  {p.type === "VIDEO" ? (
                    <video src={p.objectUrl} style={{ width: "100%", height: "100%", objectFit: "cover" }} muted />
                  ) : (
                    <img src={p.objectUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  )}
                  <button
                    type="button"
                    onClick={() => removePreview(i)}
                    style={{
                      position: "absolute", top: 4, right: 4,
                      background: "rgba(0,0,0,0.6)", color: "white",
                      border: "none", borderRadius: "50%",
                      width: 22, height: 22, cursor: "pointer",
                      fontSize: "0.75rem", lineHeight: 1,
                    }}
                  >✕</button>
                  <span style={{
                    position: "absolute", bottom: 4, left: 4,
                    background: "rgba(0,0,0,0.55)", color: "white",
                    fontSize: "0.65rem", padding: "2px 5px", borderRadius: 3,
                  }}>{p.type === "VIDEO" ? "🎥" : "📸"}</span>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* ---- URL MODE ---- */}
      {mode === "url" && (
        <>
          <div className="field">
            <label>Media type</label>
            <select value={mediaType} onChange={(e) => setMediaType(e.target.value)}>
              <option value="PHOTO">Photo</option>
              <option value="VIDEO">Video (YouTube embed / direct URL)</option>
              <option value="CERTIFICATE">Certificate</option>
              <option value="LICENSE">License</option>
              <option value="PROJECT">Project showcase</option>
            </select>
          </div>
          <div className="field">
            <label>URL *</label>
            <input
              type="url"
              placeholder="https://imgur.com/photo.jpg or https://youtube.com/embed/…"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              required={mode === "url"}
            />
            <div className="hint">Paste a direct link to an image or a YouTube/Vimeo embed URL</div>
          </div>
        </>
      )}

      {/* Shared fields */}
      <div className="field">
        <label>Title <span style={{ color: "var(--ink-2)", fontWeight: 400 }}>(optional)</span></label>
        <input
          type="text"
          placeholder='e.g. "Before & After" or "Team photo"'
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
      </div>
      <div className="field">
        <label>Description <span style={{ color: "var(--ink-2)", fontWeight: 400 }}>(optional)</span></label>
        <textarea
          rows={2}
          placeholder="Describe what's shown…"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </div>

      <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
        <button type="submit" className="btn btn-primary" disabled={busy}>
          {busy ? progress : mode === "file" ? `Upload ${previews.length || ""} file${previews.length !== 1 ? "s" : ""}` : "Save"}
        </button>
        {onCancel && (
          <button type="button" className="btn btn-outline" onClick={onCancel} disabled={busy}>
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}
