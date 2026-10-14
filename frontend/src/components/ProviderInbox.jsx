import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api";
import Icon from "./Icon.jsx";
import MessageBubble from "./MessageBubble.jsx";
import ChatComposer from "./ChatComposer.jsx";
import useChatThread, { stickToBottom } from "../hooks/useChatThread.js";
import { describeMessage, timeAgo as chatTimeAgo } from "../utils/chatSnippet.js";
import { hasCoords } from "../utils/geolocation.js";

// The provider-side inbox. Both the listing owner and a teammate signed in as
// staff read and answer the same customer threads, so the markup is shared and
// cannot drift between the two dashboards.
export default function ProviderInbox({ business }) {
  const [threads, setThreads] = useState(null);
  const [booked, setBooked] = useState([]);
  const [active, setActive] = useState(null);
  const [listError, setListError] = useState("");
  const [query, setQuery] = useState("");
  const { messages, error, push } = useChatThread(business?.id, active?.customerId);
  const endRef = useRef(null);

  useEffect(() => {
    api.businessThreads(business.id).then(setThreads).catch((e) => setListError(e.message));
    // Customers who booked but never messaged are still reachable, the same way
    // a provider the customer booked is reachable from their own inbox.
    api.businessCustomers(business.id)
      .then((rows) => setBooked(rows.map((r) => ({
        customerId: r.customer.id,
        customerName: r.customer.name,
        lastService: r.bookings?.[0]?.service?.name || "",
      }))))
      .catch(() => setBooked([]));
  }, [business.id]);

  useEffect(() => {
    const timer = setInterval(() => {
      if (document.visibilityState === "visible") api.businessThreads(business.id).then(setThreads).catch(() => {});
    }, 8000);
    return () => clearInterval(timer);
  }, [business.id]);

  useEffect(() => { stickToBottom(endRef.current); }, [messages]);

  function open(thread) {
    setActive(thread);
    setQuery("");
  }

  // The composer owns sending; this receives each message it posts.
  function onSent(msg) {
    push(msg);
    setThreads((t) => {
      const rows = t || [];
      const known = rows.some((x) => x.customerId === msg.customerId);
      const updated = rows.map((x) => (x.customerId === msg.customerId
        ? { ...x, lastMessage: describeMessage(msg), lastAt: msg.createdAt, lastFromMe: true, messageCount: x.messageCount + 1 }
        : x));
      // The first reply opens a conversation that was not in the list yet.
      return known ? updated : [{
        customerId: msg.customerId,
        customerName: active?.customerName || "Customer",
        lastMessage: describeMessage(msg),
        lastAt: msg.createdAt,
        lastFromMe: true,
        messageCount: 1,
      }, ...updated];
    });
  }

  const addressPin = hasCoords(business)
    ? { latitude: business.latitude, longitude: business.longitude, name: `${business.name} address` }
    : null;

  if (!threads) return listError ? <div className="alert alert-error">{listError}</div> : <p>Loading…</p>;

  const listed = new Set(threads.map((t) => t.customerId));
  const fresh = booked.filter((c) => !listed.has(c.customerId));
  const term = query.trim().toLowerCase();
  const shown = term ? threads.filter((t) => (t.customerName || "").toLowerCase().includes(term)) : threads;
  const shownFresh = term ? fresh.filter((c) => (c.customerName || "").toLowerCase().includes(term)) : fresh;

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
            placeholder="Search a chat, or find a customer to message"
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
            <p className="inbox-empty">No conversations yet. Customers can message you from your listing page.</p>
          )}
          {shown.map((t) => (
            <button type="button" key={t.customerId}
              className={`inbox-row${active?.customerId === t.customerId ? " active" : ""}`}
              onClick={() => open(t)}>
              <span className="inbox-who">
                <strong>{t.customerName}</strong>
                <span className="inbox-sub">{chatTimeAgo(t.lastAt)}</span>
              </span>
              <span className="inbox-snippet">
                <span className="inbox-text">{t.lastFromMe ? `You: ${t.lastMessage}` : t.lastMessage}</span>
                <span className="inbox-count">{t.messageCount}</span>
              </span>
            </button>
          ))}
          {shownFresh.map((c) => (
            <button type="button" key={c.customerId} className="inbox-row inbox-row--new"
              onClick={() => open({ customerId: c.customerId, customerName: c.customerName })}>
              <span className="inbox-who">
                <strong>{c.customerName}</strong>
                <span className="inbox-sub">{c.lastService ? `${c.lastService} · ` : ""}booked before</span>
              </span>
              <span className="inbox-snippet"><span className="inbox-text inbox-start">Start a chat →</span></span>
            </button>
          ))}
          {term && shown.length === 0 && shownFresh.length === 0 && (
            <p className="inbox-empty">No customer matches “{query.trim()}”.</p>
          )}
        </div>
      </section>

      <section className="panel inbox-thread">
        <div className="panel-head">
          <h3>
            <Icon name="chat" size={17} />
            {active ? active.customerName : "Pick a conversation"}
          </h3>
          {active && <Link className="linklike" to={`/business/${business.id}`}>Listing page</Link>}
        </div>

        {!active && (
          <div className="panel-body">
            <p className="inbox-placeholder">Choose a customer on the left to read and reply to their messages.</p>
          </div>
        )}

        {active && (
          <>
            <div className="msg-thread inbox-scroll">
              {messages.length === 0 && <p className="hint">Say hello — the customer sees this on their dashboard.</p>}
              {messages.map((m) => (
                <MessageBubble key={m.id} message={m} mine={m.senderId !== active.customerId} />
              ))}
              <div ref={endRef} />
            </div>
            {error && <div className="alert alert-error inbox-error">{error}</div>}
            <ChatComposer
              businessId={business.id}
              customerId={active.customerId}
              addressPin={addressPin}
              onSent={onSent}
              placeholder={`Message ${active.customerName}…`}
            />
            {!addressPin && (
              <p className="hint inbox-note">Pin your location under Business details to send customers your address.</p>
            )}
          </>
        )}
      </section>
    </div>
  );
}
