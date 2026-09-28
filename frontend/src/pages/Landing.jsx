import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../api";
import SiteFooter from "../components/SiteFooter.jsx";
import { useLanguage } from "../context/LanguageContext.jsx";
import { getCategoryImage } from "../utils/categoryImages.js";
import { CATEGORY_COVER, coverForCategory } from "../utils/categoryCovers.js";

const HERO_BG =
  "https://images.unsplash.com/photo-1581596326248-f55ac7852760?w=1600&q=80&auto=format&fit=crop";

const glyph = (name, color = "%234dabf7") =>
  `https://api.iconify.design/mdi:${name}.svg?color=${color}&height=20`;

const FEATURES = [
  { key: "nearby", icon: "magnify" },
  { key: "compare", icon: "scale-balance" },
  { key: "book", icon: "calendar-check" },
  { key: "review", icon: "star" },
];

const STEPS = [
  { key: "discover", photo: "https://images.unsplash.com/photo-1604742762962-83cbaf1560bc?w=600&q=80" },
  { key: "compare", photo: CATEGORY_COVER.laptop },
  { key: "book", photo: CATEGORY_COVER.calendar },
  { key: "review", photo: CATEGORY_COVER.scissors },
];

const TRUST = [
  { key: "home.trust.providers", icon: "shield-check" },
  { key: "home.trust.nearYou", icon: "map-marker" },
  { key: "home.trust.fast", icon: "lightning-bolt" },
];

// Which group of customers each category mostly serves, shown on its slide.
const AUDIENCE_BY_SLUG = {
  "cleaning-services": "households",
  laundry: "households",
  "home-repair": "households",
  plumbers: "households",
  electricians: "households",
  landscaping: "households",
  tailors: "households",
  transport: "mobility",
  mechanics: "mobility",
  "car-washes": "mobility",
  "food-drinks": "mobility",
  barbers: "care",
  "hair-salons": "care",
  "massage-therapists": "care",
  "fitness-trainers": "care",
  "event-planners": "work",
  photographers: "work",
  tutors: "work",
  freelancers: "work",
};

const SLIDE_MS = 5200;
const SLIDE_COUNT = 8;

