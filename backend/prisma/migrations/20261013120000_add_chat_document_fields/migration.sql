-- AlterTable
-- A document bubble has nothing to preview, so it carries the sender's file name
-- and byte size alongside the URL.
ALTER TABLE "Message" ADD COLUMN     "mediaName" TEXT,
ADD COLUMN     "mediaSize" INTEGER;
