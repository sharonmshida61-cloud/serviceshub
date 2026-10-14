-- AlterTable
-- A team row can now stand on its own: owners list the people they work with by
-- name, phone or email even when that person has not signed up yet.
ALTER TABLE "BusinessEmployee" ALTER COLUMN "userId" DROP NOT NULL;
ALTER TABLE "BusinessEmployee" ADD COLUMN     "staffName" TEXT;
ALTER TABLE "BusinessEmployee" ADD COLUMN     "staffPhone" TEXT;
ALTER TABLE "BusinessEmployee" ADD COLUMN     "staffEmail" TEXT;
