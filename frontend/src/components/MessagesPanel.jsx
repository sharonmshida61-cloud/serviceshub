import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api";
import Icon from "./Icon.jsx";
import MessageBubble from "./MessageBubble.jsx";
import ChatComposer from "./ChatComposer.jsx";
import useChatThread, { stickToBottom } from "../hooks/useChatThread.js";
import { useAuth } from "../context/AuthContext.jsx";
import { describeMessage, timeAgo } from "../utils/chatSnippet.js";

const hit = (row, term) =>
  [row.name || row.businessName, row.city || row.businessCity, row.category?.name]
    .some((part) => (part || "").toLowerCase().includes(term));

// Provider inbox: one row per business the customer has talked to, plus a
// searchable directory so a first message to a brand new provider is possible.
export default function MessagesPanel() {
  const { user } = useAuth();
  const [threads, setThreads] = useState(null);
  const [starters, setStarters] = useState([]);
  const [active, setActive] = useState(null);
  const [listError, setListError] = useState("");
  const [query, setQuery] = useState("");
  const [found, setFound] = useState(null);
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

  // Two characters is enough to tell a plumber from a cleaner, and the whole
  // directory is searched per keystroke after that — so the call is debounced.
  const term = query.trim();
  useEffect(() => {
    if (term.length < 2) { setFound(null); return undefined; }
    let alive = true;
    const timer = setTimeout(() => {
      api.searchBusinesses({ q: term })
        .then((rows) => { if (alive) setFound(rows); })
        .catch(() => { if (alive) setFound([]); });
    }, 250);
    return () => { alive = false; clearTimeout(timer); };
  }, [term]);

  function open(thread) {
    setActive(thread);
    setQuery("");
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
  const lower = term.toLowerCase();
  const shown = term ? threads.filter((t) => hit(t, lower)) : threads;
  const shownFresh = term ? fresh.filter((b) => hit(b, lower)) : fresh;
  // Anything already on screen is not repeated under "Providers on Nearby";
  // anything not on screen stays reachable there, booked or not.
  const onScreen = new Set([...shown.map((t) => t.businessId), ...shownFresh.map((b) => b.id)]);
  const providers = (found || []).filter((b) => !onScreen.has(b.id));

  return (
    <div className="inbox">
      <section className="panel inbox-list">
        <div className="panel-head">
          <h3><Icon name="chat" size={17} />Conversations</h3>
          <span className="hint">{threads.length}</span>
        </div>
        <div className="inbox-search">
          <Icon name="search" size={16} />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search a chat, or find a provider to message"
            aria-label="Search for someone to chat with"
          />
          {query && (
            <button type="button" className="inbox-search-clear" onClick={() => setQuery("")} aria-label="Clear search">
              <Icon name="close" size={14} />
            </button>
          )}
        </div>
        <div className="panel-body flush">
          {threads.length === 0 && fresh.length === 0 && (
            <p className="inbox-empty">No conversations yet. Search for a provider above and send the first message.</p>
          )}
          {shown.map((t) => (
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
          {shownFresh.map((b) => (
            <button type="button" key={b.id} className="inbox-row inbox-row--new"
              onClick={() => open({ businessId: b.id, businessName: b.name, businessCity: b.city })}>
              <span className="inbox-who">
                <strong>{b.name}</strong>
                <span className="inbox-sub">{b.city || "—"} · booked before</span>
              </span>
              <span className="inbox-snippet"><span className="inbox-text inbox-start">Start a chat →</span></span>
            </button>
          ))}

          {term.length >= 2 && (found === null || providers.length > 0) && (
            <div className="inbox-group">
              <h4>{found === null ? "Searching the directory…" : "Providers on Nearby"}</h4>
              {providers.map((b) => (
                <button type="button" key={b.id} className="inbox-row inbox-row--new"
                  onClick={() => open({ businessId: b.id, businessName: b.name, businessCity: b.city })}>
                  <span className="inbox-who">
                    <strong>{b.name}</strong>
                    <span className="inbox-sub">
                      {b.city || "—"} · {b.category?.name || "Provider"}
                      {b.avgRating ? ` · ★ ${Number(b.avgRating).toFixed(1)}` : ""}
                    </span>
                  </span>
                  <span className="inbox-snippet"><span className="inbox-text inbox-start">Start a chat →</span></span>
                </button>
              ))}
            </div>
          )}
          {term.length >= 2 && found !== null && providers.length === 0 && shown.length === 0 && shownFresh.length === 0 && (
            <p className="inbox-empty">No provider matches “{term}”.</p>
          )}
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
