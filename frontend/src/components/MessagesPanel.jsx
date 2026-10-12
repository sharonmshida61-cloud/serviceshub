import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api";
import Icon from "./Icon.jsx";
import MessageBubble from "./MessageBubble.jsx";
import ChatComposer from "./ChatComposer.jsx";
import useChatThread, { stickToBottom } from "../hooks/useChatThread.js";
import { useAuth } from "../context/AuthContext.jsx";
import { describeMessage, timeAgo } from "../utils/chatSnippet.js";

// Provider inbox: one row per business the customer has talked to, plus a
// starter list built from their bookings so a first message is possible too.
export default function MessagesPanel() {
  const { user } = useAuth();
  const [threads, setThreads] = useState(null);
  const [starters, setStarters] = useState([]);
  const [active, setActive] = useState(null);
  const [listError, setListError] = useState("");
  const { messages, error, push } = useChatThread(active?.businessId);
  const endRef = useRef(null);

  useEffect(() => {
    api.myThreads().then(setThreads).catch((e) => setListError(e.message));
    api.myBookings()
      .then((rows) => {
        const seen = new Map();
        rows.forEach((b) => { if (b.business?.id && !seen.has(b.business.id)) seen.set(b.business.id, b.business); });
        setStarters([...seen.values()]);
      })
      .catch(() => setStarters([]));
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      if (document.visibilityState === "visible") api.myThreads().then(setThreads).catch(() => {});
    }, 8000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => { stickToBottom(endRef.current); }, [messages]);

  function open(thread) {
    setActive(thread);
  }

  // The composer owns sending; this receives each message it posts.
  function onSent(msg) {
    push(msg);
    setThreads((t) => (t || []).map((x) => (x.businessId === msg.businessId
      ? { ...x, lastMessage: describeMessage(msg), lastAt: msg.createdAt, lastFromMe: true, messageCount: x.messageCount + 1 }
      : x)));
  }

  if (!threads) return listError ? <div className="alert alert-error">{listError}</div> : <p>Loading…</p>;

  const listed = new Set(threads.map((t) => t.businessId));
  const fresh = starters.filter((b) => !listed.has(b.id));

  return (
    <div className="inbox">
      <section className="panel inbox-list">
        <div className="panel-head">
          <h3><Icon name="chat" size={17} />Conversations</h3>
          <span className="hint">{threads.length}</span>
        </div>
        <div className="panel-body flush">
          {threads.length === 0 && fresh.length === 0 && (
            <p className="inbox-empty">No conversations yet. Open a provider under Find Services and send the first message.</p>
          )}
          {threads.map((t) => (
            <button type="button" key={t.businessId}
              className={`inbox-row${active?.businessId === t.businessId ? " active" : ""}`}
              onClick={() => open(t)}>
              <span className="inbox-who">
                <strong>{t.businessName}</strong>
                <span className="inbox-sub">{t.businessCity} · {timeAgo(t.lastAt)}</span>
              </span>
              <span className="inbox-snippet">
                <span className="inbox-text">{t.lastFromMe ? `You: ${t.lastMessage}` : t.lastMessage}</span>
                <span className="inbox-count">{t.messageCount}</span>
              </span>
            </button>
          ))}
          {fresh.map((b) => (
            <button type="button" key={b.id} className="inbox-row inbox-row--new"
              onClick={() => open({ businessId: b.id, businessName: b.name, businessCity: b.city })}>
              <span className="inbox-who">
                <strong>{b.name}</strong>
                <span className="inbox-sub">{b.city || "—"} · booked before</span>
              </span>
              <span className="inbox-snippet"><span className="inbox-text inbox-start">Start a chat →</span></span>
            </button>
          ))}
        </div>
      </section>

      <section className="panel inbox-thread">
        <div className="panel-head">
          <h3>
            <Icon name="chat" size={17} />
            {active ? active.businessName : "Pick a conversation"}
          </h3>
          {active && (
            <Link className="linklike" to={`/business/${active.businessId}`}>Provider page</Link>
          )}
        </div>

        {!active && (
          <div className="panel-body">
            <p className="inbox-placeholder">Choose a provider on the left to read and reply to their messages.</p>
          </div>
        )}

        {active && (
          <>
            <div className="msg-thread inbox-scroll">
              {messages.length === 0 && <p className="hint">Say hello — the provider sees this on their dashboard.</p>}
              {messages.map((m) => (
                <MessageBubble key={m.id} message={m} mine={m.senderId === user?.id} />
              ))}
              <div ref={endRef} />
            </div>
            {error && <div className="alert alert-error inbox-error">{error}</div>}
            <ChatComposer
              businessId={active.businessId}
              onSent={onSent}
              placeholder={`Message ${active.businessName}…`}
            />
          </>
        )}
      </section>
    </div>
  );
}
