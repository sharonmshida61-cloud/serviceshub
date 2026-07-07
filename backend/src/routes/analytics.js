const router = require("express").Router();
const { PrismaClient } = require("@prisma/client");
const { requireAuth } = require("../middleware/auth");

const prisma = new PrismaClient();

// Get business analytics (for business owners)
router.get("/business/:businessId", requireAuth, async (req, res, next) => {
  try {
    const business = await prisma.business.findUnique({
      where: { id: req.params.businessId },
    });

    if (!business || (business.ownerId !== req.user.id && req.user.role !== "ADMIN")) {
      return res.status(403).json({ error: "Unauthorized" });
    }

    const { startDate, endDate } = req.query;
    const dateFilter = {};
    if (startDate) dateFilter.gte = new Date(startDate);
    if (endDate) dateFilter.lte = new Date(endDate);

    // Total bookings
    const totalBookings = await prisma.booking.count({
      where: {
        businessId: req.params.businessId,
        ...(Object.keys(dateFilter).length && { createdAt: dateFilter }),
      },
    });

    // Bookings by status
    const bookingsByStatus = await prisma.booking.groupBy({
      by: ["status"],
      where: {
        businessId: req.params.businessId,
        ...(Object.keys(dateFilter).length && { createdAt: dateFilter }),
      },
      _count: { id: true },
    });

    // Revenue (from completed bookings)
    const revenue = await prisma.booking.aggregate({
      where: {
        businessId: req.params.businessId,
        status: "COMPLETED",
        ...(Object.keys(dateFilter).length && { createdAt: dateFilter }),
      },
      _sum: { priceCents: true },
      _avg: { priceCents: true },
    });

    // Most popular services
    const topServices = await prisma.booking.groupBy({
      by: ["serviceId"],
      where: {
        businessId: req.params.businessId,
        ...(Object.keys(dateFilter).length && { createdAt: dateFilter }),
      },
      _count: { id: true },
      _sum: { priceCents: true },
      orderBy: { _count: { id: "desc" } },
      take: 5,
    });

    const servicesWithNames = await Promise.all(
      topServices.map(async (item) => {
        const service = await prisma.service.findUnique({
          where: { id: item.serviceId },
          select: { name: true, priceCents: true },
        });
        return { 
          ...item, 
          service,
          revenue: item._sum.priceCents || 0,
          bookingCount: item._count.id,
        };
      })
    );

    // Reviews stats
    const reviewStats = await prisma.review.aggregate({
      where: { businessId: req.params.businessId },
      _avg: { rating: true },
      _count: { id: true },
    });

    // Customer retention (repeat customers)
    const repeatCustomers = await prisma.booking.groupBy({
      by: ["customerId"],
      where: {
        businessId: req.params.businessId,
        status: "COMPLETED",
      },
      _count: { id: true },
      having: {
        id: {
          _count: {
            gt: 1,
          },
        },
      },
    });

    const uniqueCustomers = await prisma.booking.groupBy({
      by: ["customerId"],
      where: {
        businessId: req.params.businessId,
        status: "COMPLETED",
      },
    });

    // Peak hours analysis
    const allBookings = await prisma.booking.findMany({
      where: {
        businessId: req.params.businessId,
        ...(Object.keys(dateFilter).length && { createdAt: dateFilter }),
      },
      select: { scheduledAt: true },
    });

    const hourCounts = {};
    allBookings.forEach(b => {
      const hour = new Date(b.scheduledAt).getHours();
      hourCounts[hour] = (hourCounts[hour] || 0) + 1;
    });

    const peakHours = Object.entries(hourCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([hour, count]) => ({
        hour: parseInt(hour),
        timeRange: `${hour}:00 - ${parseInt(hour) + 1}:00`,
        bookings: count,
      }));

    // Employee performance
    const employeePerformance = await prisma.booking.groupBy({
      by: ["employeeId"],
      where: {
        businessId: req.params.businessId,
        employeeId: { not: null },
        status: "COMPLETED",
        ...(Object.keys(dateFilter).length && { createdAt: dateFilter }),
      },
      _count: { id: true },
      _sum: { priceCents: true },
    });

    const employeeDetails = await Promise.all(
      employeePerformance.map(async (emp) => {
        const employee = await prisma.businessEmployee.findFirst({
          where: { id: emp.employeeId },
          include: { user: { select: { name: true } } },
        });
        return {
          employeeId: emp.employeeId,
          name: employee?.user.name || "Unknown",
          title: employee?.title || "Staff",
          completedBookings: emp._count.id,
          revenue: emp._sum.priceCents || 0,
        };
      })
    );

    // Booking trends (daily for the period)
    const bookingsOverTime = await prisma.$queryRaw`
      SELECT DATE(createdAt) as date, COUNT(*) as count, SUM(priceCents) as revenue
      FROM Booking
      WHERE businessId = ${req.params.businessId}
      ${Object.keys(dateFilter).length ? `AND createdAt >= ${dateFilter.gte || new Date(0)} AND createdAt <= ${dateFilter.lte || new Date()}` : ''}
      GROUP BY DATE(createdAt)
      ORDER BY date DESC
      LIMIT 30
    `;

    // Cancellation analysis
    const cancellationsByStatus = await prisma.booking.groupBy({
      by: ["status"],
      where: {
        businessId: req.params.businessId,
        status: { in: ["CANCELLED", "DECLINED"] },
        ...(Object.keys(dateFilter).length && { createdAt: dateFilter }),
      },
      _count: { id: true },
    });

    const cancellationRate = totalBookings > 0
      ? ((cancellationsByStatus.reduce((sum, s) => sum + s._count.id, 0) / totalBookings) * 100).toFixed(1)
      : 0;

    // Day of week analysis
    const bookingsByDayOfWeek = {};
    allBookings.forEach(b => {
      const day = new Date(b.scheduledAt).getDay(); // 0 = Sunday
      const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
      const dayName = dayNames[day];
      bookingsByDayOfWeek[dayName] = (bookingsByDayOfWeek[dayName] || 0) + 1;
    });

    res.json({
      totalBookings,
      bookingsByStatus,
      revenue: {
        totalCents: revenue._sum.priceCents || 0,
        totalFormatted: ((revenue._sum.priceCents || 0) / 100).toFixed(2),
        averageCents: revenue._avg.priceCents || 0,
        averageFormatted: ((revenue._avg.priceCents || 0) / 100).toFixed(2),
      },
      topServices: servicesWithNames,
      reviews: {
        avgRating: reviewStats._avg.rating || 0,
        totalCount: reviewStats._count.id || 0,
      },
      customerRetention: {
        uniqueCustomers: uniqueCustomers.length,
        repeatCustomers: repeatCustomers.length,
        repeatRate: uniqueCustomers.length > 0 
          ? ((repeatCustomers.length / uniqueCustomers.length) * 100).toFixed(1)
          : 0,
        loyalCustomers: repeatCustomers.filter(c => c._count.id >= 5).length,
      },
      peakHours,
      employeePerformance: employeeDetails.sort((a, b) => b.revenue - a.revenue),
      bookingsOverTime,
      cancellations: {
        total: cancellationsByStatus.reduce((sum, s) => sum + s._count.id, 0),
        rate: cancellationRate,
        byStatus: cancellationsByStatus,
      },
      bookingsByDayOfWeek,
    });
  } catch (err) {
    next(err);
  }
});

