import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api";
import { useLanguage } from "../context/LanguageContext.jsx";

const PANEL_PHOTO =
  "https://images.unsplash.com/photo-1521737604893-d14cc237f11d?w=1200&q=80&auto=format&fit=crop";

const QUOTE_MS = 6000;

export default function AuthAside() {
  const { t } = useLanguage();
  const [quotes, setQuotes] = useState([]);
  const [quote, setQuote] = useState(0);
  const reducedMotion = useRef(
    typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );

  useEffect(() => {
    api.featuredReviews().then(setQuotes).catch(() => {});
  }, []);

  useEffect(() => {
    if (reducedMotion.current || quotes.length < 2) return undefined;
    const timer = setInterval(() => setQuote((i) => (i + 1) % quotes.length), QUOTE_MS);
    return () => clearInterval(timer);
  }, [quotes.length]);

  return (
    <aside className="auth-aside">
      <img className="auth-aside-photo" src={PANEL_PHOTO} alt="" />
      <Link to="/" className="auth-brand">
        <svg viewBox="0 0 48 48" aria-hidden="true">
          <path
            fill="#fff"
            d="M24 3c-9.4 0-17 7.4-17 16.7C7 32 24 45 24 45s17-13 17-25.3C41 10.4 33.4 3 24 3z"
          />
          <circle cx="24" cy="19.5" r="7.6" fill="#1d3a6b" />
        </svg>
        <span>
          Service<span>Hub</span>
        </span>
      </Link>

      <figure className="auth-quote">
        <span className="auth-quote-mark" aria-hidden="true">
          &ldquo;
        </span>
        {quotes.length > 0 ? (
          quotes.map((q, i) => (
            <blockquote key={i} className={`auth-quote-item ${i === quote ? "active" : ""}`} aria-hidden={i !== quote}>
              <p>{q.quote}</p>
              <figcaption>
                {q.author} · {q.business}
              </figcaption>
            </blockquote>
          ))
        ) : (
          <blockquote className="auth-quote-item active">
            <p>{t("auth.aside.quoteFallback")}</p>
          </blockquote>
        )}
        {quotes.length > 1 && (
          <div className="auth-quote-dots">
            {quotes.map((q, i) => (
              <button
                key={i}
                type="button"
                className={i === quote ? "active" : ""}
                aria-label={q.business}
                onClick={() => setQuote(i)}
              />
            ))}
          </div>
        )}
      </figure>
    </aside>
  );
}
