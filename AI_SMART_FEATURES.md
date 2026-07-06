# AI & Smart Features Documentation

This document details all the advanced AI and intelligent features added to the local services platform.

## 1. AI Smart Match 🤖

**Natural language service discovery** - Customers describe their needs and get intelligent provider recommendations.

### How it works:
- Customer enters a natural language query like: *"I need a barber tomorrow after 6 PM within $50 budget"*
- AI parser extracts:
  - **Category** (barber, plumber, etc.)
  - **Time preferences** (today, tomorrow, after hours)
  - **Budget constraints** ($50 = 5000 cents)
  - **Location** (city/area)
- Algorithm calculates match scores based on:
  - Rating (higher = better)
  - Review count (more = more trustworthy)
  - Budget fit (within budget = bonus points)
  - Location match (same city = bonus points)
- Results ranked by match score percentage

### API Endpoints:
- `POST /api/smartmatch` - Create smart match request
  ```json
  { "query": "I need a barber tomorrow after 6 PM within $50 budget" }
  ```
- `GET /api/smartmatch/history` - Get user's search history

### Frontend Integration:
- **SmartMatch component** on home page
- Shows parsed intent
- Displays ranked results with match scores
- Direct booking links

### Example Queries:
- "Emergency plumber needed in downtown"
- "Find affordable hair salon near me"
- "I need a tutor for math today"
- "Looking for photographer under $200"

---

## 2. AI Review Summary 📊

**Automated insights from customer reviews** - Condensed, actionable feedback at a glance.

### How it works:
- Analyzes all reviews for a business
- Extracts:
  - **Sentiment** (positive, neutral, negative)
  - **Key topics** (punctual, professional, affordable, etc.)
  - **Strengths** (what customers love)
  - **Concerns** (areas for improvement)
- Generates human-readable summary
- Auto-updates every 24 hours or on-demand

### Algorithm:
- Keyword extraction (positive/negative words)
- Rating distribution analysis
- Common phrase detection
- Summary generation based on patterns

### API Endpoints:
- `GET /api/reviewsummary/:businessId` - Get AI summary (cached)
- `POST /api/reviewsummary/:businessId/regenerate` - Force regenerate

### Frontend Display:
- Shown at top of reviews section
- Color-coded by sentiment (green/yellow/red)
- Expandable strengths/concerns lists
- Key topics as tags

---

## 3. Smart Waiting List 📋

**Automatic slot notification** - When a booking cancels, notify waiting customers instantly.

### How it works:
1. Customer joins waiting list for a business/service
2. Sets preferences:
   - Preferred date
   - Time window (e.g., 2 PM - 6 PM)
   - Specific service (optional)
3. When a booking is cancelled, business owner/employee triggers notification
4. First-come-first-served: notify up to 5 waiting customers
5. Customers receive in-app notification
6. Waiting list expires after 7 days

### API Endpoints:
- `POST /api/waitinglist` - Join waiting list
  ```json
  {
    "businessId": "...",
    "serviceId": "...",
    "preferredDate": "2025-01-15",
    "preferredTimeStart": "14:00",
    "preferredTimeEnd": "18:00"
  }
  ```
- `GET /api/waitinglist/mine` - Get user's active waiting lists
- `POST /api/waitinglist/notify/:businessId` - Notify waiting customers (business owner/employee)
- `DELETE /api/waitinglist/:id` - Leave waiting list

### Statuses:
- `ACTIVE` - Waiting for slot
- `NOTIFIED` - Customer has been notified
- `BOOKED` - Customer booked the slot
- `EXPIRED` - 7 days passed
- `CANCELLED` - Customer left queue

---

## 4. Emergency Booking 🚨

**Urgent service requests** - Broadcast emergency needs to nearby providers instantly.

### How it works:
1. Customer creates emergency booking request
2. Specifies:
   - Category (plumber, electrician, etc.)
   - Description of emergency
   - Location (optional coordinates)
   - Max budget (optional)
3. System finds all approved businesses in that category and location
4. Notifies **all business owners and employees** immediately
5. First provider to accept gets the job
6. Customer receives notification with provider details
7. Request expires after 2 hours

### API Endpoints:
- `POST /api/emergency` - Create emergency request
  ```json
  {
    "categoryId": "...",
    "description": "Burst pipe flooding kitchen",
    "location": "Downtown",
    "latitude": 40.7128,
    "longitude": -74.0060,
    "maxPriceCents": 15000
  }
  ```
