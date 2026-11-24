ALTER TYPE "SubmissionStatus" ADD VALUE IF NOT EXISTS 'partial';

ALTER TABLE "Submission"
  ADD COLUMN "submittedStepIds" JSONB NOT NULL DEFAULT '[]',
  ADD COLUMN "submittedStepAt" JSONB NOT NULL DEFAULT '{}',
  ADD COLUMN "updatedById" TEXT;

ALTER TABLE "Submission" ADD CONSTRAINT "Submission_updatedById_fkey"
  FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
