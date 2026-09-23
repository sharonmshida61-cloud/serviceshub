import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { api, formatMoney } from "../api";
import { StarDisplay } from "../components/StarRating.jsx";
import SmartMatch from "../components/SmartMatch.jsx";
import { useLanguage } from "../context/LanguageContext.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { getCategoryImage } from "../utils/categoryImages.js";
import { directionsUrl } from "../utils/geolocation.js";

// Real Unsplash photos keyed by category icon
const CATEGORY_COVER = {
  scissors:    "https://images.unsplash.com/photo-1585747860715-2ba37e788b70?w=600&q=80", // barber
  sparkles:    "https://images.unsplash.com/photo-1560066984-138dadb4c035?w=600&q=80", // beauty
  car:         "https://images.unsplash.com/photo-1625047509248-ec889cbff17f?w=600&q=80", // auto
  shirt:       "https://images.unsplash.com/photo-1489987707025-afc232f7ea0f?w=600&q=80", // tailor
  "spray-can": "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=600&q=80", // cleaning
  wrench:      "https://images.unsplash.com/photo-1504148455328-c376907d081c?w=600&q=80", // plumbing
  zap:         "https://images.unsplash.com/photo-1621905251918-48416bd8575a?w=600&q=80", // electric
  cog:         "https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=600&q=80", // repair
  camera:      "https://images.unsplash.com/photo-1452587925148-ce544e77e70d?w=600&q=80", // photography
  "book-open": "https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=600&q=80", // tutoring
  dumbbell:    "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=600&q=80", // fitness
  calendar:    "https://images.unsplash.com/photo-1511795409834-ef04bbd61622?w=600&q=80", // events
  hand:        "https://images.unsplash.com/photo-1544161515-4ab6ce6db874?w=600&q=80", // massage
  laptop:      "https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=600&q=80", // tech
  hammer:      "https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=600&q=80", // construction
};

const FALLBACK_COVER = "https://images.unsplash.com/photo-1521737604893-d14cc237f11d?w=600&q=80";

const TAILOR_COVER = "https://images.unsplash.com/photo-1558769132-cb1aea458c5e?w=600&q=80";
const FOOD_COVER = "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=600&q=80";

// Several seeded categories share an icon, so photos are pinned per slug first.
const CATEGORY_COVER_BY_SLUG = {
  barbers: CATEGORY_COVER.scissors,
  "hair-salons": CATEGORY_COVER.sparkles,
  tailors: TAILOR_COVER,
  "car-washes": CATEGORY_COVER.car,
  transport: CATEGORY_COVER.car,
  mechanics: CATEGORY_COVER.wrench,
  tutors: CATEGORY_COVER["book-open"],
  electricians: CATEGORY_COVER.zap,
  "event-planners": CATEGORY_COVER.calendar,
  "fitness-trainers": CATEGORY_COVER.dumbbell,
  "food-drinks": FOOD_COVER,
  "massage-therapists": CATEGORY_COVER.hand,
  "cleaning-services": CATEGORY_COVER["spray-can"],
  landscaping: CATEGORY_COVER.leaf,
  laundry: CATEGORY_COVER.shirt,
  photographers: CATEGORY_COVER.camera,
  plumbers: CATEGORY_COVER.wrench,
  "home-repair": CATEGORY_COVER.cog,
  freelancers: CATEGORY_COVER.laptop,
};

const coverForCategory = (c) =>
  CATEGORY_COVER_BY_SLUG[c?.slug] || CATEGORY_COVER[c?.icon] || FALLBACK_COVER;

const coverOf = (business) => coverForCategory(business?.category);
const startingPrice = (b) =>
  b.services?.length ? formatMoney(Math.min(...b.services.map((s) => s.priceCents))) : null;

const STEPS = [{ key: "discover" }, { key: "compare" }, { key: "book" }, { key: "review" }];

const PAGE_SIZE = 9;

const HERO_BG =
  "https://images.unsplash.com/photo-1581596326248-f55ac7852760?w=1600&q=80&auto=format&fit=crop";

const glyph = (name, color = "%234dabf7") =>
  `https://api.iconify.design/mdi:${name}.svg?color=${color}&height=20`;

const photo = (id) =>
  `https://images.unsplash.com/${id}?w=480&q=80&auto=format&fit=crop`;

const HERO_TRUST = [
  { key: "home.trust.providers", icon: "shield-check" },
  { key: "home.trust.nearYou", icon: "map-marker" },
  { key: "home.trust.fast", icon: "lightning-bolt" },
];

