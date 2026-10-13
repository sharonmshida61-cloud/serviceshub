import { Fragment, useEffect, useRef, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { api, formatMoney } from "../api";
import Icon from "./Icon.jsx";
import { RangeSwitch } from "./DashboardPanels.jsx";

const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const DOW    = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
const FILTERS = ["All","Upcoming","Completed","Cancelled","Past"];

const midnight = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const dayKey   = (d) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;

function toInputValue(date) {
  const d = new Date(date);
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

const unpaid      = (b) => b.payment?.status !== "PAID";
// Show Pay button for any active booking (PENDING or CONFIRMED) that hasn't been paid yet.
// Paying a PENDING booking auto-confirms it on the backend.
const canPay      = (b) =>
  ["PENDING", "CONFIRMED"].includes(b.status) && unpaid(b);
const editable    = (b) => ["PENDING","CONFIRMED"].includes(b.status);

// ── Payment modal ─────────────────────────────────────────────────────────────
const METHODS = [
  { id: "card",   label: "Credit / Debit Card",  icon: "💳" },
  { id: "mobile", label: "Mobile Money",          icon: "📱" },
  { id: "cash",   label: "Pay on Arrival (Cash)", icon: "💵" },
];

function formatCardInput(raw) {
  return raw.replace(/\D/g, "").slice(0, 16).replace(/(.{4})/g, "$1 ").trim();
}
function formatExpiry(raw) {
  const digits = raw.replace(/\D/g, "").slice(0, 4);
  return digits.length > 2 ? `${digits.slice(0, 2)}/${digits.slice(2)}` : digits;
}

function PaymentModal({ booking, onClose, onPaid }) {
  const [method,  setMethod]  = useState("card");
  const [cardNum, setCardNum] = useState("");
  const [expiry,  setExpiry]  = useState("");
  const [cvv,     setCvv]     = useState("");
  const [phone,   setPhone]   = useState("");
  const [name,    setName]    = useState("");
  const [busy,    setBusy]    = useState(false);
  const [error,   setError]   = useState("");
  const overlayRef = useRef(null);

  // Close on Escape
  useEffect(() => {
    function onKey(e) { if (e.key === "Escape") onClose(); }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  // Lock body scroll
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  function handleOverlayClick(e) {
    if (e.target === overlayRef.current) onClose();
  }

  async function submit(e) {
    e.preventDefault();
    setError("");

    // Basic client-side validation for card payments
    if (method === "card") {
      if (cardNum.replace(/\s/g, "").length < 16) { setError("Enter a valid 16-digit card number."); return; }
      if (expiry.length < 5) { setError("Enter a valid expiry date (MM/YY)."); return; }
      if (cvv.replace(/\D/g, "").length < 3)  { setError("Enter a valid CVV."); return; }
    }
    if (method === "mobile" && phone.replace(/\D/g, "").length < 9) {
      setError("Enter a valid mobile number."); return;
    }

    setBusy(true);
    try {
      await api.payForBooking(booking.id, method);
      onPaid();
    } catch (err) {
      setError(err.message || "Payment failed. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="pay-overlay" ref={overlayRef} onClick={handleOverlayClick} aria-modal="true" role="dialog" aria-label="Payment">
      <div className="pay-modal">
        {/* Header */}
        <div className="pay-modal-head">
          <div>
            <div className="pay-modal-eyebrow">Complete Payment</div>
            <h2 className="pay-modal-title">{booking.service?.name}</h2>
            <div className="pay-modal-meta">{booking.business?.name}</div>
          </div>
          <button type="button" className="pay-modal-close" onClick={onClose} aria-label="Close">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24"
              fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        {/* Amount banner */}
        <div className="pay-amount-banner">
          <span className="pay-amount-label">Amount due</span>
          <span className="pay-amount-value">{formatMoney(booking.priceCents)}</span>
        </div>

        {/* Method selector */}
        <div className="pay-methods">
          {METHODS.map((m) => (
            <button
              key={m.id}
              type="button"
              className={`pay-method-btn${method === m.id ? " pay-method-btn--active" : ""}`}
              onClick={() => { setMethod(m.id); setError(""); }}
            >
              <span className="pay-method-icon">{m.icon}</span>
              <span className="pay-method-label">{m.label}</span>
            </button>
          ))}
        </div>

        {/* Form */}
        <form className="pay-form" onSubmit={submit} noValidate>
          {method === "card" && (
            <>
              <div className="pay-field">
                <label>Cardholder name</label>
                <input
                  type="text"
                  placeholder="John Doe"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  autoComplete="cc-name"
                  required
                />
              </div>
              <div className="pay-field">
                <label>Card number</label>
                <div className="pay-input-icon-wrap">
                  <svg className="pay-input-icon" xmlns="http://www.w3.org/2000/svg" width="16" height="16"
                    viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/>
                  </svg>
                  <input
                    type="text"
                    inputMode="numeric"
                    placeholder="1234 5678 9012 3456"
                    value={cardNum}
                    onChange={(e) => setCardNum(formatCardInput(e.target.value))}
                    autoComplete="cc-number"
                    maxLength={19}
                    required
                  />
                </div>
              </div>
              <div className="pay-field-row">
                <div className="pay-field">
                  <label>Expiry</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    placeholder="MM/YY"
                    value={expiry}
                    onChange={(e) => setExpiry(formatExpiry(e.target.value))}
                    autoComplete="cc-exp"
                    maxLength={5}
                    required
                  />
                </div>
                <div className="pay-field">
                  <label>CVV</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    placeholder="•••"
                    value={cvv}
                    onChange={(e) => setCvv(e.target.value.replace(/\D/g, "").slice(0, 4))}
                    autoComplete="cc-csc"
                    maxLength={4}
                    required
                  />
                </div>
              </div>
            </>
          )}

          {method === "mobile" && (
            <>
              <div className="pay-field">
                <label>Mobile money number</label>
                <div className="pay-input-icon-wrap">
                  <svg className="pay-input-icon" xmlns="http://www.w3.org/2000/svg" width="16" height="16"
                    viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <rect x="5" y="2" width="14" height="20" rx="2"/><line x1="12" y1="18" x2="12.01" y2="18"/>
                  </svg>
                  <input
                    type="tel"
                    placeholder="+255 700 000 000"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    autoComplete="tel"
                    required
                  />
                </div>
              </div>
              <p className="pay-hint">A push notification will be sent to your phone to confirm the payment.</p>
            </>
          )}

          {method === "cash" && (
            <div className="pay-cash-info">
              <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24"
                fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                <rect x="2" y="6" width="20" height="12" rx="2"/>
                <circle cx="12" cy="12" r="3"/>
                <path d="M6 12h.01M18 12h.01"/>
              </svg>
              <div>
                <strong>Pay on arrival</strong>
                <p>Bring {formatMoney(booking.priceCents)} in cash when you visit <strong>{booking.business?.name}</strong>. Your booking will be confirmed instantly.</p>
              </div>
            </div>
          )}

          {error && (
            <div className="pay-error">
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24"
                fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
              {error}
            </div>
          )}

          <button type="submit" className="btn btn-primary pay-submit" disabled={busy}>
            {busy ? (
              <span style={{ display:"flex", alignItems:"center", gap:8 }}>
                <span className="spinner" style={{ width:16, height:16 }} />
                Processing…
              </span>
            ) : (
              <>Pay {formatMoney(booking.priceCents)}</>
            )}
          </button>

          <p className="pay-secure-note">
            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24"
              fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
            </svg>
            Payments are encrypted and secure
          </p>
        </form>
      </div>
    </div>
  );
}

// ── Success overlay ───────────────────────────────────────────────────────────
function PaymentSuccess({ booking, onClose }) {
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  return (
    <div className="pay-overlay" onClick={onClose} aria-modal="true" role="dialog">
      <div className="pay-modal pay-modal--success" onClick={(e) => e.stopPropagation()}>
        <div className="pay-success-icon">
          <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24"
            fill="none" stroke="#22c55e" strokeWidth="2.5" strokeLinecap="round">
            <circle cx="12" cy="12" r="10"/><polyline points="9 12 11.5 14.5 15 10"/>
          </svg>
        </div>
        <h2 className="pay-success-title">Payment successful!</h2>
        <p className="pay-success-sub">
          {formatMoney(booking.priceCents)} paid for <strong>{booking.service?.name}</strong> at <strong>{booking.business?.name}</strong>.
        </p>
        <button className="btn btn-primary pay-submit" onClick={onClose}>Done</button>
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function BookingsPanel({ bookings, reload, onError, onBrowse }) {
  const today = useMemo(() => midnight(new Date()), []);
  const [cursor, setCursor] = useState({ y: today.getFullYear(), m: today.getMonth() });
  const [day,    setDay]    = useState(null);
  const [filter, setFilter] = useState("All");
  const [busyId, setBusyId] = useState(null);
  const [notice, setNotice] = useState("");

  // Reschedule / Recover drawer
  const [openRow, setOpenRow] = useState(null);
  const [drawer,  setDrawer]  = useState("");   // "reschedule" | "recover"
  const [draftTime, setDraftTime] = useState("");

  // Payment modal
  const [payTarget,   setPayTarget]   = useState(null);   // booking object
  const [paySuccess,  setPaySuccess]  = useState(null);   // booking after success

  // ── Calendar ──────────────────────────────────────────────────────────────
  const bookedDays = useMemo(() => {
    const map = new Map();
    for (const b of bookings) {
      const d = midnight(new Date(b.scheduledAt));
      map.set(dayKey(d), (map.get(dayKey(d)) || 0) + 1);
    }
    return map;
  }, [bookings]);

  const cells = useMemo(() => {
    const first = new Date(cursor.y, cursor.m, 1);
    const days  = new Date(cursor.y, cursor.m + 1, 0).getDate();
    const lead  = first.getDay();
    const out   = Array.from({ length: lead }, () => null);
    for (let i = 1; i <= days; i++) out.push(new Date(cursor.y, cursor.m, i));
    return out;
  }, [cursor]);

  const monthCount = useMemo(
    () => bookings.filter((b) => {
      const d = midnight(new Date(b.scheduledAt));
      return d.getFullYear() === cursor.y && d.getMonth() === cursor.m;
    }).length,
    [bookings, cursor],
  );

  const rows = useMemo(() => {
    const list = bookings.filter((b) => {
      const when = midnight(new Date(b.scheduledAt));
      if (filter === "Upcoming"  && (when < today || b.status === "COMPLETED")) return false;
      if (filter === "Completed" && b.status !== "COMPLETED")  return false;
      if (filter === "Cancelled" && b.status !== "CANCELLED")  return false;
      if (filter === "Past"      && (when >= today || b.status === "COMPLETED")) return false;
      if (day && dayKey(when) !== dayKey(day)) return false;
      return true;
    });
    return list.sort((a, b) => new Date(a.scheduledAt) - new Date(b.scheduledAt));
  }, [bookings, filter, day, today]);

  // ── Helpers ───────────────────────────────────────────────────────────────
  function moveMonth(step) {
    const next = new Date(cursor.y, cursor.m + step, 1);
    setCursor({ y: next.getFullYear(), m: next.getMonth() });
    setDay(null);
  }

  function pickDay(d) {
    setDay(day && dayKey(day) === dayKey(d) ? null : d);
    setFilter("All");
  }

  async function run(booking, fn, done) {
    setBusyId(booking.id);
    closeDrawer();
    setNotice("");
    try {
      await fn();
      setNotice(done);
      reload();
    } catch (e) {
      onError(e.message);
    } finally {
      setBusyId(null);
    }
  }

  function closeDrawer() { setOpenRow(null); setDrawer(""); }

  function openDrawer(bookingId, type, initData = {}) {
    if (openRow === bookingId && drawer === type) { closeDrawer(); return; }
    setOpenRow(bookingId);
    setDrawer(type);
    if (initData.time !== undefined) setDraftTime(initData.time);
  }

  function saveReschedule(b) {
    if (!draftTime) return;
    const isRecovery = b.status === "CANCELLED";
    run(b,
      () => api.rescheduleBooking(b.id, { scheduledAt: new Date(draftTime).toISOString() }),
      isRecovery
        ? "Booking reactivated and sent to the provider for approval."
        : "New time sent to the provider for approval.",
    );
  }

  function cancel(b) {
    if (!window.confirm(`Cancel the "${b.service?.name || "booking"}" booking?`)) return;
    run(b, () => api.updateBookingStatus(b.id, "CANCELLED"), "Booking cancelled.");
  }

  function remove(b) {
    const msg = b.status === "COMPLETED"
      ? `Remove the completed "${b.service?.name || "booking"}" from your list?`
      : `Remove "${b.service?.name || "booking"}" from your list? The provider keeps their record.`;
    if (!window.confirm(msg)) return;
    run(b, () => api.deleteBooking(b.id), "Booking removed from your list.");
  }

  function handlePaySuccess() {
    setPaySuccess(payTarget);
    setPayTarget(null);
    reload();
  }

  function statusClass(status) {
    const map = { PENDING:"pill-pending", CONFIRMED:"pill-confirmed", COMPLETED:"pill-completed", CANCELLED:"pill-cancelled", DECLINED:"pill-declined" };
    return `pill ${map[status] || ""}`;
  }

  // ── Empty state ───────────────────────────────────────────────────────────
  if (bookings.length === 0) {
    return (
      <section className="panel">
        <div className="panel-head"><h3><Icon name="calendar" size={17} />My Bookings</h3></div>
        <div className="panel-body">
          <p style={{ margin: 0 }}>
            No bookings yet.{" "}
            <button className="linklike" onClick={() => onBrowse()}>Find a provider →</button>
          </p>
        </div>
      </section>
    );
  }

  return (
    <>
      {/* Payment modal */}
      {payTarget && (
        <PaymentModal
          booking={payTarget}
          onClose={() => setPayTarget(null)}
          onPaid={handlePaySuccess}
        />
      )}
      {paySuccess && (
        <PaymentSuccess
          booking={paySuccess}
          onClose={() => setPaySuccess(null)}
        />
      )}

      <div className="bookings-split">
        {/* ── Calendar ── */}
        <section className="panel bookings-cal">
          <div className="panel-head">
            <h3><Icon name="calendar" size={17} />{MONTHS[cursor.m]} {cursor.y}</h3>
            <span className="cal-nav">
              <button type="button" className="cal-arrow" onClick={() => moveMonth(-1)} aria-label="Previous month">‹</button>
              <button type="button" className="cal-arrow" onClick={() => moveMonth(1)}  aria-label="Next month">›</button>
            </span>
          </div>
          <div className="panel-body">
            <div className="cal-dow">{DOW.map((d) => <span key={d}>{d[0]}</span>)}</div>
            <div className="cal-grid">
              {cells.map((d, i) => {
                if (!d) return <span className="cal-cell cal-cell--blank" key={`b${i}`} />;
                const n   = bookedDays.get(dayKey(d)) || 0;
                const cls = ["cal-cell",
                  n > 0 ? "cal-cell--on" : "",
                  dayKey(d) === dayKey(today) ? "cal-cell--today" : "",
                  day && dayKey(d) === dayKey(day) ? "cal-cell--sel" : "",
                ].filter(Boolean).join(" ");
                return (
                  <button type="button" className={cls} key={dayKey(d)} onClick={() => pickDay(d)}
                    aria-label={`${d.getDate()} ${MONTHS[cursor.m]}${n ? ` — ${n} booking${n > 1 ? "s" : ""}` : ""}`}>
                    <span className="cal-num">{d.getDate()}</span>
                    {n > 0 && <span className="cal-dots" aria-hidden="true">{Array.from({ length: Math.min(n, 3) }, (_, k) => <i key={k} />)}</span>}
                  </button>
                );
              })}
            </div>
            <div className="cal-foot">
              <span className="hint">
                {monthCount ? `${monthCount} booking${monthCount === 1 ? "" : "s"} this month` : "No bookings this month"}
              </span>
              {(day || filter !== "All") && (
                <button type="button" className="linklike" onClick={() => { setDay(null); setFilter("All"); }}>Clear filter</button>
              )}
            </div>
            <ul className="cal-legend">
              <li><span className="cal-swatch cal-swatch--today" /> Today</li>
              <li><span className="cal-swatch cal-swatch--booked" /> Booking on that day</li>
            </ul>
          </div>
        </section>

        {/* ── Bookings list ── */}
        <section className="panel bookings-list">
          <div className="panel-head">
            <h3>
              <Icon name="clipboard" size={17} />
              Bookings{day ? ` · ${day.getDate()} ${MONTHS[day.getMonth()]}` : ""}
            </h3>
            <button className="btn btn-primary btn-sm" onClick={() => onBrowse()}>
              + New booking
            </button>
          </div>

          <div className="panel-toolbar">
            <RangeSwitch options={FILTERS} value={filter} onChange={(v) => { setFilter(v); setDay(null); }} />
            <span className="hint">{rows.length} shown</span>
          </div>

          {notice && <div className="alert alert-success bookings-notice">{notice}</div>}

          <div className="panel-body flush">
            {rows.length === 0 ? (
              <p className="bookings-empty">
                {filter === "Completed" ? "No completed bookings yet."
                 : filter === "Cancelled" ? "No cancelled bookings."
                 : "Nothing scheduled for this filter."}
              </p>
            ) : (
              <table className="data-table bookings-table">
                <thead>
                  <tr>
                    <th>Service</th>
                    <th>Provider</th>
                    <th>When</th>
                    <th>Status</th>
                    <th>Amount</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((b) => {
                    const isOpen = openRow === b.id;
                    const busy   = busyId  === b.id;
                    return (
                      <Fragment key={b.id}>
                        {/* ── Main row ── */}
                        <tr className={isOpen ? "row-open" : ""}>
                          <td>
                            <span className="bk-service-name">{b.service?.name || "—"}</span>
                            {b.notes && <span className="booking-note" title={b.notes}>{b.notes}</span>}
                          </td>
                          <td><Link to={`/business/${b.businessId}`}>{b.business?.name}</Link></td>
                          <td>
                            <span className="bk-date">
                              {new Date(b.scheduledAt).toLocaleDateString(undefined, { weekday:"short", day:"numeric", month:"short" })}
                            </span>
                            <span className="bk-time">
                              {new Date(b.scheduledAt).toLocaleTimeString(undefined, { hour:"numeric", minute:"2-digit" })}
                            </span>
                          </td>
                          <td>
                            <div style={{ display:"flex", flexDirection:"column", gap:4 }}>
                              <span className={statusClass(b.status)}>{b.status}</span>
                              {b.payment?.status === "PAID" && (
                                <span className="pill pill-confirmed" style={{ fontSize:"0.68rem" }}>Paid</span>
                              )}
                            </div>
                          </td>
                          <td className="nowrap">{formatMoney(b.priceCents)}</td>
                          <td>
                            <div className="bk-row-actions">
                              {/* Pay — shown for PENDING or CONFIRMED bookings that haven't been paid */}
                              {canPay(b) && (
                                <button
                                  className="btn btn-primary btn-sm"
                                  disabled={busy}
                                  onClick={() => setPayTarget(b)}
                                >
                                  💳 Pay
                                </button>
                              )}

                              {/* Reschedule */}
                              {editable(b) && (
                                <button className="btn btn-outline btn-sm" disabled={busy}
                                  onClick={() => openDrawer(b.id, "reschedule", { time: toInputValue(new Date(b.scheduledAt)) })}>
                                  {isOpen && drawer === "reschedule" ? "Close" : "Reschedule"}
                                </button>
                              )}

                              {/* Reactivate cancelled */}
                              {b.status === "CANCELLED" && (
                                <button className="btn btn-recover btn-sm" disabled={busy}
                                  onClick={() => openDrawer(b.id, "recover", { time: "" })}>
                                  {isOpen && drawer === "recover" ? "Close" : "↩ Reactivate"}
                                </button>
                              )}

                              {/* Remove from list */}
                              <button className="btn btn-danger btn-sm" disabled={busy} onClick={() => remove(b)}
                                title="Remove from list">
                                🗑
                              </button>
                            </div>
                          </td>
                        </tr>

                        {/* ── Drawer: Reschedule ── */}
                        {isOpen && drawer === "reschedule" && (
                          <tr className="row-drawer">
                            <td colSpan={6}>
                              <div className="booking-drawer">
                                <div className="booking-drawer-title">📅 Reschedule appointment</div>
                                <div className="booking-drawer-body">
                                  <input type="datetime-local" value={draftTime}
                                    onChange={(e) => setDraftTime(e.target.value)}
                                    aria-label="New appointment time" />
                                  <button className="btn btn-primary btn-sm" disabled={busy || !draftTime}
                                    onClick={() => saveReschedule(b)}>Save new time</button>
                                  <button className="btn btn-outline btn-sm" onClick={closeDrawer}>Cancel</button>
                                </div>
                                <p className="booking-drawer-hint">
                                  A confirmed booking goes back to <strong>Pending</strong> so the provider can approve the new slot.
                                </p>
                              </div>
                            </td>
                          </tr>
                        )}

                        {/* ── Drawer: Recover cancelled ── */}
                        {isOpen && drawer === "recover" && (
                          <tr className="row-drawer">
                            <td colSpan={6}>
                              <div className="booking-drawer booking-drawer--recover">
                                <div className="booking-drawer-title">↩ Reactivate cancelled booking</div>
                                <p className="booking-drawer-hint" style={{ marginTop:0, marginBottom:12 }}>
                                  Pick a new date and time. The booking will be sent back to <strong>{b.business?.name}</strong> as a fresh <strong>Pending</strong> request.
                                </p>
                                <div className="booking-drawer-body">
                                  <input type="datetime-local" value={draftTime}
                                    onChange={(e) => setDraftTime(e.target.value)}
                                    aria-label="New appointment time"
                                    min={new Date().toISOString().slice(0, 16)} />
                                  <button className="btn btn-recover btn-sm" disabled={busy || !draftTime}
                                    onClick={() => saveReschedule(b)}>
                                    {busy ? "Saving…" : "Reactivate booking"}
                                  </button>
                                  <button className="btn btn-outline btn-sm" onClick={closeDrawer}>Dismiss</button>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </section>
      </div>
    </>
  );
}