- `GET /api/emergency/mine` - Get user's emergency requests
- `POST /api/emergency/:id/accept` - Accept emergency (provider)
- `GET /api/emergency/business/:businessId` - View available emergencies

### Statuses:
- `REQUESTED` - Just created
- `PROVIDER_NOTIFIED` - Providers have been notified
- `ACCEPTED` - Provider accepted
- `DECLINED` - Provider declined
- `EXPIRED` - 2 hours passed

---

## 5. Cross-Business Loyalty Program 💎

**Platform-wide points** - Earn and redeem points across ALL businesses.

### How it works:
- Customer earns points from **any** completed booking
- Points accumulate in single platform account
- Redeem points at **any participating business**
- Tier system based on lifetime points:
  - 🥉 **Member**: 0+ points
  - 🥈 **Silver**: 500+ points
  - 🥇 **Gold**: 1,500+ points
  - 💎 **Platinum**: 3,000+ points
  - 💠 **Diamond**: 5,000+ points

### Point Values:
- Base: **1 point = $0.01**
- Bonuses for bulk redemption:
  - 100 points = $1.00
  - 500 points = $5.50 (10% bonus)
  - 1,000 points = $12.00 (20% bonus)

### API Endpoints:
- `GET /api/platformloyalty` - Get user's account & transaction history
- `POST /api/platformloyalty/award` - Award points (business owner/employee)
  ```json
  {
    "userId": "...",
    "bookingId": "...",
    "businessId": "...",
    "points": 25,
    "description": "Points from haircut booking"
  }
  ```
- `POST /api/platformloyalty/redeem` - Redeem points
  ```json
  {
    "points": 500,
    "businessId": "..."
  }
  ```
- `GET /api/platformloyalty/stats` - Platform statistics (admin)

### Transaction Types:
- `EARNED` - Points from booking
- `REDEEMED` - Points used for discount
- `EXPIRED` - Points expired (future feature)
- `BONUS` - Promotional bonus
- `ADJUSTMENT` - Admin correction

---

## 6. Digital Business Portfolio 📸

**Enhanced media showcase** - Photos, videos, certificates, licenses, and completed projects.

### Media Types:
- 📸 **PHOTO** - Work samples, before/after shots
- 🎥 **VIDEO** - Demonstrations, tours, testimonials
- 📜 **CERTIFICATE** - Professional certifications
- ✅ **LICENSE** - Business licenses, permits
- 🏗️ **PROJECT** - Completed project showcases

### Features:
- **Admin verification** for certificates/licenses (✓ badge)
- Thumbnail support for videos
- Display order customization
- Metadata storage (video duration, license expiry, etc.)

### API Endpoints:
- `GET /api/enhancedportfolio/business/:businessId?type=CERTIFICATE` - Get portfolio items
- `POST /api/enhancedportfolio` - Add item (business owner)
  ```json
  {
    "businessId": "...",
    "type": "CERTIFICATE",
    "title": "Master Plumber License",
    "description": "State-certified master plumber",
    "mediaUrl": "https://...",
    "thumbnailUrl": "https://...",
    "metadata": {
      "issueDate": "2020-01-15",
      "expiryDate": "2025-01-15",
      "issuedBy": "State Board"
    },
    "displayOrder": 0
  }
  ```
- `PUT /api/enhancedportfolio/:id` - Update item
- `DELETE /api/enhancedportfolio/:id` - Delete item
- `POST /api/enhancedportfolio/:id/verify` - Verify credential (admin only)
- `GET /api/enhancedportfolio/business/:businessId/stats` - Get statistics

### Frontend Display:
- Grid layout with type badges
- Video player for video content
- Verified checkmark for admin-verified items
- Click to expand/view full details

---

## Database Schema Updates

### New Models:

