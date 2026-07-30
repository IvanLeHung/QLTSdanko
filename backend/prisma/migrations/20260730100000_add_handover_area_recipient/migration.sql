ALTER TABLE "HandoverDocument"
ADD COLUMN "recipientType" TEXT NOT NULL DEFAULT 'PERSON',
ADD COLUMN "recipientArea" TEXT;
