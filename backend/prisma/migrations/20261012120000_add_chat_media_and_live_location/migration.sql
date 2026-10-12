-- AlterTable
ALTER TABLE "Message" ADD COLUMN     "liveShareId" TEXT,
ADD COLUMN     "mediaKind" TEXT,
ADD COLUMN     "mediaSecs" INTEGER,
ADD COLUMN     "mediaUrl" TEXT;

-- CreateTable
CREATE TABLE "LiveLocationShare" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "startedById" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "accuracy" DOUBLE PRECISION,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "stoppedAt" TIMESTAMP(3),

    CONSTRAINT "LiveLocationShare_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "LiveLocationShare_businessId_customerId_idx" ON "LiveLocationShare"("businessId", "customerId");

-- CreateIndex
CREATE INDEX "Message_businessId_customerId_idx" ON "Message"("businessId", "customerId");

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_liveShareId_fkey" FOREIGN KEY ("liveShareId") REFERENCES "LiveLocationShare"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LiveLocationShare" ADD CONSTRAINT "LiveLocationShare_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LiveLocationShare" ADD CONSTRAINT "LiveLocationShare_startedById_fkey" FOREIGN KEY ("startedById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

