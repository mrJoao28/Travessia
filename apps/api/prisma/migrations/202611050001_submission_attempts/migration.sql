ALTER TABLE "Submission" ADD COLUMN "attempt" INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN "revisionRequested" BOOLEAN NOT NULL DEFAULT false;

DROP INDEX "Submission_versionId_userId_key";
CREATE UNIQUE INDEX "Submission_versionId_userId_attempt_key"
  ON "Submission"("versionId", "userId", "attempt");
