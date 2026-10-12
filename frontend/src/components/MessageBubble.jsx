import { useState } from "react";
import { useLanguage } from "../context/LanguageContext.jsx";
import { directionsUrl, embedUrl, hasCoords } from "../utils/geolocation.js";
import Icon from "./Icon.jsx";

const LABEL = { IMAGE: "Photo", VIDEO: "Video", AUDIO: "Voice message" };
const clock = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
const hhmm = (iso) => new Date(iso).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });

// Files on this server can disappear (Vercel's /tmp is wiped on cold starts), so
// every attachment has to say so plainly instead of showing a broken frame.
function Missing({ label }) {
  return (
    <div className="msg-media-missing">
      <Icon name="alert" size={16} />
      <span>{label} is no longer stored on this server</span>
    </div>
  );
}

function Media({ message, onBroken }) {
  const url = message.mediaUrl;
  const fail = () => onBroken(true);

  if (message.mediaKind === "IMAGE") {
    return <a className="msg-media-link" href={url} target="_blank" rel="noreferrer"><img className="msg-media" src={url} alt="Photo attachment" loading="lazy" onError={fail} /></a>;
  }
  if (message.mediaKind === "VIDEO") {
    return <video className="msg-media" src={url} controls preload="metadata" playsInline onError={fail} />;
  }
  return (
    <div className="msg-audio">
      <span className="msg-audio-icon"><Icon name="mic" size={16} /></span>
      <audio src={url} controls preload="metadata" onError={fail} />
      {message.mediaSecs ? <span className="msg-audio-length">{clock(message.mediaSecs)}</span> : null}
    </div>
  );
}

function LivePin({ share, t }) {
  const live = !share.stoppedAt && new Date(share.expiresAt).getTime() > Date.now();
  const fresh = Date.now() - new Date(share.updatedAt).getTime();
  return (
    <div className="msg-loc-body">
      <div className="msg-loc-label">
        <span className={live ? "chat-live-dot" : "chat-live-dot chat-live-dot--off"} aria-hidden="true" />
        Live location {live ? `· ends ${hhmm(share.expiresAt)}` : "· ended"}
      </div>
      {share.latitude != null ? (
        <>
          <div className="loc-map">
            <iframe title="Live location" src={embedUrl(share, 16)} loading="lazy" referrerPolicy="no-referrer-when-downgrade" />
          </div>
          <div className="msg-loc-note">
            {live ? `Updated ${fresh < 60_000 ? "just now" : `${Math.round(fresh / 60_000)}m ago`}` : "Last position before it stopped"}
          </div>
          <a className="msg-loc-cta" href={directionsUrl(share)} target="_blank" rel="noreferrer">{t("business.getDirections")}</a>
        </>
      ) : (
        <div className="msg-loc-note">Waiting for the first position…</div>
      )}
    </div>
  );
}

// One bubble type for both sides of a conversation: text, an attachment, a
// static pin, or a live location that keeps moving as its owner walks.
export default function MessageBubble({ message, mine }) {
  const { t } = useLanguage();
  const [broken, setBroken] = useState(false);
  const time = new Date(message.createdAt).toLocaleString();

  const body = () => {
    if (message.mediaKind) {
      return broken ? <Missing label={LABEL[message.mediaKind] || "Attachment"} /> : <Media message={message} onBroken={setBroken} />;
    }
    if (message.liveShare) return <LivePin share={message.liveShare} t={t} />;
    if (hasCoords(message)) {
      return (
        <>
          <div className="msg-loc-label">📍 {message.locationName || "Location"}</div>
          <div className="loc-map">
            <iframe title="Shared location" src={embedUrl(message)} loading="lazy" referrerPolicy="no-referrer-when-downgrade" />
          </div>
          <a className="msg-loc-cta" href={directionsUrl(message)} target="_blank" rel="noreferrer">{t("business.getDirections")}</a>
        </>
      );
    }
    return <span className="msg-text">{message.content}</span>;
  };

  const kind = message.mediaKind ? "msg-bubble--media" : message.liveShare ? "msg-bubble--live" : "";
  const isLoc = !!message.liveShare || hasCoords(message);

  return (
    <div className={`msg-bubble ${mine ? "mine" : "theirs"} ${isLoc ? "msg-bubble--loc" : ""} ${kind}`}>
      {message.mediaKind && <div className="msg-media-tag">{LABEL[message.mediaKind]}</div>}
      {body()}
      {message.mediaKind && message.content && <div className="msg-loc-note">{message.content}</div>}
      <div className="msg-time">{time}</div>
    </div>
  );
}
