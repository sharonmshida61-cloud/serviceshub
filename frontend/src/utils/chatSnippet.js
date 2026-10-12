// How long ago the last message landed, fine enough for a chat list where a
// reply two minutes ago matters.
export function timeAgo(iso) {
  const ms = Date.now() - new Date(iso).getTime();
  const d = Math.floor(ms / 86400000);
  if (d > 6) return new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "short" });
  if (d >= 1) return `${d}d ago`;
  const h = Math.floor(ms / 3600000);
  if (h >= 1) return `${h}h ago`;
  const m = Math.floor(ms / 60000);
  return m <= 1 ? "just now" : `${m}m ago`;
}

// The conversation list has room for a few words, so a message with no text
// is labelled by what it carries instead of showing a blank line.
export function describeMessage(msg) {
  if (msg.mediaKind === "IMAGE") return "📷 Photo";
  if (msg.mediaKind === "VIDEO") return "🎥 Video";
  if (msg.mediaKind === "AUDIO") return "🎤 Voice message";
  if (msg.liveShareId || msg.liveShare) return "📍 Live location";
  if (msg.latitude !== null && msg.latitude !== undefined) return `📍 ${msg.locationName || "Location"}`;
  return msg.content;
}
