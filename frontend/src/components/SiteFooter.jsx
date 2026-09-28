import { Link } from "react-router-dom";
import { useLanguage } from "../context/LanguageContext.jsx";
import { useAuth } from "../context/AuthContext.jsx";

export default function SiteFooter() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const roles = user?.roles || (user?.role ? [user.role] : []);
  const isProvider = roles.includes("BUSINESS_OWNER");

  return (
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
  );
}
