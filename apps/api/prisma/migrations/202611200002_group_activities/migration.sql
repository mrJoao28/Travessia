ALTER TABLE "MissionVersion" ADD COLUMN "workMode" TEXT NOT NULL DEFAULT 'individual';
ALTER TABLE "MissionVersion" ADD CONSTRAINT "MissionVersion_workMode_check" CHECK ("workMode" IN ('individual', 'group'));
CREATE TABLE "MissionGroup" (
  "id" TEXT NOT NULL,
  "missionId" TEXT NOT NULL,
  "name" VARCHAR(150) NOT NULL,
  CONSTRAINT "MissionGroup_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "MissionGroup_missionId_name_key" ON "MissionGroup"("missionId", "name");
ALTER TABLE "MissionGroup" ADD CONSTRAINT "MissionGroup_missionId_fkey" FOREIGN KEY ("missionId") REFERENCES "Mission"("id") ON DELETE CASCADE ON UPDATE CASCADE;
CREATE TABLE "MissionGroupMember" (
  "groupId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  CONSTRAINT "MissionGroupMember_pkey" PRIMARY KEY ("groupId", "userId")
);
CREATE INDEX "MissionGroupMember_userId_idx" ON "MissionGroupMember"("userId");
ALTER TABLE "MissionGroupMember" ADD CONSTRAINT "MissionGroupMember_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "MissionGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MissionGroupMember" ADD CONSTRAINT "MissionGroupMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Submission" ADD COLUMN "groupId" TEXT;
CREATE UNIQUE INDEX "Submission_versionId_groupId_attempt_key" ON "Submission"("versionId", "groupId", "attempt");
ALTER TABLE "Submission" ADD CONSTRAINT "Submission_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "MissionGroup"("id") ON DELETE SET NULL ON UPDATE CASCADE;
