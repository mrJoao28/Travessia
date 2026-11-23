ALTER TABLE "Submission"
ADD COLUMN "stepRevisions" JSONB NOT NULL DEFAULT '{}'::jsonb;

CREATE TABLE "SubmissionStepValidation" (
    "submissionId" TEXT NOT NULL,
    "stepId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "contentHash" TEXT NOT NULL,
    "validatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SubmissionStepValidation_pkey" PRIMARY KEY ("submissionId", "stepId", "userId"),
    CONSTRAINT "SubmissionStepValidation_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "Submission"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "SubmissionStepValidation_stepId_fkey" FOREIGN KEY ("stepId") REFERENCES "Step"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "SubmissionStepValidation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "SubmissionStepValidation_userId_idx" ON "SubmissionStepValidation"("userId");
