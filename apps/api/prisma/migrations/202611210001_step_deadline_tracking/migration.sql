ALTER TABLE "Submission" ADD COLUMN "stepCompletedAt" JSONB NOT NULL DEFAULT '{}'::jsonb;

CREATE TABLE "StepDeadlineExtension" (
    "id" TEXT NOT NULL,
    "stepId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "teacherId" TEXT NOT NULL,
    "dueAt" TIMESTAMP(3) NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "StepDeadlineExtension_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "StepDeadlineExtension_stepId_studentId_key" ON "StepDeadlineExtension"("stepId", "studentId");
CREATE INDEX "StepDeadlineExtension_studentId_idx" ON "StepDeadlineExtension"("studentId");
ALTER TABLE "StepDeadlineExtension" ADD CONSTRAINT "StepDeadlineExtension_stepId_fkey"
  FOREIGN KEY ("stepId") REFERENCES "Step"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "StepDeadlineExtension" ADD CONSTRAINT "StepDeadlineExtension_studentId_fkey"
  FOREIGN KEY ("studentId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "StepDeadlineExtension" ADD CONSTRAINT "StepDeadlineExtension_teacherId_fkey"
  FOREIGN KEY ("teacherId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
