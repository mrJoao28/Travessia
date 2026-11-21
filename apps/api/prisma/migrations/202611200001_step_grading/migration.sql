ALTER TABLE "Step" ADD COLUMN "dueAt" TIMESTAMP(3), ADD COLUMN "maxPoints" INTEGER;
ALTER TABLE "Feedback" ADD COLUMN "scores" JSONB, ADD COLUMN "totalPoints" INTEGER;
ALTER TABLE "Step" ADD CONSTRAINT "Step_maxPoints_check" CHECK ("maxPoints" IS NULL OR ("maxPoints" >= 0 AND "maxPoints" <= 100));
ALTER TABLE "Feedback" ADD CONSTRAINT "Feedback_totalPoints_check" CHECK ("totalPoints" IS NULL OR "totalPoints" >= 0);
