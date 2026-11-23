ALTER TABLE "MaterialAdaptation"
ADD COLUMN "groupId" TEXT;

ALTER TABLE "MaterialAdaptation"
ADD CONSTRAINT "MaterialAdaptation_groupId_fkey"
FOREIGN KEY ("groupId") REFERENCES "MissionGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE INDEX "MaterialAdaptation_versionId_groupId_status_idx"
ON "MaterialAdaptation"("versionId", "groupId", "status");
