BEGIN;
-- CreateTable
CREATE TABLE "MaterialSource" (
    "id" TEXT NOT NULL,
    "versionId" TEXT NOT NULL,
    "creatorId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "hash" TEXT NOT NULL,
    "requestKey" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'queued',
    "pageCount" INTEGER NOT NULL DEFAULT 0,
    "pages" JSONB NOT NULL DEFAULT '[]',
    "warnings" JSONB NOT NULL DEFAULT '[]',
    "startedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MaterialSource_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MaterialAdaptation" (
    "id" TEXT NOT NULL,
    "versionId" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "creatorId" TEXT NOT NULL,
    "requestKey" TEXT NOT NULL,
    "requestHash" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'queued',
    "settings" JSONB NOT NULL,
    "pages" JSONB NOT NULL,
    "document" JSONB NOT NULL DEFAULT '[]',
    "revision" INTEGER NOT NULL DEFAULT 1,
    "error" TEXT,
    "hasAudio" BOOLEAN NOT NULL DEFAULT false,
    "inputTokens" INTEGER,
    "outputTokens" INTEGER,
    "startedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MaterialAdaptation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MaterialSource_status_createdAt_idx" ON "MaterialSource"("status", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "MaterialSource_versionId_requestKey_key" ON "MaterialSource"("versionId", "requestKey");

-- CreateIndex
CREATE INDEX "MaterialAdaptation_status_createdAt_idx" ON "MaterialAdaptation"("status", "createdAt");

-- CreateIndex
CREATE INDEX "MaterialAdaptation_versionId_studentId_status_idx" ON "MaterialAdaptation"("versionId", "studentId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "MaterialAdaptation_versionId_requestKey_key" ON "MaterialAdaptation"("versionId", "requestKey");

-- AddForeignKey
ALTER TABLE "MaterialSource" ADD CONSTRAINT "MaterialSource_versionId_fkey" FOREIGN KEY ("versionId") REFERENCES "MissionVersion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaterialAdaptation" ADD CONSTRAINT "MaterialAdaptation_versionId_fkey" FOREIGN KEY ("versionId") REFERENCES "MissionVersion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaterialAdaptation" ADD CONSTRAINT "MaterialAdaptation_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "MaterialSource"("id") ON DELETE CASCADE ON UPDATE CASCADE;


ALTER TABLE "MaterialSource" ADD CONSTRAINT "MaterialSource_status_check" CHECK (status IN ('queued','extracting','ready','failed'));
ALTER TABLE "MaterialAdaptation" ADD CONSTRAINT "MaterialAdaptation_status_check" CHECK (status IN ('queued','generating','draft','rendering','ready','released','failed'));
DO $$ DECLARE t TEXT; r TEXT; BEGIN
 FOREACH t IN ARRAY ARRAY['MaterialSource','MaterialAdaptation'] LOOP
  EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY',t); EXECUTE format('REVOKE ALL ON TABLE %I FROM PUBLIC',t);
  FOREACH r IN ARRAY ARRAY['anon','authenticated'] LOOP
   IF EXISTS(SELECT 1 FROM pg_roles WHERE rolname=r) THEN EXECUTE format('REVOKE ALL ON TABLE %I FROM %I',t,r); END IF;
  END LOOP;
 END LOOP;
END $$;
COMMIT;
