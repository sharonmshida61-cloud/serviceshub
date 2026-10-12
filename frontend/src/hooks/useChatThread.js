import { useEffect, useState } from "react";
import { api } from "../api";

// A live share overwrites its position, so the thread is unchanged except for
// that timestamp — compare ids and share times to tell "new" from "moved".
const signature = (rows) => rows.map((m) => `${m.id}:${m.liveShare?.updatedAt || ""}`).join("|");

// Repeated polling must not yank a reader away from older messages.
export function stickToBottom(anchor) {
  const scroller = anchor?.parentElement;
  if (!scroller) return;
  if (scroller.scrollHeight - scroller.scrollTop - scroller.clientHeight < 160) {
    scroller.scrollTop = scroller.scrollHeight;
  }
}

// One conversation on screen: fetched at once, then polled while the tab is
// visible, so replies, photos and a moving live location arrive unrefreshed.
export default function useChatThread(businessId, customerId) {
  const [messages, setMessages] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!businessId) return undefined;
    let cancelled = false;
    let sig = "";
    setMessages([]);
    setError("");

    function poll() {
      if (document.visibilityState !== "visible") return;
      api.getThread(businessId, customerId)
        .then((rows) => {
          if (cancelled || !Array.isArray(rows)) return;
          const next = signature(rows);
          if (next === sig) return;
          sig = next;
          setMessages(rows);
        })
        .catch((e) => setError(e.message));
    }

    poll();
    const timer = setInterval(poll, 4000);
    return () => { cancelled = true; clearInterval(timer); };
  }, [businessId, customerId]);

  // Shows a message the server just accepted, ahead of the next poll.
  function push(msg) {
    setMessages((m) => (m.some((x) => x.id === msg.id) ? m : [...m, msg]));
  }

  return { messages, error, setError, push };
}