// Mockup tile order: label key, glyph, photo, and the seeded category it filters.
const HERO_TILES = [
  { key: "home.tile.transport", icon: "bus", slug: "mechanics", photo: photo("photo-1776521906834-45551a2004ac") },
  { key: "home.tile.barbers", icon: "scissors", slug: "barbers", photo: photo("photo-1585747860715-2ba37e788b70") },
  { key: "home.tile.restaurants", icon: "silverware-fork-knife", slug: "food-drinks", photo: photo("photo-1661259892845-f84f22e79077") },
  { key: "home.tile.laundry", icon: "washing-machine", slug: "laundry", photo: photo("photo-1635353059173-461b9c459f2a") },
  { key: "home.tile.carWash", icon: "car", slug: "car-washes", photo: photo("photo-1633014041037-f5446fb4ce99") },
  { key: "home.tile.repairs", icon: "wrench", slug: "home-repair", photo: photo("photo-1625047509248-ec889cbff17f") },
  { key: "home.tile.groceries", icon: "cart", slug: "", photo: photo("photo-1604742762962-83cbaf1560bc") },
  { key: "home.tile.beauty", icon: "lipstick", slug: "hair-salons", photo: photo("photo-1759693164491-01acd5831b09") },
  { key: "home.tile.other", icon: "apps", slug: "", photo: photo("photo-1753351052363-53ce102830eb") },
];

