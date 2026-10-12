-- Marks a booking the customer removed from their own list.
-- The business keeps seeing the row; only /bookings/mine filters on it.
ALTER TABLE "Booking" ADD COLUMN "customerDeletedAt" TIMESTAMP(3);
