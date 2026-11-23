ALTER TABLE "Submission"
ADD COLUMN "stepResponses" JSONB NOT NULL DEFAULT '{}'::jsonb;
