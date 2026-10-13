import { useEffect, useRef, useState } from "react";
import { api } from "../api";
import Icon from "./Icon.jsx";
import { getCurrentPosition, watchPosition } from "../utils/geolocation.js";
import { EMOJI_GROUPS, STICKERS, stickerUrl } from "../utils/chatPicker.js";

const MAX_VOICE_SECONDS = 300;
// WhatsApp's two sensible defaults; anything longer is a courier, not a customer.
const LIVE_OPTIONS = [
  { minutes: 15, label: "Share live for 15 minutes" },
  { minutes: 60, label: "Share live for 1 hour" },
];
const PING_EVERY_MS = 12_000;

const EXT_BY_MIME = {
  "image/jpeg": "jpg", "image/png": "png", "image/gif": "gif", "image/webp": "webp", "image/avif": "avif",
  "video/mp4": "mp4", "video/webm": "webm", "video/quicktime": "mov", "video/x-msvideo": "avi",
  "audio/webm": "webm", "audio/mp4": "m4a", "audio/mpeg": "mp3", "audio/ogg": "ogg", "audio/wav": "wav", "audio/aac": "aac",
};

const extFor = (mime) => EXT_BY_MIME[String(mime || "").split(";")[0]] || "bin";
const clock = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
const endTime = (iso) => new Date(iso).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });

