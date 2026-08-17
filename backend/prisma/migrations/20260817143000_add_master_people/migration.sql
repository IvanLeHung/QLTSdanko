CREATE TABLE "MasterPerson" (
    "id" SERIAL NOT NULL,
    "fullName" TEXT NOT NULL,
    "normalizedName" TEXT NOT NULL,
    "phone" TEXT,
    "position" TEXT,
    "departmentName" TEXT,
    "cityName" TEXT,
    "projectName" TEXT,
    "locationName" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "note" TEXT,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MasterPerson_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "MasterPerson_normalizedName_status_idx" ON "MasterPerson"("normalizedName", "status");
CREATE INDEX "MasterPerson_departmentName_idx" ON "MasterPerson"("departmentName");
