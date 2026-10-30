BEGIN;
CREATE TABLE "LearningNeeds" ("userId" TEXT PRIMARY KEY REFERENCES "User"(id) ON DELETE CASCADE ON UPDATE CASCADE, disabilities JSONB NOT NULL, supports JSONB NOT NULL, "preferredFormats" JSONB NOT NULL, revision INTEGER NOT NULL DEFAULT 1 CHECK(revision > 0));
CREATE TABLE "NeedsSharing" ("userId" TEXT NOT NULL REFERENCES "User"(id) ON DELETE CASCADE ON UPDATE CASCADE, "classroomId" TEXT NOT NULL REFERENCES "Classroom"(id) ON DELETE CASCADE ON UPDATE CASCADE, shared BOOLEAN NOT NULL DEFAULT false, "includeDisabilities" BOOLEAN NOT NULL DEFAULT false, revision INTEGER NOT NULL DEFAULT 1 CHECK(revision > 0), PRIMARY KEY("userId", "classroomId"));
CREATE TABLE "ActivityAdaptation" (id TEXT PRIMARY KEY, "versionId" TEXT NOT NULL REFERENCES "MissionVersion"(id) ON DELETE CASCADE ON UPDATE CASCADE, "stepId" TEXT REFERENCES "Step"(id) ON DELETE CASCADE ON UPDATE CASCADE, audience TEXT NOT NULL CHECK(audience IN ('classroom','students')), instructions TEXT NOT NULL, example TEXT NOT NULL, "supportNeeds" JSONB NOT NULL, "allowedFormats" JSONB NOT NULL, revision INTEGER NOT NULL DEFAULT 1 CHECK(revision > 0), "requestKey" TEXT NOT NULL, "requestHash" TEXT NOT NULL);
CREATE UNIQUE INDEX "ActivityAdaptation_versionId_requestKey_key" ON "ActivityAdaptation"("versionId", "requestKey");
CREATE INDEX "ActivityAdaptation_versionId_idx" ON "ActivityAdaptation"("versionId");
CREATE TABLE "AdaptationRecipient" ("adaptationId" TEXT NOT NULL REFERENCES "ActivityAdaptation"(id) ON DELETE CASCADE ON UPDATE CASCADE, "userId" TEXT NOT NULL REFERENCES "User"(id) ON DELETE CASCADE ON UPDATE CASCADE, PRIMARY KEY("adaptationId", "userId"));
ALTER TABLE "Submission" ADD COLUMN audio BYTEA, ADD COLUMN "hasAudio" BOOLEAN NOT NULL DEFAULT false, ADD COLUMN "textFile" TEXT, ADD COLUMN "hasTextFile" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Submission" ADD CONSTRAINT "Submission_audio_size" CHECK ((audio IS NULL AND NOT "hasAudio") OR (audio IS NOT NULL AND "hasAudio" AND octet_length(audio) BETWEEN 46 AND 1048576));
ALTER TABLE "Submission" ADD CONSTRAINT "Submission_text_file_size" CHECK (("textFile" IS NULL AND NOT "hasTextFile") OR ("textFile" IS NOT NULL AND "hasTextFile" AND octet_length("textFile") <= 32768));
DO $$ DECLARE t TEXT; r TEXT; BEGIN
 FOREACH t IN ARRAY ARRAY['LearningNeeds','NeedsSharing','ActivityAdaptation','AdaptationRecipient'] LOOP
  EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY',t); EXECUTE format('REVOKE ALL ON TABLE %I FROM PUBLIC',t);
  FOREACH r IN ARRAY ARRAY['anon','authenticated'] LOOP
   IF EXISTS(SELECT 1 FROM pg_roles WHERE rolname=r) THEN EXECUTE format('REVOKE ALL ON TABLE %I FROM %I',t,r); END IF;
  END LOOP;
 END LOOP;
END $$;
COMMIT;
