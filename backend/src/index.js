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

app.use(cors({ origin: process.env.CORS_ORIGIN || "*" }));
app.use(express.json());
app.use(morgan("dev"));

// Serve uploaded media files (photos/videos) as static assets
app.use("/uploads", express.static(require("path").join(__dirname, "../uploads")));

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
app.listen(PORT, "0.0.0.0", () => console.log(`API listening on http://0.0.0.0:${PORT}`));
