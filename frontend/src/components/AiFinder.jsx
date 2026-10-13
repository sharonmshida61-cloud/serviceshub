import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { api, formatMoney } from "../api";
import Icon from "./Icon.jsx";

const STARTERS = [
  "Barber tomorrow after 6 PM under $20",
  "Emergency plumber in Dar es Salaam",
  "Home cleaning this weekend",
  "Math tutor for my kids",
];

const ACCEPT_FILES = "image/*,video/mp4,video/webm,audio/*,application/pdf,.doc,.docx";

const MAX_FILE_MB = 20;
const MAX_FILE_BYTES = MAX_FILE_MB * 1024 * 1024;

function cheapest(business) {
  const prices = (business.services || []).map((s) => s.priceCents).filter((n) => Number.isFinite(n));
  return prices.length ? formatMoney(Math.min(...prices)) : null;
}

function fileKind(file) {
  if (!file) return "file";
  if (file.type.startsWith("image/")) return "image";
  if (file.type.startsWith("audio/")) return "audio";
  if (file.type.startsWith("video/")) return "video";
  return "document";
}

function FilePreview({ file, url, onRemove }) {
  const kind = fileKind(file);
  return (
    <div className="ai-attach-preview">
      {kind === "image" ? (
        <img src={url} alt={file?.name || "attachment"} className="ai-attach-thumb" />
      ) : kind === "audio" ? (
        <div className="ai-attach-audio-icon">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24"
            fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
            <path d="M19 10v2a7 7 0 0 1-14 0v-2M12 19v4M8 23h8"/>
          </svg>
        </div>
      ) : kind === "video" ? (
        <div className="ai-attach-audio-icon">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24"
            fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/>
          </svg>
        </div>
      ) : (
        <div className="ai-attach-audio-icon">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24"
            fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
            <polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/>
            <line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/>
          </svg>
        </div>
      )}
      <span className="ai-attach-name">{file?.name || "voice note"}</span>
      {onRemove && (
        <button type="button" className="ai-attach-remove" onClick={onRemove} aria-label="Remove attachment">×</button>
      )}
    </div>
  );
}

