const RESEND_URL = "https://api.resend.com/emails";

// Resend is a plain HTTPS API, so no SDK is needed and nothing here depends on
// outbound SMTP ports being open on the host.
async function sendEmail({ to, subject, html, text }) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    const err = new Error("Email is not configured on this server");
    err.status = 503;
    throw err;
  }

  const from = process.env.MAIL_FROM || "ServiceHub <onboarding@resend.dev>";
  const res = await fetch(RESEND_URL, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from, to: [to], subject, html, text }),
  });

  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    console.error("[resend]", res.status, body?.message || body?.name || "request failed");
    const err = new Error("The email service could not send the message");
    err.status = 502;
    throw err;
  }
}

module.exports = { sendEmail, emailConfigured: () => !!process.env.RESEND_API_KEY };
