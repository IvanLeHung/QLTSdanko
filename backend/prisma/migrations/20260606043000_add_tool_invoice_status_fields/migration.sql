ALTER TABLE "ToolInvoiceBatch"
ADD COLUMN "invoiceLegalStatus" TEXT NOT NULL DEFAULT 'SUPPLIER_DRAFT',
ADD COLUMN "expectedSignedDate" TIMESTAMP(3),
ADD COLUMN "followUpOwner" TEXT,
ADD COLUMN "reminderAfter3Days" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "reminderBeforeDueDate" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "signedFileUrl" TEXT,
ADD COLUMN "officialInvoiceNo" TEXT,
ADD COLUMN "officialInvoiceSymbol" TEXT,
ADD COLUMN "officialInvoiceDate" TIMESTAMP(3),
ADD COLUMN "lookupCode" TEXT,
ADD COLUMN "signedVerificationStatus" TEXT;

ALTER TABLE "ToolInvoiceLine"
ADD COLUMN "unit" TEXT,
ADD COLUMN "vatRate" DOUBLE PRECISION,
ADD COLUMN "vatAmount" DOUBLE PRECISION;