// The message box for both sides of a conversation: text, emoji, stickers,
// photos, videos, documents, voice notes and a pin or live location, in one
// row of controls.
// `addressPin` is optional and owner-side only — the saved business location.
export default function ChatComposer({ businessId, customerId, addressPin, onSent, placeholder = "Type a message…" }) {
  const [text, setText] = useState("");
  const [menu, setMenu] = useState("");
  const [picker, setPicker] = useState("emoji");
  const [busy, setBusy] = useState("");
  const [rec, setRec] = useState(null);
  const [share, setShare] = useState(null);
  const [error, setError] = useState("");
  const inputRef = useRef(null);
  const photoRef = useRef(null);
  const videoRef = useRef(null);
  const docRef = useRef(null);
  const recorderRef = useRef(null);
  const secondsRef = useRef(0);
  const timerRef = useRef(null);
  const discardRef = useRef(false);

  const canRecord = typeof MediaRecorder !== "undefined" && !!navigator.mediaDevices?.getUserMedia;

  // A reload must not orphan a running share: pick it back up and keep pinging.
  useEffect(() => {
    let cancelled = false;
    api.myActiveShare(businessId)
      .then((s) => { if (!cancelled && s) setShare(s); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [businessId]);

  useEffect(() => {
    if (!share?.id) return undefined;
    let lastAt = 0;
    let lastFix = null;
    const cancel = watchPosition(
      (fix) => {
        const same = lastFix && lastFix.latitude === fix.latitude && lastFix.longitude === fix.longitude;
        if (same || Date.now() - lastAt < PING_EVERY_MS) return;
        lastAt = Date.now();
        lastFix = fix;
        api.pingLiveShare(share.id, fix).catch((e) => {
          // The session expired or was stopped elsewhere — drop the bar.
          if (/ended|no longer|not allowed|cannot/i.test(e.message)) setShare(null);
        });
      },
      () => {}
    );
    const expiry = setInterval(() => {
      if (Date.now() >= new Date(share.expiresAt).getTime()) setShare(null);
    }, 15_000);
    return () => { cancel(); clearInterval(expiry); };
  }, [share?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => () => {
    clearInterval(timerRef.current);
    const mr = recorderRef.current;
    if (mr && mr.state !== "inactive") { discardRef.current = true; mr.stop(); }
  }, []);

  async function uploadAndSend(file, mediaSecs) {
    setBusy("media");
    setError("");
    try {
      const up = await api.uploadChatMedia(businessId, file, { customerId });
      const msg = await api.sendMessage(businessId, {
        customerId,
        mediaKind: up.kind,
        mediaUrl: up.url,
        ...(mediaSecs ? { mediaSecs: Math.round(mediaSecs) } : {}),
        ...(up.kind === "DOCUMENT" ? { mediaName: up.name || file.name, mediaSize: up.size ?? file.size } : {}),
      });
      onSent(msg);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy("");
    }
  }

  function pickFile(e) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (file) uploadAndSend(file);
  }

  // An emoji lands where the caret is, so a reaction can go in the middle of a
  // sentence — and the panel stays open for a second one.
  function insertEmoji(emoji) {
    const el = inputRef.current;
    const from = el?.selectionStart ?? text.length;
    const to = el?.selectionEnd ?? from;
    setText(text.slice(0, from) + emoji + text.slice(to));
    requestAnimationFrame(() => {
      if (!el) return;
      el.focus();
      el.setSelectionRange(from + emoji.length, from + emoji.length);
    });
  }

  async function sendSticker(sticker) {
    setMenu("");
    setBusy("sticker");
    setError("");
    try {
      const msg = await api.sendMessage(businessId, {
        customerId,
        mediaKind: "STICKER",
        mediaUrl: stickerUrl(sticker.file),
      });
      onSent(msg);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy("");
    }
  }

  async function sendText() {
    const content = text.trim();
    if (!content || busy) return;
    setBusy("send");
    setError("");
    try {
      const msg = await api.sendMessage(businessId, { customerId, content });
      setText("");
      onSent(msg);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy("");
    }
  }

  async function sendCurrentLocation() {
    setMenu("");
    setBusy("pin");
    setError("");
    try {
      const coords = await getCurrentPosition();
      const msg = await api.sendMessage(businessId, { customerId, content: text.trim(), ...coords, locationName: "Where I am now" });
      setText("");
      onSent(msg);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy("");
    }
  }

  async function sendAddressPin() {
    setMenu("");
    setBusy("pin");
    setError("");
    try {
      const msg = await api.sendMessage(businessId, {
        customerId,
        content: text.trim(),
        latitude: addressPin.latitude,
        longitude: addressPin.longitude,
        locationName: addressPin.name,
      });
      setText("");
      onSent(msg);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy("");
    }
  }

  async function startLive(minutes) {
    setMenu("");
    setBusy("pin");
    setError("");
    try {
      const coords = await getCurrentPosition();
      const { share: started, message } = await api.startLiveShare({ businessId, customerId, minutes, ...coords });
      onSent(message);
      setShare(started);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy("");
    }
  }

  async function endLive() {
    const id = share?.id;
    setShare(null);
    if (!id) return;
    try {
      await api.stopLiveShare(id);
    } catch {
      /* the share simply keeps running until it expires */
    }
  }

  async function startRecording() {
    setMenu("");
    setError("");
    let stream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      setError("Microphone access was blocked — allow it in your browser to record a voice note");
      return;
    }
    const mr = new MediaRecorder(stream);
    const chunks = [];
    mr.ondataavailable = (e) => { if (e.data.size) chunks.push(e.data); };
    mr.onstop = async () => {
      stream.getTracks().forEach((t) => t.stop());
      clearInterval(timerRef.current);
      const seconds = secondsRef.current;
      setRec(null);
      if (discardRef.current) { discardRef.current = false; return; }
      const type = mr.mimeType || "audio/webm";
      const blob = new Blob(chunks, { type });
      await uploadAndSend(new File([blob], `voice-note-${Date.now()}.${extFor(type)}`, { type }), seconds);
    };
    recorderRef.current = mr;
    secondsRef.current = 0;
    discardRef.current = false;
    setRec({ seconds: 0 });
    mr.start();
    timerRef.current = setInterval(() => {
      secondsRef.current += 1;
      setRec((r) => (r ? { ...r, seconds: secondsRef.current } : r));
      if (secondsRef.current >= MAX_VOICE_SECONDS) stopRecording(true);
    }, 1000);
  }

  function stopRecording(send) {
    clearInterval(timerRef.current);
    discardRef.current = !send;
    if (recorderRef.current && recorderRef.current.state !== "inactive") recorderRef.current.stop();
  }

  return (
    <div className="chat-compose">
      {share && (
        <div className="chat-live-bar">
          <span className="chat-live-dot" aria-hidden="true" />
          <span>Live location on · ends {endTime(share.expiresAt)}</span>
          <button type="button" className="linklike" onClick={endLive}>Stop sharing</button>
        </div>
      )}

      {rec ? (
        <div className="chat-rec">
          <span className="chat-rec-dot" aria-hidden="true" />
          <span className="chat-rec-time">{clock(rec.seconds)}</span>
          <span className="hint">Recording voice note</span>
          <button type="button" className="chat-tool" onClick={() => stopRecording(false)} aria-label="Discard voice note">
            <Icon name="close" />
          </button>
          <button type="button" className="btn btn-primary btn-sm" onClick={() => stopRecording(true)} disabled={busy === "media"}>
            {busy === "media" ? "Uploading…" : "Send"}
          </button>
        </div>
      ) : (
        <div className="chat-field">
          <button type="button" className={`chat-tool${menu === "react" ? " on" : ""}`} onClick={() => setMenu((m) => (m === "react" ? "" : "react"))} aria-label="Insert an emoji or sticker" title="Emoji & stickers">
            <Icon name="smile" />
          </button>
          <button type="button" className={`chat-tool${menu === "attach" ? " on" : ""}`} onClick={() => setMenu((m) => (m === "attach" ? "" : "attach"))} aria-label="Attach a photo, video or document" title="Photo, video or document">
            <Icon name="clip" />
          </button>
          <input
            ref={inputRef}
            className="chat-input"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); sendText(); } }}
            placeholder={placeholder}
            aria-label="Message"
          />
          <button type="button" className={`chat-tool${menu === "location" ? " on" : ""}`} disabled={!!share} onClick={() => setMenu((m) => (m === "location" ? "" : "location"))} aria-label="Share a location" title="Location">
            <Icon name="pin" />
          </button>
          {canRecord && (
            <button type="button" className="chat-tool" onClick={startRecording} disabled={!!busy} aria-label="Record a voice note" title="Voice note">
              <Icon name="mic" />
            </button>
          )}
          <button type="button" className="chat-send" onClick={sendText} disabled={!text.trim() || !!busy} aria-label="Send message">
            <Icon name="send" />
          </button>
        </div>
      )}

      {menu && (
        <>
          <button type="button" className="chat-menu-backdrop" onClick={() => setMenu("")} tabIndex={-1} aria-label="Close menu" />
          {menu === "react" ? (
            <div className="chat-picker">
              <div className="chat-picker-tabs" role="tablist">
                <button type="button" role="tab" aria-selected={picker === "emoji"} className={picker === "emoji" ? "on" : ""} onClick={() => setPicker("emoji")}>Emoji</button>
                <button type="button" role="tab" aria-selected={picker === "sticker"} className={picker === "sticker" ? "on" : ""} onClick={() => setPicker("sticker")}>Stickers</button>
              </div>
              {picker === "emoji" ? (
                <div className="chat-picker-body">
                  {EMOJI_GROUPS.map((g) => (
                    <div key={g.key} className="chat-emoji-group">
                      <h5>{g.label}</h5>
                      <div className="chat-emoji-grid">
                        {g.items.map((e) => (
                          <button key={e} type="button" onClick={() => insertEmoji(e)} aria-label={`Insert ${e}`}>{e}</button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="chat-sticker-grid">
                  {STICKERS.map((s) => (
                    <button key={s.file} type="button" disabled={!!busy} onClick={() => sendSticker(s)} title={s.label} aria-label={`Send the ${s.label} sticker`}>
                      <img src={stickerUrl(s.file)} alt="" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="chat-menu" role="menu">
              {menu === "attach" && (
                <>
                  <button type="button" role="menuitem" onClick={() => { setMenu(""); photoRef.current?.click(); }}>
                    <Icon name="image" size={16} /> Photo
                  </button>
                  <button type="button" role="menuitem" onClick={() => { setMenu(""); videoRef.current?.click(); }}>
                    <Icon name="video" size={16} /> Video
                  </button>
                  <button type="button" role="menuitem" onClick={() => { setMenu(""); docRef.current?.click(); }}>
                    <Icon name="document" size={16} /> Document
                  </button>
                </>
              )}
            {menu === "location" && (
              <>
                <button type="button" role="menuitem" disabled={busy === "pin"} onClick={sendCurrentLocation}>
                  <Icon name="pin" size={16} /> {busy === "pin" ? "Locating…" : "Send my current location"}
                </button>
                {addressPin && (
                  <button type="button" role="menuitem" disabled={busy === "pin"} onClick={sendAddressPin}>
                    <Icon name="store" size={16} /> Send {addressPin.name}
                  </button>
                )}
                {LIVE_OPTIONS.map((o) => (
                  <button key={o.minutes} type="button" role="menuitem" disabled={busy === "pin"} onClick={() => startLive(o.minutes)}>
                    <span className="chat-live-dot" aria-hidden="true" /> {o.label}
                  </button>
                ))}
              </>
            )}
            </div>
          )}
        </>
      )}

      <input ref={photoRef} type="file" accept="image/*" hidden onChange={pickFile} />
      <input ref={videoRef} type="file" accept="video/*" hidden onChange={pickFile} />
      <input ref={docRef} type="file" accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.rtf,.txt,.csv" hidden onChange={pickFile} />

      {error && <div className="alert alert-error">{error}</div>}
      {busy === "media" && !rec && <div className="hint chat-uploading">Uploading attachment…</div>}
    </div>
  );
}
