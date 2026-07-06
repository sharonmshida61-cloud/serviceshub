import { useEffect, useState } from "react";
import { api } from "../api";
import { useAuth } from "../context/AuthContext.jsx";

// Employees don't own a business, but they need to see bookings for the
// business(es) they work at. We reuse the businesses search + the fact that
// the backend authorizes /bookings/business/:id for active staff members.
export default function EmployeeDashboard() {
  const { user } = useAuth();
  const [businessId, setBusinessId] = useState("");
  const [bookings, setBookings] = useState([]);
  const [error, setError] = useState("");

  async function loadBookings() {
    if (!businessId) return;
    try {
      const data = await api.businessBookings(businessId);
      setBookings(data);
      setError("");
    } catch (e) {
      setError(e.message);
    }
  }

  useEffect(() => { loadBookings(); }, [businessId]);

  async function setStatus(b, status) {
    await api.updateBookingStatus(b.id, status);
    loadBookings();
  }

  return (
    <div className="container page">
      <h1>Employee dashboard</h1>
      <p>Welcome, {user.name}. Enter the business ID you're staff at to view its bookings (find this in the URL of the business's page, or ask your manager).</p>
      <div className="field" style={{ maxWidth: 420 }}>
        <label>Business ID</label>
        <input value={businessId} onChange={(e) => setBusinessId(e.target.value)} placeholder="Paste the business ID here" />
      </div>
      {error && <div className="alert alert-error">{error}</div>}
      {bookings.length > 0 && (
        <table className="data-table">
          <thead><tr><th>Customer</th><th>Service</th><th>When</th><th>Status</th><th></th></tr></thead>
          <tbody>
            {bookings.map((b) => (
              <tr key={b.id}>
                <td>{b.customer?.name}</td>
                <td>{b.service?.name}</td>
                <td>{new Date(b.scheduledAt).toLocaleString()}</td>
                <td><span className={`pill pill-${b.status.toLowerCase()}`}>{b.status}</span></td>
                <td>
                  {b.status === "CONFIRMED" && <button className="btn btn-outline btn-sm" onClick={() => setStatus(b, "COMPLETED")}>Mark complete</button>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
