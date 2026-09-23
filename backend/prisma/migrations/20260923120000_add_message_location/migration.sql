-- A chat message can now carry a pinned location, so an owner can send a
-- customer the exact spot to meet/guide them to.
-- Business.latitude / Business.longitude already exist from the init migration.

ALTER TABLE "Message" ADD COLUMN IF NOT EXISTS "latitude" DOUBLE PRECISION;
ALTER TABLE "Message" ADD COLUMN IF NOT EXISTS "longitude" DOUBLE PRECISION;
ALTER TABLE "Message" ADD COLUMN IF NOT EXISTS "locationName" TEXT;
