import { useState } from "react";
import { api } from "../api";

/**
 * MediaUpload component - allows business owners to upload photos and videos
 * Supports direct URL input and future file uploads
 */
export default function MediaUpload({ businessId, onUploadComplete, onCancel }) {
  const [mediaType, setMediaType] = useState("PHOTO");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [mediaUrl, setMediaUrl] = useState("");
  const [thumbnailUrl, setThumbnailUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!mediaUrl.trim()) {
      setError("Please provide a media URL");
      return;
    }

    setBusy(true);
    setError("");

    try {
      const payload = {
        businessId,
        type: mediaType,
        title: title || `${mediaType} ${new Date().toLocaleDateString()}`,
        description,
        mediaUrl,
        thumbnailUrl: thumbnailUrl || undefined,
      };

      await api.addEnhancedPortfolio(payload);
      setTitle("");
      setDescription("");
      setMediaUrl("");
      setThumbnailUrl("");
      setMediaType("PHOTO");
      onUploadComplete?.();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="card" style={{ maxWidth: "500px" }}>
      <h3>Upload Media</h3>

      {error && <div className="alert alert-error">{error}</div>}

      <div className="field">
        <label>Media Type</label>
        <select value={mediaType} onChange={(e) => setMediaType(e.target.value)}>
          <option value="PHOTO">Photo</option>
          <option value="VIDEO">Video</option>
          <option value="CERTIFICATE">Certificate</option>
          <option value="LICENSE">License</option>
          <option value="PROJECT">Project Showcase</option>
        </select>
      </div>

      <div className="field">
        <label>Title</label>
        <input
          type="text"
          placeholder={`e.g., "Before & After" or "Team Photo"`}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <div className="hint">Optional - auto-generated if blank</div>
      </div>

      <div className="field">
        <label>Description</label>
        <textarea
          rows="2"
          placeholder="Describe what's in this media (optional)"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </div>

      <div className="field">
        <label>Media URL *</label>
        <input
          type="url"
          placeholder="https://example.com/photo.jpg or https://youtube.com/embed/..."
          value={mediaUrl}
          onChange={(e) => setMediaUrl(e.target.value)}
          required
        />
        <div className="hint">
          Upload to a service like Imgur, YouTube, or Cloudinary and paste the URL here
        </div>
      </div>

      {mediaType === "VIDEO" && (
        <div className="field">
          <label>Thumbnail URL (optional)</label>
          <input
            type="url"
            placeholder="https://example.com/thumbnail.jpg"
            value={thumbnailUrl}
            onChange={(e) => setThumbnailUrl(e.target.value)}
          />
          <div className="hint">Custom thumbnail image for video preview</div>
        </div>
      )}

      <div style={{ display: "flex", gap: "10px", marginTop: "20px" }}>
        <button type="submit" className="btn btn-primary" disabled={busy}>
          {busy ? "Uploading…" : "Upload Media"}
        </button>
        {onCancel && (
          <button type="button" className="btn btn-outline" onClick={onCancel}>
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}
