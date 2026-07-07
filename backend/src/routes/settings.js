const router = require("express").Router();
const { PrismaClient } = require("@prisma/client");
const { requireAuth } = require("../middleware/auth");

const prisma = new PrismaClient();

// Get user settings
router.get("/", requireAuth, async (req, res, next) => {
  try {
    let settings = await prisma.userSettings.findUnique({
      where: { userId: req.user.id },
    });

    // Create default settings if they don't exist
    if (!settings) {
      settings = await prisma.userSettings.create({
        data: { userId: req.user.id },
      });
    }

    res.json(settings);
  } catch (err) {
    next(err);
  }
});

// Update user settings
router.put("/", requireAuth, async (req, res, next) => {
  try {
    const {
      emailNotifications,
      smsNotifications,
      pushNotifications,
      language,
      timezone,
      marketingEmails,
    } = req.body;

    const settings = await prisma.userSettings.upsert({
      where: { userId: req.user.id },
      create: {
        userId: req.user.id,
        emailNotifications,
        smsNotifications,
        pushNotifications,
        language,
        timezone,
        marketingEmails,
      },
      update: {
        ...(emailNotifications !== undefined && { emailNotifications }),
        ...(smsNotifications !== undefined && { smsNotifications }),
        ...(pushNotifications !== undefined && { pushNotifications }),
        ...(language && { language }),
        ...(timezone && { timezone }),
        ...(marketingEmails !== undefined && { marketingEmails }),
      },
    });

    res.json(settings);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
