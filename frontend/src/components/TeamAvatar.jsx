import { useEffect, useState } from "react";

const initials = (name) =>
  (name || "?").split(" ").filter(Boolean).map((w) => w[0]).slice(0, 2).join("").toUpperCase();

// A teammate may be a linked account, a bare contact entry, or both. The listing
// owner's team table and a manager's read-only roster show the same person, so
// the name and contact look-ups live here rather than in each dashboard.
export const displayName = (m) => m.staffName || m.user?.name || m.name || "Team member";
export const memberPhone = (m) => m.staffPhone || m.user?.phone;
export const memberEmail = (m) => m.staffEmail || m.user?.email;

export default function TeamAvatar({ member }) {
  const [broken, setBroken] = useState(false);
  const src = member.user?.avatarUrl;
  useEffect(() => setBroken(false), [src]);
  if (!src || broken) return <span className="team-avatar team-avatar--initials">{initials(displayName(member))}</span>;
  return <img className="team-avatar" src={src} alt="" onError={() => setBroken(true)} />;
}
