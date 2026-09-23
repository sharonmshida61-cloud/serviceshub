require("dotenv").config();
const express = require("express");
const cors = require("cors");
const morgan = require("morgan");

const authRoutes = require("./routes/auth");
const categoryRoutes = require("./routes/categories");
const businessRoutes = require("./routes/businesses");
const serviceRoutes = require("./routes/services");
const bookingRoutes = require("./routes/bookings");
const paymentRoutes = require("./routes/payments");
const messageRoutes = require("./routes/messages");
const reviewRoutes = require("./routes/reviews");
const adminRoutes = require("./routes/admin");
const favoritesRoutes = require("./routes/favorites");
const loyaltyRoutes = require("./routes/loyalty");
const portfolioRoutes = require("./routes/portfolio");
const notificationsRoutes = require("./routes/notifications");
const qrCheckinRoutes = require("./routes/qrcheckin");
const settingsRoutes = require("./routes/settings");
const analyticsRoutes = require("./routes/analytics");
const smartMatchRoutes = require("./routes/smartmatch");
const waitingListRoutes = require("./routes/waitinglist");
const emergencyRoutes = require("./routes/emergency");
const platformLoyaltyRoutes = require("./routes/platformloyalty");
const reviewSummaryRoutes = require("./routes/reviewsummary");
const enhancedPortfolioRoutes = require("./routes/enhancedportfolio");
const uploadRoutes = require("./routes/upload");

const app = express();
app.set("trust proxy", 1); // behind Vercel/proxies: correct req.protocol and req.ip

// Neon can briefly refuse connections (cold start / pooler blips). Prisma
// errors thrown inside async routes become unhandled rejections, which would
// kill the whole server — log them and stay up instead.
process.on("unhandledRejection", (err) => {
  console.error("[unhandledRejection]", err?.code || err?.message || err);
});

// CORS_ORIGIN may be "*" or a comma-separated list; entries are normalized
// (trimmed, trailing slash stripped) and the request origin is echoed back so
// browsers never see a mismatch caused by e.g. a trailing slash in the env value.
const corsOrigins = (process.env.CORS_ORIGIN || "*")
  .split(",")
  .map((o) => o.trim().replace(/\/+$/, ""))
  .filter(Boolean);

app.use(cors({
  origin(origin, cb) {
    if (corsOrigins.includes("*") || !origin || corsOrigins.includes(origin.replace(/\/+$/, ""))) {
      return cb(null, origin || true);
    }
    return cb(null, false);
  },
  credentials: true,
}));
app.use(express.json());
app.use(morgan("dev"));

// Serve uploaded media files (photos/videos) as static assets
app.use("/uploads", express.static(require("./utils/uploadRoot")));

app.get("/health", (req, res) => res.json({ ok: true, service: "local-services-backend" }));

app.use("/api/auth", authRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/businesses", businessRoutes);
app.use("/api/services", serviceRoutes);
app.use("/api/bookings", bookingRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api/reviews", reviewRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/favorites", favoritesRoutes);
app.use("/api/loyalty", loyaltyRoutes);
app.use("/api/portfolio", portfolioRoutes);
app.use("/api/notifications", notificationsRoutes);
app.use("/api/qrcheckin", qrCheckinRoutes);
app.use("/api/settings", settingsRoutes);
app.use("/api/analytics", analyticsRoutes);
app.use("/api/smartmatch", smartMatchRoutes);
app.use("/api/waitinglist", waitingListRoutes);
app.use("/api/emergency", emergencyRoutes);
app.use("/api/platformloyalty", platformLoyaltyRoutes);
app.use("/api/reviewsummary", reviewSummaryRoutes);
app.use("/api/enhancedportfolio", enhancedPortfolioRoutes);
app.use("/api/upload", uploadRoutes);

// Central error handler — keeps error shapes consistent across the API.
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: "Something went wrong on our end. Please try again." });
});

app.use((req, res) => res.status(404).json({ error: "Not found" }));

const PORT = Number(process.env.PORT) || 4000;

if (require.main === module) {
  const server = app.listen(PORT, "0.0.0.0", () => {
    console.log(`API listening on http://0.0.0.0:${PORT}`);
  });

  // If a DB call stalls, fail the request instead of hanging forever.
  server.setTimeout(25000, (socket) => {
    if (!socket.destroyed && !socket.writableEnded) {
      socket.write(
        "HTTP/1.1 504 Gateway Timeout\r\nConnection: close\r\n\r\n"
      );
    }

    socket.destroy();
  });
}

module.exports = app;