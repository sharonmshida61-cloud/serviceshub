const RESEND_URL = "https://api.resend.com/emails";

function escapeHtml(value) {
  return String(value).replace(
    /[&<>"']/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]
  );
}

// Inline styles only: most mail clients strip <style> blocks and every external
// stylesheet, and images would leak the read receipt.
function resetEmail({ name, resetUrl, minutes }) {
  const subject = "Reset your ServiceHub password";
  const firstName = name ? name.split(" ")[0] : "";
  const greetingText = firstName ? `Hi ${firstName},` : "Hi,";
  const greetingHtml = firstName ? `Hi ${escapeHtml(firstName)},` : "Hi,";
  const text = [
    greetingText,
    "",
    "We received a request to reset the password for your ServiceHub account.",
    `This link expires in ${minutes} minutes and can only be used once.`,
    "",
    resetUrl,
    "",
    "If you did not ask for this, you can ignore this email — your password stays as it is.",
  ].join("\n");

  const html = `<!doctype html>
<html>
  <body style="margin:0;padding:24px;background:#f2f4f8;font-family:Arial,Helvetica,sans-serif;color:#1f2a44;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td align="center">
          <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 10px 30px rgba(8,24,52,.10);">
            <tr>
              <td style="padding:22px 32px;background:#12294f;color:#ffffff;font-size:17px;font-weight:bold;letter-spacing:.12em;text-transform:uppercase;">
                Service<span style="color:#5fdcb4;">Hub</span>
              </td>
            </tr>
            <tr>
              <td style="padding:32px;">
                <p style="margin:0 0 16px;font-size:15px;">${greetingHtml}</p>
                <p style="margin:0 0 16px;font-size:15px;line-height:1.6;">
                  We received a request to reset the password for your ServiceHub account.
                </p>
                <p style="margin:0 0 26px;font-size:15px;line-height:1.6;">
                  <a href="${escapeHtml(resetUrl)}"
                     style="display:inline-block;padding:13px 26px;background:#14a08f;color:#ffffff;font-size:15px;font-weight:bold;text-decoration:none;border-radius:6px;">
                    Choose a new password
                  </a>
                </p>
                <p style="margin:0 0 8px;font-size:13px;color:#7b879b;line-height:1.6;">
                  This link expires in ${minutes} minutes and can only be used once.
                </p>
                <p style="margin:0 0 20px;font-size:13px;color:#7b879b;line-height:1.6;">
                  If the button does not work, copy this address into your browser:<br>
                  <span style="font-size:12px;word-break:break-all;color:#43579f;">${escapeHtml(resetUrl)}</span>
                </p>
                <p style="margin:0;font-size:13px;color:#7b879b;line-height:1.6;">
                  Did not ask for this? Ignore the email — your password stays as it is.
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;

  return { subject, text, html };
}

module.exports = { resetEmail };
