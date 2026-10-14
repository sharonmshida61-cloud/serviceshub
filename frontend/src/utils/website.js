// The stored link is a full URL, but a chip reads better as the address people
// actually say out loud: "pipepro.co.ke", not "https://pipepro.co.ke/".
export function siteLabel(url) {
  return String(url || "")
    .replace(/^https?:\/\//i, "")
    .replace(/^www\./i, "")
    .replace(/\/$/, "");
}
