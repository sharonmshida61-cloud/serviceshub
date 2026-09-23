import { useLanguage } from "../context/LanguageContext.jsx";
import { directionsUrl, embedUrl, hasCoords } from "../utils/geolocation.js";

// One bubble type for both sides of a conversation: plain text, or a shared
// map pin that the receiving customer can tap straight into turn-by-turn.
export default function MessageBubble({ message, mine }) {
  const { t } = useLanguage();
  const time = new Date(message.createdAt).toLocaleString();

  if (hasCoords(message)) {
    return (
      <div className={`msg-bubble msg-bubble--loc ${mine ? "mine" : "theirs"}`}>
        <div className="msg-loc-label">📍 {message.locationName || "Location"}</div>
        {message.content && <div className="msg-loc-note">{message.content}</div>}
        <div className="loc-map">
          <iframe
            title="Shared location"
            src={embedUrl(message)}
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
          />
        </div>
        <a className="msg-loc-cta" href={directionsUrl(message)} target="_blank" rel="noreferrer">
          {t("business.getDirections")}
        </a>
        <div className="msg-time">{time}</div>
      </div>
    );
  }

  return (
    <div className={`msg-bubble ${mine ? "mine" : "theirs"}`}>
      {message.content}
      <div className="msg-time">{time}</div>
    </div>
  );
}