// Get platform-wide analytics (admin only)
router.get("/platform", requireAuth, async (req, res, next) => {
  try {
    if (req.user.role !== "ADMIN") {
      return res.status(403).json({ error: "Unauthorized" });
    }

    const totalUsers = await prisma.user.count();
    const usersByRole = await prisma.user.groupBy({
      by: ["role"],
      _count: { id: true },
    });

    const totalBusinesses = await prisma.business.count();
    const businessesByStatus = await prisma.business.groupBy({
      by: ["status"],
      _count: { id: true },
    });

    const totalBookings = await prisma.booking.count();
    const totalRevenue = await prisma.payment.aggregate({
      where: { status: "PAID" },
      _sum: { amountCents: true },
    });

    const categoriesWithBusinessCount = await prisma.category.findMany({
      include: {
        _count: {
          select: { businesses: true },
        },
      },
      orderBy: {
        businesses: {
          _count: "desc",
        },
      },
    });

    res.json({
      users: {
        total: totalUsers,
        byRole: usersByRole,
      },
      businesses: {
        total: totalBusinesses,
        byStatus: businessesByStatus,
      },
      bookings: {
        total: totalBookings,
      },
      revenue: {
        totalCents: totalRevenue._sum.amountCents || 0,
        totalFormatted: ((totalRevenue._sum.amountCents || 0) / 100).toFixed(2),
      },
      categories: categoriesWithBusinessCount,
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
