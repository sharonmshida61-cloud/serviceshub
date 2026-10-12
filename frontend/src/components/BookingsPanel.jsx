import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { api, formatMoney } from "../api";
import Icon from "./Icon.jsx";
import { RangeSwitch } from "./DashboardPanels.jsx";
import { StarInput } from "./StarRating.jsx";
import { directionsUrl } from "../utils/geolocation.js";

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const DOW = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const FILTERS = ["All", "Upcoming", "Past"];

const midnight = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const dayKey = (d) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;

// datetime-local wants a plain local string; toISOString would shift the hour by the offset.
function toInputValue(date) {
  const d = new Date(date);
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

const editable = (b) => ["PENDING", "CONFIRMED"].includes(b.status);
const payable = (b) => !["CANCELLED", "DECLINED"].includes(b.status) && b.payment?.status !== "PAID";

// My Bookings: the table of every request plus a month calendar that marks the
// days holding one. Update = reschedule, Delete = hide it from this list only.
export default function BookingsPanel({ bookings, reload, onError, onBrowse }) {
  const today = useMemo(() => midnight(new Date()), []);
  const [cursor, setCursor] = useState({ y: today.getFullYear(), m: today.getMonth() });
  const [day, setDay] = useState(null);
  const [filter, setFilter] = useState("All");
  const [busyId, setBusyId] = useState(null);
  const [editing, setEditing] = useState(null);
  const [draft, setDraft] = useState("");
  const [reviewFor, setReviewFor] = useState(null);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [notice, setNotice] = useState("");

  // Days of the shown month that hold at least one booking, for the calendar dots.
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
    const days = new Date(cursor.y, cursor.m + 1, 0).getDate();
    const lead = first.getDay();
    const out = Array.from({ length: lead }, () => null);
    for (let i = 1; i <= days; i += 1) out.push(new Date(cursor.y, cursor.m, i));
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
      if (filter === "Upcoming" && when < today) return false;
      if (filter === "Past" && when >= today) return false;
      if (day && dayKey(when) !== dayKey(day)) return false;
      return true;
    });
    return list.sort((a, b) => new Date(a.scheduledAt) - new Date(b.scheduledAt));
  }, [bookings, filter, day, today]);

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
    setEditing(null);
    setReviewFor(null);
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

  function startEdit(b) {
    setReviewFor(null);
    setEditing(editing === b.id ? null : b.id);
    setDraft(toInputValue(new Date(b.scheduledAt)));
  }

  function saveTime(b) {
    if (!draft) return;
    run(b, () => api.rescheduleBooking(b.id, { scheduledAt: new Date(draft).toISOString() }),
      "New time sent to the provider for approval.");
  }

  function remove(b) {
    if (!window.confirm(`Remove the ${b.service?.name || "booking"} appointment from your list? The provider keeps their record.`)) return;
    run(b, () => api.deleteBooking(b.id), "Booking removed from your list.");
  }

  function submitReview(b) {
    run(b, () => api.createReview({ bookingId: b.id, rating, comment }), "Review submitted. Thanks!");
    setReviewFor(null);
    setComment("");
    setRating(5);
  }

  if (bookings.length === 0) {
    return (
      <section className="panel">
        <div className="panel-head">
          <h3><Icon name="calendar" size={17} />My bookings</h3>
        </div>
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
    <div className="bookings-split">
      <section className="panel bookings-cal">
        <div className="panel-head">
          <h3><Icon name="calendar" size={17} />{MONTHS[cursor.m]} {cursor.y}</h3>
          <span className="cal-nav">
            <button type="button" className="cal-arrow" onClick={() => moveMonth(-1)} aria-label="Previous month">‹</button>
            <button type="button" className="cal-arrow" onClick={() => moveMonth(1)} aria-label="Next month">›</button>
          </span>
        </div>
        <div className="panel-body">
          <div className="cal-dow">
            {DOW.map((d) => <span key={d}>{d[0]}</span>)}
          </div>
          <div className="cal-grid">
            {cells.map((d, i) => {
              if (!d) return <span className="cal-cell cal-cell--blank" key={`b${i}`} />;
              const n = bookedDays.get(dayKey(d)) || 0;
              const cls = [
                "cal-cell",
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
            <span className="hint">{monthCount ? `${monthCount} booking${monthCount === 1 ? "" : "s"} this month` : "No bookings this month"}</span>
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

      <section className="panel bookings-list">
        <div className="panel-head">
          <h3><Icon name="clipboard" size={17} />Bookings{day ? ` · ${day.getDate()} ${MONTHS[day.getMonth()]}` : ""}</h3>
          <button className="linklike" onClick={() => onBrowse()}>New booking</button>
        </div>
        <div className="panel-toolbar">
          <RangeSwitch options={FILTERS} value={filter} onChange={(v) => { setFilter(v); setDay(null); }} />
          <span className="hint">{rows.length} shown</span>
        </div>
        {notice && <div className="alert alert-success bookings-notice">{notice}</div>}
        <div className="panel-body flush">
          {rows.length === 0 ? (
            <p className="bookings-empty">Nothing scheduled for this filter.</p>
          ) : (
            <table className="data-table bookings-table">
              <thead>
                <tr>
                  <th>Service</th>
                  <th>Provider</th>
                  <th>When</th>
                  <th>Status</th>
                  <th>Payment</th>
                  <th>Amount</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((b) => (
                  <tr key={b.id} className={editing === b.id || reviewFor === b.id ? "row-open" : ""}>
                    <td>
                      {b.service?.name || "—"}
                      {b.notes && <span className="booking-note" title={b.notes}>{b.notes}</span>}
                    </td>
                    <td><Link to={`/business/${b.businessId}`}>{b.business?.name}</Link></td>
                    <td>
                      <span className="bk-date">{new Date(b.scheduledAt).toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" })}</span>
                      <span className="bk-time">{new Date(b.scheduledAt).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}</span>
                    </td>
                    <td><span className={`pill pill-${b.status.toLowerCase()}`}>{b.status}</span></td>
                    <td>{b.payment?.status === "PAID" ? "Paid" : "Unpaid"}</td>
                    <td className="nowrap">{formatMoney(b.priceCents)}</td>
                    <td>
                      <div className="booking-actions">
                      {payable(b) && (
                        <button className="btn btn-primary btn-sm" disabled={busyId === b.id} onClick={() => run(b, () => api.payForBooking(b.id, "card"), "Payment recorded.")}>
                          {busyId === b.id ? "…" : "Pay"}
                        </button>
                      )}
                      {editable(b) && (
                        <button className="btn btn-outline btn-sm" disabled={busyId === b.id} onClick={() => startEdit(b)}>
                          {editing === b.id ? "Close" : "Reschedule"}
                        </button>
                      )}
                      {editable(b) && (
                        <button className="btn btn-outline btn-sm" disabled={busyId === b.id} onClick={() => run(b, () => api.updateBookingStatus(b.id, "CANCELLED"), "Booking cancelled.")}>
                          Cancel
                        </button>
                      )}
                      {b.status !== "COMPLETED" && (
                        <button className="btn btn-danger btn-sm" disabled={busyId === b.id} onClick={() => remove(b)}>Delete</button>
                      )}
                      {b.status === "COMPLETED" && !b.review && (
                        <button className="btn btn-outline btn-sm" onClick={() => { setEditing(null); setReviewFor(reviewFor === b.id ? null : b.id); }}>
                          Review
                        </button>
                      )}
                      {b.review && <span className="hint">You rated {b.review.rating}★</span>}
                      {b.business?.latitude != null && (
                        <a className="btn btn-outline btn-sm" target="_blank" rel="noreferrer"
                          href={directionsUrl({ latitude: b.business.latitude, longitude: b.business.longitude })}>
                          📍
                        </a>
                      )}

                      {editing === b.id && (
                        <div className="booking-edit">
                          <input type="datetime-local" value={draft} onChange={(e) => setDraft(e.target.value)} aria-label="New appointment time" />
                          <button className="btn btn-primary btn-sm" disabled={busyId === b.id || !draft} onClick={() => saveTime(b)}>Save</button>
                          <button className="btn btn-outline btn-sm" onClick={() => setEditing(null)}>Cancel</button>
                          <span className="hint">A confirmed booking goes back to pending so the provider can approve the new slot.</span>
                        </div>
                      )}

                      {reviewFor === b.id && (
                        <div className="booking-edit">
                          <StarInput value={rating} onChange={setRating} />
                          <textarea rows={2} placeholder="How did it go?" value={comment} onChange={(e) => setComment(e.target.value)} />
                          <button className="btn btn-primary btn-sm" onClick={() => submitReview(b)}>Submit review</button>
                        </div>
                      )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>
    </div>
  );
}