```prisma
model SmartMatchRequest {
  userId    String
  query     String  // Natural language query
  parsed    String  // JSON: extracted intent
  results   String  // JSON: business IDs with scores
  createdAt DateTime
}

model WaitingList {
  userId             String
  businessId         String
  serviceId          String?
  preferredDate      DateTime?
  preferredTimeStart String?
  preferredTimeEnd   String?
  status             WaitingListStatus
  notifiedAt         DateTime?
  expiresAt          DateTime?
}

model EmergencyBooking {
  userId        String
  categoryId    String
  description   String
  location      String?
  maxPriceCents Int?
  status        EmergencyStatus
  acceptedById  String?  // Business ID
  expiresAt     DateTime
}

model PlatformLoyaltyAccount {
  userId         String  @unique
  totalPoints    Int     // Current redeemable balance
  lifetimePoints Int     // All-time total (for tier)
  tier           String  // member, silver, gold, platinum, diamond
  transactions   PlatformLoyaltyTransaction[]
}

model PlatformLoyaltyTransaction {
  accountId   String
  type        LoyaltyTransactionType
  points      Int
  businessId  String?
  bookingId   String?
  description String
}

model ReviewSummary {
  businessId  String  @unique
  summary     String  // AI-generated summary
  sentiment   String  // positive, neutral, negative
  keyTopics   String  // JSON array
  strengths   String  // JSON array
  concerns    String  // JSON array
  lastUpdated DateTime
}

model EnhancedPortfolio {
  businessId   String
  type         PortfolioMediaType // PHOTO, VIDEO, CERTIFICATE, LICENSE, PROJECT
  title        String?
  description  String?
  mediaUrl     String
  thumbnailUrl String?
  metadata     String  // JSON
  displayOrder Int
  verified     Boolean  // Admin verified
}
```

---

## Integration Guide

### After Database Migration:

1. **Award platform points automatically:**
   ```javascript
   // When booking status changes to COMPLETED
   await api.awardPlatformPoints({
     userId: booking.customerId,
     bookingId: booking.id,
     businessId: booking.businessId,
     points: Math.floor(booking.priceCents / 100), // 1 point per dollar
     description: "Points from completed booking"
   });
   ```

2. **Trigger waiting list notification:**
   ```javascript
   // When booking is cancelled
   await api.notifyWaitingList(businessId, {
     serviceId: booking.serviceId,
     availableSlot: booking.scheduledAt
   });
   ```

3. **Auto-update review summary:**
   ```javascript
   // After new review is posted
   await api.regenerateReviewSummary(businessId);
   ```

---

## Future Enhancements

### Potential AI Improvements:
- **Real NLP integration** (OpenAI, Claude) for smarter query parsing
- **Sentiment analysis API** for review summaries
- **Image recognition** for portfolio verification
- **Predictive availability** - Suggest booking times based on patterns
- **Dynamic pricing suggestions** - AI-powered price optimization
- **Fraud detection** - Flag suspicious reviews/bookings
- **Smart scheduling** - AI arranges optimal staff/service schedules

### Feature Extensions:
- **Push notifications** for emergency bookings
- **SMS integration** for urgent alerts
- **Email digests** for waiting list updates
- **Mobile app** QR code scanning
- **Geo-fencing** for location-based emergency matching
- **Points marketplace** - Trade points between users
- **Business analytics dashboard** with AI insights

---

## Testing the Features

### 1. Test AI Smart Match:
```bash
curl -X POST http://localhost:4000/api/smartmatch \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"query":"I need a barber tomorrow after 6 PM within $50 budget"}'
```

### 2. Test Emergency Booking:
```bash
curl -X POST http://localhost:4000/api/emergency \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"categoryId":"CAT_ID","description":"Burst pipe emergency","location":"Downtown"}'
```

### 3. Test Platform Loyalty:
```bash
# Get account
curl http://localhost:4000/api/platformloyalty \
  -H "Authorization: Bearer YOUR_TOKEN"

# Redeem points
curl -X POST http://localhost:4000/api/platformloyalty/redeem \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"points":500,"businessId":"BIZ_ID"}'
```

---

## Summary

All 7 AI & Smart Features are now fully implemented:

✅ **AI Smart Match** - Natural language provider discovery  
✅ **AI Review Summary** - Automated review insights  
✅ **Smart Waiting List** - Auto-notify on cancellations  
✅ **Emergency Booking** - Urgent service broadcasts  
✅ **Cross-Business Loyalty** - Platform-wide points system  
✅ **Digital Portfolio** - Photos, videos, certificates, licenses  
✅ **Enhanced Analytics** - Already existed, now integrated  

**Next Step:** Run database migration to activate all features!

```bash
cd backend
npx prisma migrate dev --name add_ai_smart_features
npx prisma generate
npm run dev
```
