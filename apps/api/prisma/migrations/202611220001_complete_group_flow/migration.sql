ALTER TABLE "MissionVersion" DROP CONSTRAINT IF EXISTS "MissionVersion_workMode_check";
ALTER TABLE "MissionVersion" ADD CONSTRAINT "MissionVersion_workMode_check" CHECK ("workMode" IN ('individual', 'group', 'mixed'));

ALTER TABLE "MissionGroup" ADD COLUMN "leaderId" TEXT;
CREATE INDEX "MissionGroup_leaderId_idx" ON "MissionGroup"("leaderId");
ALTER TABLE "MissionGroup" ADD CONSTRAINT "MissionGroup_leaderId_fkey" FOREIGN KEY ("leaderId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "MissionParticipation" (
  "id" TEXT NOT NULL,
  "missionId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "mode" TEXT NOT NULL DEFAULT 'group',
  "groupId" TEXT,
  "reason" VARCHAR(500),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "MissionParticipation_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "MissionParticipation_missionId_userId_key" ON "MissionParticipation"("missionId", "userId");
CREATE INDEX "MissionParticipation_missionId_mode_idx" ON "MissionParticipation"("missionId", "mode");
CREATE INDEX "MissionParticipation_groupId_idx" ON "MissionParticipation"("groupId");
ALTER TABLE "MissionParticipation" ADD CONSTRAINT "MissionParticipation_missionId_fkey" FOREIGN KEY ("missionId") REFERENCES "Mission"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MissionParticipation" ADD CONSTRAINT "MissionParticipation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MissionParticipation" ADD CONSTRAINT "MissionParticipation_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "MissionGroup"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "MissionParticipation" ADD CONSTRAINT "MissionParticipation_mode_check" CHECK ("mode" IN ('group', 'individual'));

INSERT INTO "MissionParticipation" ("id", "missionId", "userId", "groupId", "mode", "createdAt", "updatedAt")
SELECT md5(random()::text || clock_timestamp()::text || gm."groupId" || gm."userId"), g."missionId", gm."userId", gm."groupId", 'group', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "MissionGroupMember" gm
JOIN "MissionGroup" g ON g."id" = gm."groupId"
ON CONFLICT ("missionId", "userId") DO NOTHING;
