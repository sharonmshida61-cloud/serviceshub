import { useState } from "react";

/**
 * MediaGallery - Display portfolio photos and videos for a business
 * Shows during booking to help customers make informed decisions
 */
export default function MediaGallery({ items = [], title = "Gallery" }) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);

  if (!items || items.length === 0) {
    return null;
  }

  const sortedItems = [...items].sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0));
  const selected = sortedItems[selectedIndex];

  const isVideo = selected?.type === "VIDEO" || selected?.mediaUrl?.includes("youtube") || selected?.mediaUrl?.includes("vimeo");

  return (
    <div className="card card-flush" style={{ marginBottom: "24px", overflow: "hidden" }}>
      <div style={{ position: "relative", paddingBottom: "56.25%", backgroundColor: "var(--paper-2)" }}>
        {/* Main display */}
        <div style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }} onClick={() => setLightboxOpen(true)}>
          {isVideo ? (
            <iframe
              width="100%"
              height="100%"
              src={selected.mediaUrl}
              title="Video"
              frameBorder="0"
              allowFullScreen
              style={{ position: "absolute", top: 0, left: 0 }}
            />
          ) : (
            <img
              src={selected.mediaUrl}
              alt={selected.title || "Portfolio item"}
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
                cursor: "pointer",
              }}
            />
          )}
        </div>
      </div>

      <div style={{ padding: "16px", background: "white" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", marginBottom: "12px" }}>
          <div>
            <h4 style={{ marginBottom: "4px" }}>{selected.title}</h4>
            {selected.description && <p style={{ fontSize: "0.9rem", margin: 0, color: "var(--ink-2)" }}>{selected.description}</p>}
          </div>
          <span className={`pill pill-${selected.type?.toLowerCase() || "completed"}`}>{selected.type}</span>
        </div>

        {/* Thumbnail scroll */}
        {sortedItems.length > 1 && (
          <div style={{ display: "flex", gap: "8px", overflowX: "auto", paddingTop: "12px", borderTop: "1px solid var(--line)" }}>
            {sortedItems.map((item, i) => (
              <button
                key={item.id}
                onClick={() => setSelectedIndex(i)}
                style={{
                  border: selectedIndex === i ? "2px solid var(--amber)" : "1px solid var(--line)",
                  borderRadius: "6px",
                  padding: 0,
                  cursor: "pointer",
                  width: "60px",
                  height: "60px",
                  flexShrink: 0,
                  overflow: "hidden",
                  background: "white",
                }}
              >
                {item.type === "VIDEO" || item.thumbnailUrl?.includes("youtube") || item.thumbnailUrl?.includes("vimeo") ? (
                  <img
                    src={item.thumbnailUrl || "https://via.placeholder.com/60x60?text=Video"}
                    alt={item.title}
                    style={{ width: "100%", height: "100%", objectFit: "cover" }}
                  />
                ) : (
                  <img
                    src={item.mediaUrl}
                    alt={item.title}
                    style={{ width: "100%", height: "100%", objectFit: "cover" }}
                  />
                )}
              </button>
            ))}
          </div>
        )}

        {/* Media count */}
        <div style={{ marginTop: "12px", fontSize: "0.85rem", color: "var(--ink-2)" }}>
          {selectedIndex + 1} of {sortedItems.length} {title.toLowerCase()}
        </div>
      </div>

      {/* Lightbox */}
      {lightboxOpen && (
        <div
          onClick={() => setLightboxOpen(false)}
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0,0,0,0.9)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 50,
            padding: "20px",
          }}
        >
          <div onClick={(e) => e.stopPropagation()} style={{ position: "relative", width: "100%", maxWidth: "90vw", maxHeight: "90vh" }}>
            {isVideo ? (
              <iframe
                width="100%"
                height="600"
                src={selected.mediaUrl}
                title="Video"
                frameBorder="0"
                allowFullScreen
              />
            ) : (
              <img
                src={selected.mediaUrl}
                alt={selected.title}
                style={{
                  width: "100%",
                  height: "auto",
                  maxHeight: "80vh",
                  objectFit: "contain",
                }}
              />
            )}
            <button
              onClick={() => setLightboxOpen(false)}
              style={{
                position: "absolute",
                top: "-40px",
                right: 0,
                background: "white",
                border: "none",
                borderRadius: "4px",
                width: "32px",
                height: "32px",
                fontSize: "20px",
                cursor: "pointer",
                fontWeight: "bold",
              }}
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
