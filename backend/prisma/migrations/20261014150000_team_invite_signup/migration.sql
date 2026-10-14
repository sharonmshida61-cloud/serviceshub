-- AlterTable
-- A teammate who joins through the owner's invitation link uploads a picture of
-- their national ID, so the account records it beside the profile picture.
ALTER TABLE "User" ADD COLUMN     "nationalIdUrl" TEXT;

-- AlterTable
-- The seed baked into an invitation link makes it revocable: asking for a new
-- link writes a new seed, so every QR code and URL sent before stops working.
ALTER TABLE "BusinessEmployee" ADD COLUMN     "inviteSeed" TEXT;