export default function Landing() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [categories, setCategories] = useState([]);
  const [cities, setCities] = useState([]);
  const [q, setQ] = useState("");
  const [slide, setSlide] = useState(0);
  const [paused, setPaused] = useState(false);
  const reducedMotion = useRef(
    typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );

  useEffect(() => {
    api.categories().then(setCategories).catch(() => {});
    api.businessCities().then(setCities).catch(() => {});
  }, []);

  const slides = useMemo(
    () =>
      categories.slice(0, SLIDE_COUNT).map((c) => ({
        slug: c.slug,
        name: c.name,
        cover: coverForCategory(c),
        audience: AUDIENCE_BY_SLUG[c.slug] || "households",
      })),
    [categories]
  );

  useEffect(() => {
    if (paused || reducedMotion.current || slides.length < 2) return undefined;
    const timer = setInterval(() => setSlide((i) => (i + 1) % slides.length), SLIDE_MS);
    return () => clearInterval(timer);
  }, [paused, slides.length]);

  const [titleLine1, titleLine2] = t("landing.hero.title").split("\n");

  return (
    <div className="lp">
      <section className="sh-hero" style={{ backgroundImage: `url("${HERO_BG}")` }}>
        <div className="container sh-hero-grid">
          <div className="sh-hero-copy">
            <Link to="/" className="sh-brand">
              <svg className="sh-brand-mark" viewBox="0 0 48 48" aria-hidden="true">
                <defs>
                  <linearGradient id="sh-pin-grad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0" stopColor="#4fc3f7" />
                    <stop offset="1" stopColor="#1976d2" />
                  </linearGradient>
                </defs>
                <path
                  fill="url(#sh-pin-grad)"
                  d="M24 3c-9.4 0-17 7.4-17 16.7C7 32 24 45 24 45s17-13 17-25.3C41 10.4 33.4 3 24 3z"
                />
                <circle cx="24" cy="19.5" r="7.6" fill="#fff" />
                <circle cx="24" cy="19.5" r="3.6" fill="#0b2540" />
              </svg>
              <span className="sh-brand-name">
                <span className="sh-brand-word">
                  Service<span>Hub</span>
                </span>
                <span className="sh-brand-tag">{t("home.hero.tagline")}</span>
              </span>
            </Link>

            <h1 className="sh-h1">
              {titleLine1}
              <br />
              <span className="sh-h1-accent">{titleLine2 || titleLine1}</span>
            </h1>

            <p className="sh-lede">{t("landing.hero.subtitle")}</p>

            <form
              className="sh-search"
              onSubmit={(e) => {
                e.preventDefault();
                navigate(`/browse${q.trim() ? `?q=${encodeURIComponent(q.trim())}` : ""}`);
              }}
            >
              <svg className="sh-search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                strokeWidth="2.1" strokeLinecap="round" aria-hidden="true">
                <circle cx="11" cy="11" r="7" />
                <line x1="20.5" y1="20.5" x2="16.5" y2="16.5" />
              </svg>
              <input
                aria-label={t("home.hero.searchPlaceholder")}
                placeholder={t("home.hero.searchPlaceholder")}
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
              <button type="submit">{t("common.search")}</button>
            </form>

            <div className="lp-hero-actions">
              <Link to="/register" className="btn btn-primary">{t("landing.cta.join")}</Link>
              <Link to="/login" className="lp-cta-ghost">{t("landing.cta.signin")}</Link>
            </div>

            <ul className="sh-trust">
              {TRUST.map((item) => (
                <li key={item.key}>
                  <img src={glyph(item.icon, "%232196f3")} alt="" />
                  {t(item.key)}
                </li>
              ))}
            </ul>
          </div>

          <div className="lp-features">
            <span className="lp-kicker">{t("landing.features.eyebrow")}</span>
            <h2 className="lp-h2 lp-h2--onDark">{t("landing.features.title")}</h2>
            {FEATURES.map((f) => (
              <article className="lp-feature" key={f.key}>
                <span className="lp-feature-icon">
                  <img src={glyph(f.icon)} alt="" />
                </span>
                <div>
                  <h3>{t(`landing.feature.${f.key}.title`)}</h3>
                  <p>{t(`landing.feature.${f.key}.desc`)}</p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <div className="container page">
        <section className="lp-section" id="lp-how">
          <header className="lp-section-head">
            <div>
              <span className="lp-kicker">{t("home.howItWorks")}</span>
              <h2 className="lp-h2">{t("home.howItWorks.title")}</h2>
            </div>
            <span className="lp-count">{t("landing.how.note")}</span>
          </header>
          <div className="lp-steps">
            {STEPS.map((s, i) => (
              <article className="lp-step" key={s.key}>
                <div className="lp-step-media">
                  <img src={s.photo} alt="" loading="lazy" />
                </div>
                <span className="lp-step-num">{String(i + 1).padStart(2, "0")}</span>
                <h3>{t(`journey.${s.key}`)}</h3>
                <p>{t(`journey.${s.key}.desc`)}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="lp-section" id="lp-categories">
          <header className="lp-section-head">
            <div>
              <span className="lp-kicker">{t("landing.categories.eyebrow")}</span>
              <h2 className="lp-h2">{t("landing.categories.title")}</h2>
            </div>
            {categories.length > 0 && (
              <span className="lp-count">
                {categories.length} {t("landing.stats.categories")}
                {cities.length > 0 && ` · ${cities.length} ${t("landing.stats.cities")}`}
              </span>
            )}
          </header>
          <p className="lp-lede-light">{t("landing.categories.note")}</p>

          {slides.length > 0 && (
            <div
              className="lp-show"
              onMouseEnter={() => setPaused(true)}
              onMouseLeave={() => setPaused(false)}
            >
              {slides.map((s, i) => (
                <figure className={`lp-show-slide ${i === slide ? "active" : ""}`} key={s.slug} aria-hidden={i !== slide}>
                  <img src={s.cover} alt="" loading={i === 0 ? "eager" : "lazy"} />
                  <figcaption>
                    <span className="lp-show-audience">{t(`landing.audience.${s.audience}`)}</span>
                    <h3>{s.name}</h3>
                    <Link to={`/browse?category=${s.slug}`}>{t("landing.coverage.seeProviders")}</Link>
                  </figcaption>
                </figure>
              ))}
              <div className="lp-show-dots">
                {slides.map((s, i) => (
                  <button
                    key={s.slug}
                    type="button"
                    className={i === slide ? "active" : ""}
                    aria-label={s.name}
                    onClick={() => setSlide(i)}
                  />
                ))}
              </div>
            </div>
          )}

          <div className="lp-chips">
            {categories.map((c) => (
              <Link key={c.id} to={`/browse?category=${c.slug}`} className="lp-chip">
                <img src={getCategoryImage(c)} alt="" />
                {c.name}
              </Link>
            ))}
          </div>
        </section>

        <section className="lp-section">
          <div className="lp-steps lp-steps--2">
            <article className="lp-step">
              <h3>{t("landing.forCustomers.title")}</h3>
              <p>{t("landing.forCustomers.desc")}</p>
            </article>
            <article className="lp-step">
              <h3>{t("landing.forProviders.title")}</h3>
              <p>{t("landing.forProviders.desc")}</p>
            </article>
          </div>
        </section>
      </div>

      <section className="lp-cta">
        <div className="container lp-cta-inner">
          <div>
            <h2>{t("home.ctaBand.title")}</h2>
            <p>{t("home.ctaBand.subtitle")}</p>
          </div>
          <div className="lp-cta-actions">
            <Link to="/register" className="btn btn-primary">{t("home.ctaBand.join")}</Link>
            <Link to="/browse" className="lp-cta-ghost">{t("home.cta.browse")}</Link>
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
