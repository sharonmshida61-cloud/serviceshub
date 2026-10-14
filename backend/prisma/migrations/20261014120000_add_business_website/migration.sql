-- AlterTable
-- A listing can point at the owner's own site, which customers open in a new tab.
ALTER TABLE "Business" ADD COLUMN     "website" TEXT;
