import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, formatMoney } from "../api";
import { StarInput } from "../components/StarRating.jsx";

export default function CustomerDashboard() {
  const [bookings, setBookings] = useState([]);
  const [error, setError] = useState("");
  const [reviewFor, setReviewFor] = useState(null);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [busyId, setBusyId] = useState(null);

  function load() {
    api.myBookings().then(setBookings).catch((e) => setError(e.message));
  }

  useEffect(load, []);

  async function pay(booking) {
    setBusyId(booking.id);
    setError("");
    try {
      await api.payForBooking(booking.id, "card");
      load();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusyId(null);
    }
  }

  async function cancel(booking) {
    setBusyId(booking.id);
    try {
      await api.updateBookingStatus(booking.id, "CANCELLED");
      load();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusyId(null);
    }
  }

  async function submitReview(booking) {
    try {
      await api.createReview({ bookingId: booking.id, rating, comment });
      setReviewFor(null);
      setComment("");
      setRating(5);
      load();
    } catch (e) {
      setError(e.message);
    }
  }

  return (
    <div className="container page">
      <h1>My bookings</h1>
      {error && <div className="alert alert-error">{error}</div>}
      {bookings.length === 0 && (
        <div className="empty-state card">
          <h3>No bookings yet</h3>
          <p>Head back to the directory and book your first service.</p>
          <Link to="/"><button className="btn btn-primary">Discover providers</button></Link>
        </div>
      )}
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {bookings.map((b) => (
          <div className="card" key={b.id}>
            <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
              <div>
                <h3 style={{ marginBottom: 4 }}>
                  <Link to={`/business/${b.businessId}`}>{b.business?.name}</Link>
                </h3>
                <p style={{ margin: 0 }}>{b.service?.name} · {new Date(b.scheduledAt).toLocaleString()}</p>
                {b.notes && <p className="hint">Note: {b.notes}</p>}
              </div>
              <div style={{ textAlign: "right" }}>
                <span className={`pill pill-${b.status.toLowerCase()}`}>{b.status}</span>
                <div style={{ fontWeight: 700, marginTop: 6 }}>{formatMoney(b.priceCents)}</div>
                <div style={{ fontSize: "0.8rem", color: "var(--ink-2)" }}>
                  {b.payment?.status === "PAID" ? "Paid ✓" : "Not paid yet"}
                </div>
              </div>
            </div>

            <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
              {b.status !== "CANCELLED" && b.status !== "DECLINED" && b.payment?.status !== "PAID" && (
                <button className="btn btn-primary btn-sm" disabled={busyId === b.id} onClick={() => pay(b)}>
                  {busyId === b.id ? "Processing…" : "Pay now"}
                </button>
              )}
              {["PENDING", "CONFIRMED"].includes(b.status) && (
                <button className="btn btn-danger btn-sm" disabled={busyId === b.id} onClick={() => cancel(b)}>
                  Cancel
                </button>
              )}
              <Link to={`/business/${b.businessId}`}><button className="btn btn-outline btn-sm">Message provider</button></Link>
              {b.status === "COMPLETED" && !b.review && (
                <button className="btn btn-outline btn-sm" onClick={() => setReviewFor(reviewFor === b.id ? null : b.id)}>
                  Leave a review
                </button>
              )}
              {b.review && <span className="hint">You rated this {b.review.rating}★</span>}
            </div>

            {reviewFor === b.id && (
              <div style={{ marginTop: 12, borderTop: "1px solid var(--line)", paddingTop: 12 }}>
                <StarInput value={rating} onChange={setRating} />
                <textarea
                  rows={2}
                  placeholder="How did it go?"
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  style={{ width: "100%", marginTop: 8, padding: 10, borderRadius: 8, border: "1px solid var(--line)" }}
                />
                <button className="btn btn-primary btn-sm" style={{ marginTop: 8 }} onClick={() => submitReview(b)}>
                  Submit review
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