export default function Home() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const [categories, setCategories] = useState([]);
  const [businesses, setBusinesses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ category: "", q: "", sort: "rating" });
  const [compareIds, setCompareIds] = useState([]);
  const [visible, setVisible] = useState(PAGE_SIZE);

  useEffect(() => {
    api.categories().then(setCategories).catch(() => {});
  }, []);

  useEffect(() => {
    setLoading(true);
    setVisible(PAGE_SIZE);
    api
      .searchBusinesses(filters)
      .then(setBusinesses)
      .catch(() => setBusinesses([]))
      .finally(() => setLoading(false));
  }, [filters]);

  // Trending = top 4 by rating then review count, only when no filters are active
  const trending = useMemo(() => {
    if (filters.q || filters.category) return [];
    return [...businesses]
      .filter((b) => b.reviewCount > 0)
      .sort((a, b) => b.avgRating - a.avgRating || b.reviewCount - a.reviewCount)
      .slice(0, 4);
  }, [businesses, filters]);

  const compareList = useMemo(
    () => businesses.filter((b) => compareIds.includes(b.id)),
    [businesses, compareIds]
  );

  function toggleCompare(id) {
    setCompareIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : prev.length < 3 ? [...prev, id] : prev
    );
  }

  const [titleLine1, titleLine2] = t("home.hero.title").split("\n");
  const activeCategory = categories.find((c) => c.slug === filters.category);
  const isProvider = (user?.roles || (user?.role ? [user.role] : [])).includes("BUSINESS_OWNER");

  return (
    <div className="lp">
      {/* ── Hero ── */}
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

            <p className="sh-lede">{t("home.hero.subtitle")}</p>

            <form className="sh-search" onSubmit={(e) => e.preventDefault()}>
              <svg className="sh-search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                strokeWidth="2.1" strokeLinecap="round" aria-hidden="true">
                <circle cx="11" cy="11" r="7" />
                <line x1="20.5" y1="20.5" x2="16.5" y2="16.5" />
              </svg>
              <input
                aria-label={t("home.hero.searchPlaceholder")}
                placeholder={t("home.hero.searchPlaceholder")}
                value={filters.q}
                onChange={(e) => setFilters((f) => ({ ...f, q: e.target.value }))}
              />
              <button
                type="button"
                onClick={() =>
                  document.getElementById("lp-providers")?.scrollIntoView({ behavior: "smooth", block: "start" })
                }
              >
                {t("common.search")}
              </button>
            </form>

            <ul className="sh-trust">
              {HERO_TRUST.map((item) => (
                <li key={item.key}>
                  <img src={glyph(item.icon, "%232196f3")} alt="" />
                  {t(item.key)}
                </li>
              ))}
            </ul>
          </div>

          <div className="sh-tiles">
            {HERO_TILES.map((tile) => (
              <Link
                key={tile.key}
                to={tile.slug ? `/browse?category=${tile.slug}` : "/browse"}
                className="sh-tile"
              >
                <img src={tile.photo} alt="" loading="eager" />
                <span className="sh-tile-label">
                  <span className="sh-tile-icon">
                    <img src={glyph(tile.icon)} alt="" />
                  </span>
                  {t(tile.key)}
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <div className="container page">
        <section className="lp-smartmatch">
          <SmartMatch />
        </section>

        {/* ── Category bento ── */}
        <section className="lp-section" id="lp-categories">
          <header className="lp-section-head">
            <div>
              <span className="lp-kicker">{t("home.categories.eyebrow")}</span>
              <h2 className="lp-h2">{t("home.categories.subtitle")}</h2>
            </div>
            <Link to="/browse" className="btn btn-outline btn-sm">{t("common.viewAll")}</Link>
          </header>

          <div className="lp-bento">
            <button
              className={`lp-tile lp-tile--all ${filters.category === "" ? "active" : ""}`}
              onClick={() => setFilters((f) => ({ ...f, category: "" }))}
            >
              <span className="lp-tile-label">{t("home.categories.all")}</span>
              <span className="lp-tile-count">{businesses.length}</span>
            </button>
            {categories.slice(0, 7).map((c) => (
              <button
                key={c.id}
                className={`lp-tile ${filters.category === c.slug ? "active" : ""}`}
                style={{ backgroundImage: `linear-gradient(150deg, rgba(13,17,23,.15), rgba(13,17,23,.78)), url("${coverForCategory(c)}")` }}
                onClick={() => setFilters((f) => ({ ...f, category: f.category === c.slug ? "" : c.slug }))}
              >
                <img className="lp-tile-icon" src={getCategoryImage(c)} alt="" />
                <span className="lp-tile-label">{c.name}</span>
              </button>
            ))}
          </div>
        </section>

        {/* ── Trending rail ── */}
        {trending.length > 0 && (
          <section className="lp-section">
            <header className="lp-section-head">
              <div>
                <span className="lp-kicker">{t("home.trending.eyebrow")}</span>
                <h2 className="lp-h2">{t("home.trending.title")}</h2>
              </div>
              <button className="btn btn-outline btn-sm" onClick={() => document.getElementById("lp-providers")?.scrollIntoView({ behavior: "smooth", block: "start" })}>
                {t("home.trending.seeAll")}
              </button>
            </header>
            <div className="lp-rail">
              {trending.map((b, idx) => (
                <Link to={`/business/${b.id}`} key={b.id} className="lp-rank-card">
                  <div className="lp-rank-media">
                    <img src={coverOf(b)} alt={b.name} loading="lazy" />
                    <span className="lp-rank-badge">#{idx + 1}</span>
                  </div>
                  <div className="lp-rank-body">
                    <h3>{b.name}</h3>
                    <StarDisplay rating={b.avgRating} count={b.reviewCount} />
                    <div className="lp-rank-foot">
                      <span className="lp-rank-city">{b.city}</span>
                      {startingPrice(b) && (
                        <span className="lp-rank-price">{t("common.from")} {startingPrice(b)}</span>
                      )}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* ── How it works ── */}
        <section className="lp-section" id="lp-how">
          <header className="lp-section-head">
            <div>
              <span className="lp-kicker">{t("home.howItWorks")}</span>
              <h2 className="lp-h2">{t("home.howItWorks.title")}</h2>
            </div>
          </header>
          <div className="lp-steps">
            {STEPS.map((s, i) => (
              <article className="lp-step" key={s.key}>
                <span className="lp-step-num">{String(i + 1).padStart(2, "0")}</span>
                <h3>{t(`journey.${s.key}`)}</h3>
                <p>{t(`journey.${s.key}.desc`)}</p>
              </article>
            ))}
          </div>
        </section>

        {/* ── All providers ── */}
        <section className="lp-section" id="lp-providers">
          <header className="lp-section-head">
            <div>
              <span className="lp-kicker">{t("home.providers.eyebrow")}</span>
              <h2 className="lp-h2">
                {activeCategory ? activeCategory.name : t("home.providers.allProviders")}
              </h2>
            </div>
            <span className="lp-count">
              {compareIds.length > 0 && `${t("home.providers.comparing")} ${compareIds.length}/3 · `}
              {businesses.length} {businesses.length !== 1 ? t("home.providers.results") : t("home.providers.result")}
            </span>
          </header>

          {loading && (
            <div className="providers-loading">
              {[1, 2, 3, 4, 5, 6].map((n) => <div className="biz-card-skeleton" key={n} />)}
            </div>
          )}

          {!loading && businesses.length === 0 && (
            <div className="empty-state card">
              <h3>{t("home.providers.noMatch")}</h3>
              <p>{t("home.providers.noMatch.desc")}</p>
            </div>
          )}

          <div className="grid grid-3">
            {!loading &&
              businesses.slice(0, visible).map((b) => (
                <div className="card biz-card" key={b.id}>
                  <div className="biz-card-cover">
                    <img src={coverOf(b)} alt={b.name} loading="lazy" />
                    <div className="biz-card-cover-overlay" />
                    <label className="biz-compare-toggle">
                      <input type="checkbox" checked={compareIds.includes(b.id)} onChange={() => toggleCompare(b.id)} />
                      {t("home.providers.compare")}
                    </label>
                    {b.category?.name && <span className="biz-category-badge">{b.category.name}</span>}
                  </div>
                  <div className="biz-card-body">
                    <h3 className="biz-card-name">
                      <Link to={`/business/${b.id}`}>{b.name}</Link>
                    </h3>
                    <StarDisplay rating={b.avgRating} count={b.reviewCount} />
                    {b.description && <p className="biz-card-desc">{b.description}</p>}
                    <div className="attr-list">
                      {b.city && <span className="attr-chip">📍 {b.city}</span>}
                      {startingPrice(b) && <span className="attr-chip">{t("common.from")} {startingPrice(b)}</span>}
                      {b.latitude != null && (
                        <a
                          className="attr-chip attr-chip--link"
                          href={directionsUrl(b)}
                          target="_blank"
                          rel="noreferrer"
                        >
                          {t("business.getDirections")}
                        </a>
                      )}
                    </div>
                    <Link to={`/business/${b.id}`}>
                      <button className="btn btn-primary btn-block" style={{ marginTop: 8 }}>
                        {t("home.providers.viewBook")}
                      </button>
                    </Link>
                  </div>
                </div>
              ))}
          </div>
          {!loading && businesses.length > visible && (
            <div className="lp-showmore">
              <button className="btn btn-outline" onClick={() => setVisible((v) => v + PAGE_SIZE)}>
                {t("common.showMore")}
                <span className="lp-showmore-count">{businesses.length - visible}</span>
              </button>
            </div>
          )}
        </section>

        {/* ── Compare table ── */}
        {compareList.length > 1 && (
          <section className="lp-section">
            <header className="lp-section-head">
              <div>
                <span className="lp-kicker">{t("home.compare.eyebrow")}</span>
                <h2 className="lp-h2">{t("home.compare.title")}</h2>
              </div>
            </header>
            <div className="card" style={{ overflowX: "auto", padding: 0 }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>{t("home.compare.provider")}</th>
                    <th>{t("home.compare.category")}</th>
                    <th>{t("home.compare.rating")}</th>
                    <th>{t("home.compare.startingPrice")}</th>
                    <th>{t("home.compare.city")}</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {compareList.map((b) => (
                    <tr key={b.id}>
                      <td><strong>{b.name}</strong></td>
                      <td>{b.category?.name}</td>
                      <td>{b.avgRating ? b.avgRating.toFixed(1) : t("common.new")} ({b.reviewCount})</td>
                      <td>{startingPrice(b) || "—"}</td>
                      <td>{b.city || "—"}</td>
                      <td>
                        <Link to={`/business/${b.id}`}>
                          <button className="btn btn-primary btn-sm">{t("home.compare.book")}</button>
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </div>

      {/* ── Closing CTA ── */}
      <section className="lp-cta">
        <div className="container lp-cta-inner">
          <div>
            <h2>{t("home.ctaBand.title")}</h2>
            <p>{t("home.ctaBand.subtitle")}</p>
          </div>
          <div className="lp-cta-actions">
            {isProvider ? (
              <Link to="/dashboard/business" className="btn btn-primary">{t("home.ctaBand.dashboard")}</Link>
            ) : (
              <Link to="/register" className="btn btn-primary">{t("home.ctaBand.join")}</Link>
            )}
            <Link to="/browse" className="lp-cta-ghost">{t("home.cta.browse")}</Link>
          </div>
        </div>
      </section>

      <footer className="lp-footer">
        <div className="container">
          <div className="lp-footer-grid">
            <div className="lp-footer-brand">
              <Link to="/" className="brand">
                <span className="brand-mark">N</span>
                Nearby<span className="dot">•</span>
              </Link>
              <p>{t("home.footer.tagline")}</p>
            </div>
            <div>
              <h4>{t("home.footer.explore")}</h4>
              <Link to="/browse">{t("home.providers.allProviders")}</Link>
              <a href="#lp-categories">{t("home.categories.title")}</a>
              <a href="#lp-how">{t("home.howItWorks")}</a>
            </div>
            <div>
              <h4>{t("home.footer.account")}</h4>
              {user ? (
                <Link to="/settings">{t("nav.settings")}</Link>
              ) : (
                <>
                  <Link to="/login">{t("nav.signIn")}</Link>
                  <Link to="/register">{t("nav.register")}</Link>
                </>
              )}
            </div>
            <div>
              <h4>{t("home.footer.forBusiness")}</h4>
              <Link to={isProvider ? "/dashboard/business" : "/register"}>{t("home.ctaBand.join")}</Link>
            </div>
          </div>
          <div className="lp-footer-bottom">
            <span>© {new Date().getFullYear()} Nearby. {t("home.footer.rights")}</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
