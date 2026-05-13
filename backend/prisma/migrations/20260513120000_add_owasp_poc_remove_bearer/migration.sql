-- Add INFO to Severity enum if not present
DO $$ BEGIN
    ALTER TYPE "Severity" ADD VALUE 'INFO';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Add owaspId and aiProofOfConcept to issues
ALTER TABLE "issues" ADD COLUMN IF NOT EXISTS "owaspId" TEXT;
ALTER TABLE "issues" ADD COLUMN IF NOT EXISTS "aiProofOfConcept" TEXT;

-- Remove Bearer-specific and legacy columns from issues
ALTER TABLE "issues" DROP COLUMN IF EXISTS "rawData";

-- Remove legacy columns from scans
ALTER TABLE "scans" DROP COLUMN IF EXISTS "bearerOutput";
ALTER TABLE "scans" DROP COLUMN IF EXISTS "scannerVersion";