function AttachmentBubble({ attachment }) {
  if (!attachment) return null;
  const { url, kind, mime } = attachment;
  if (kind === "image") {
    return (
      <a href={url} target="_blank" rel="noreferrer" className="ai-bubble-attach">
        <img src={url} alt="attachment" className="ai-bubble-img" />
      </a>
    );
  }
  if (kind === "audio") {
    return (
      <div className="ai-bubble-attach">
        {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
        <audio controls src={url} className="ai-bubble-audio" />
      </div>
    );
  }
  if (kind === "video") {
    return (
      <div className="ai-bubble-attach">
        {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
        <video controls src={url} className="ai-bubble-video" />
      </div>
    );
  }
  return (
    <a href={url} target="_blank" rel="noreferrer" className="ai-bubble-attach ai-bubble-doc">
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24"
        fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
        <polyline points="14 2 14 8 20 8"/>
      </svg>
      View attachment
    </a>
  );
}

// Conversational front-end for POST /api/smartmatch
export default function AiFinder() {
  const [turns, setTurns] = useState([]);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  // Attachment state
  const [attachFile, setAttachFile] = useState(null);   // File object
  const [attachPreview, setAttachPreview] = useState(null); // object URL for preview
  const fileInputRef = useRef(null);

  // Voice recording state
  const [recording, setRecording] = useState(false);
  const [recordSeconds, setRecordSeconds] = useState(0);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const recordTimerRef = useRef(null);

  // Speech-to-text (browser native)
  const recognitionRef = useRef(null);
  const [speechSupported] = useState(() => !!(window.SpeechRecognition || window.webkitSpeechRecognition));

  const endRef = useRef(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "nearest" });
  }, [turns, busy]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (attachPreview) URL.revokeObjectURL(attachPreview);
      stopRecording(true);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── File attachment ──────────────────────────────────────────────────────
  function handleFileChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > MAX_FILE_BYTES) {
      setError(`File too large — max ${MAX_FILE_MB} MB`);
      return;
    }
    // Revoke old preview
    if (attachPreview) URL.revokeObjectURL(attachPreview);
    setAttachFile(file);
    setAttachPreview(URL.createObjectURL(file));
    setError("");
    // reset input so the same file can be re-selected
    e.target.value = "";
  }

  function removeAttachment() {
    if (attachPreview) URL.revokeObjectURL(attachPreview);
    setAttachFile(null);
    setAttachPreview(null);
  }

  // ── Voice recording ──────────────────────────────────────────────────────
  async function startRecording() {
    setError("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];

      // Try to use speech recognition for live transcription
      if (speechSupported) {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = "en-US";
        let finalTranscript = "";
        recognition.onresult = (event) => {
          let interim = "";
          for (let i = event.resultIndex; i < event.results.length; i++) {
            if (event.results[i].isFinal) {
              finalTranscript += event.results[i][0].transcript + " ";
            } else {
              interim += event.results[i][0].transcript;
            }
          }
          setText(finalTranscript + interim);
        };
        recognition.onerror = () => {};
        recognition.start();
        recognitionRef.current = recognition;
      }

      const mimeType = MediaRecorder.isTypeSupported("audio/webm") ? "audio/webm" : "audio/ogg";
      const recorder = new MediaRecorder(stream, { mimeType });
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };
      recorder.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(audioChunksRef.current, { type: mimeType });
        const ext = mimeType.includes("webm") ? "webm" : "ogg";
        const voiceFile = new File([blob], `voice-note.${ext}`, { type: mimeType });
        if (attachPreview) URL.revokeObjectURL(attachPreview);
        setAttachFile(voiceFile);
        setAttachPreview(URL.createObjectURL(voiceFile));
      };

      mediaRecorderRef.current = recorder;
      recorder.start(250);
      setRecording(true);
      setRecordSeconds(0);
      recordTimerRef.current = setInterval(() => setRecordSeconds((s) => s + 1), 1000);
    } catch (err) {
      setError("Microphone access denied — please allow microphone permissions.");
    }
  }

  function stopRecording(silent = false) {
    clearInterval(recordTimerRef.current);
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch {}
      recognitionRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
    mediaRecorderRef.current = null;
    if (!silent) setRecording(false);
  }

  function toggleRecording() {
    if (recording) {
      stopRecording();
    } else {
      startRecording();
    }
  }

  // ── Send message ─────────────────────────────────────────────────────────
  async function ask(e, override) {
    e?.preventDefault();
    const q = (override ?? text).trim();
    if ((!q && !attachFile) || busy) return;

    const displayText = q || (attachFile?.type?.startsWith("audio/") ? "🎤 Voice note" : "📎 Attachment");
    const localPreview = attachPreview;
    const localFile = attachFile;
    const localFileKind = localFile ? fileKind(localFile) : null;

    setText("");
    removeAttachment();
    setError("");

    setTurns((t) => [
      ...t,
      {
        role: "me",
        q: displayText,
        attachPreview: localPreview,
        attachKind: localFileKind,
        attachName: localFile?.name,
        attachMime: localFile?.type,
      },
    ]);
    setBusy(true);

    try {
      const r = await api.smartMatch(q || " ", localFile || undefined);
      setTurns((t) => [
        ...t,
        { role: "ai", message: r.message, understood: r.understood, results: r.results, attachment: r.attachment },
      ]);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  const canSend = (text.trim() || attachFile) && !busy;

  return (
    <section className="panel ai-panel ai-panel--rich">
      <div className="panel-head">
        <h3><Icon name="sparkle" size={17} /> Find with AI</h3>
      </div>

      <div className="panel-body">
        <p className="ai-hint">
          Describe what you need — type, attach a photo/document, or send a voice note.
        </p>

        {/* ── Thread ── */}
        <div className="ai-thread">
          <div className="ai-msg ai-msg--ai">
            Hi! Tell me what you need done and I'll find the best providers. You can also send a photo, document or voice note.
          </div>

          {turns.map((turn, i) =>
            turn.role === "me" ? (
              <div className="ai-msg ai-msg--me" key={i}>
                {/* Inline attachment preview inside user bubble */}
                {turn.attachPreview && (
                  <div className="ai-bubble-attach-wrap">
                    {turn.attachKind === "image" ? (
                      <img src={turn.attachPreview} alt="attachment" className="ai-bubble-img" />
                    ) : turn.attachKind === "audio" ? (
                      /* eslint-disable-next-line jsx-a11y/media-has-caption */
                      <audio controls src={turn.attachPreview} className="ai-bubble-audio" />
                    ) : (
                      <span className="ai-bubble-file-chip">
                        📎 {turn.attachName || "file"}
                      </span>
                    )}
                  </div>
                )}
                {turn.q && turn.q !== "🎤 Voice note" && turn.q !== "📎 Attachment" && (
                  <span>{turn.q}</span>
                )}
                {(turn.q === "🎤 Voice note" || turn.q === "📎 Attachment") && !turn.attachPreview && (
                  <span>{turn.q}</span>
                )}
              </div>
            ) : (
              <div className="ai-msg ai-msg--ai" key={i}>
                {/* Server-side attachment echo */}
                {turn.attachment && <AttachmentBubble attachment={turn.attachment} />}
                <div>{turn.message}</div>
                {turn.understood?.length > 0 && (
                  <div className="ai-chips">
                    {turn.understood.map((u) => (
                      <span className="ai-chip" key={`${i}-${u.label}-${u.value}`}>
                        <strong>{u.label}</strong> {u.value}
                      </span>
                    ))}
                  </div>
                )}
                {turn.results?.length > 0 && (
                  <div className="ai-results">
                    {turn.results.map((b) => (
                      <Link className="ai-result" to={`/business/${b.id}`} key={b.id}>
                        <span className="ai-result-score">{b.matchScore}%</span>
                        <span className="ai-result-body">
                          <span className="ai-result-name">{b.name}</span>
                          <span className="ai-result-meta">
                            {[b.category?.name, b.city, cheapest(b) && `from ${cheapest(b)}`]
                              .filter(Boolean)
                              .join(" · ")}
                          </span>
                        </span>
                        <span className="ai-result-cta">View →</span>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            )
          )}

          {busy && (
            <div className="ai-msg ai-msg--ai ai-typing" aria-live="polite">
              <span className="ai-dot" /><span className="ai-dot" /><span className="ai-dot" />
            </div>
          )}
          <div ref={endRef} />
        </div>

        {/* ── Starter chips (shown only before first message) ── */}
        {turns.length === 0 && (
          <div className="ai-starters">
            {STARTERS.map((s) => (
              <button type="button" className="ai-starter" key={s} onClick={(e) => ask(e, s)}>
                {s}
              </button>
            ))}
          </div>
        )}

        {/* ── Attachment preview strip ── */}
        {attachFile && (
          <div className="ai-attach-strip">
            <FilePreview file={attachFile} url={attachPreview} onRemove={removeAttachment} />
          </div>
        )}

        {/* ── Recording indicator ── */}
        {recording && (
          <div className="ai-recording-bar">
            <span className="ai-recording-dot" />
            <span>Recording {Math.floor(recordSeconds / 60).toString().padStart(2, "0")}:{(recordSeconds % 60).toString().padStart(2, "0")}</span>
            <span className="ai-recording-hint">— tap mic to stop</span>
          </div>
        )}

        {/* ── Error ── */}
        {error && <div className="alert alert-error ai-error">{error}</div>}

        {/* ── Compose bar ── */}
        <form className="ai-compose ai-compose--rich" onSubmit={ask}>
          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            accept={ACCEPT_FILES}
            style={{ display: "none" }}
            onChange={handleFileChange}
            aria-label="Attach file"
          />

          {/* Attach button */}
          <button
            type="button"
            className="ai-compose-icon-btn"
            onClick={() => fileInputRef.current?.click()}
            title="Attach image, document or file"
            aria-label="Attach file"
            disabled={busy}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24"
              fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/>
            </svg>
          </button>

          {/* Text input */}
          <input
            className="ai-compose-input"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); ask(e); }
            }}
            placeholder={recording ? "Listening…" : "e.g. Hair salon near me this Saturday under $40"}
            aria-label="Ask the AI assistant"
            disabled={busy}
          />

          {/* Voice button */}
          <button
            type="button"
            className={`ai-compose-icon-btn${recording ? " ai-compose-icon-btn--recording" : ""}`}
            onClick={toggleRecording}
            title={recording ? "Stop recording" : "Send a voice note"}
            aria-label={recording ? "Stop recording" : "Start voice recording"}
            disabled={busy}
          >
            {recording ? (
              /* stop icon */
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24"
                fill="currentColor" stroke="none">
                <rect x="4" y="4" width="16" height="16" rx="2"/>
              </svg>
            ) : (
              /* mic icon */
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24"
                fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
                <path d="M19 10v2a7 7 0 0 1-14 0v-2M12 19v4M8 23h8"/>
              </svg>
            )}
          </button>

          {/* Send button */}
          <button
            className="btn btn-primary ai-compose-send"
            type="submit"
            disabled={!canSend}
            aria-label="Send"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24"
              fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
            </svg>
          </button>
        </form>
      </div>
    </section>
  );
}
