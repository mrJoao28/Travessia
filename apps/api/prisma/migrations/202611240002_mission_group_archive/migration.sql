ALTER TABLE "MissionGroup"
  ADD COLUMN "archivedAt" TIMESTAMP(3);

CREATE INDEX "MissionGroup_missionId_archivedAt_idx"
  ON "MissionGroup"("missionId", "archivedAt");

DROP INDEX "MissionGroup_missionId_name_key";

CREATE UNIQUE INDEX "MissionGroup_missionId_name_active_key"
  ON "MissionGroup"("missionId", "name")
  WHERE "archivedAt" IS NULL;

CREATE INDEX "MissionGroup_missionId_name_idx"
  ON "MissionGroup"("missionId", "name");
