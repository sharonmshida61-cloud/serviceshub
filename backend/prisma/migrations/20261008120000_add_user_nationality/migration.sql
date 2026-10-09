-- Sign-up collects a nationality next to the phone number, so both account
-- types are stored with it.
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "nationality" TEXT;
