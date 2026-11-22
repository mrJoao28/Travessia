ALTER TABLE "Classroom" ADD COLUMN "shift" VARCHAR(50);
ALTER TABLE "StudentProfile" ADD COLUMN "preferredWorkMode" TEXT NOT NULL DEFAULT 'individual';

CREATE TABLE "ClassroomTeam" (
  "id" TEXT NOT NULL,
  "classroomId" TEXT NOT NULL,
  "name" VARCHAR(150) NOT NULL,
  "leaderId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ClassroomTeam_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "ClassroomTeamMember" (
  "teamId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  CONSTRAINT "ClassroomTeamMember_pkey" PRIMARY KEY ("teamId", "userId")
);
CREATE UNIQUE INDEX "ClassroomTeam_classroomId_name_key" ON "ClassroomTeam"("classroomId", "name");
CREATE INDEX "ClassroomTeam_classroomId_idx" ON "ClassroomTeam"("classroomId");
CREATE INDEX "ClassroomTeam_leaderId_idx" ON "ClassroomTeam"("leaderId");
CREATE INDEX "ClassroomTeamMember_userId_idx" ON "ClassroomTeamMember"("userId");
ALTER TABLE "ClassroomTeam" ADD CONSTRAINT "ClassroomTeam_classroomId_fkey" FOREIGN KEY ("classroomId") REFERENCES "Classroom"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ClassroomTeam" ADD CONSTRAINT "ClassroomTeam_leaderId_fkey" FOREIGN KEY ("leaderId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ClassroomTeamMember" ADD CONSTRAINT "ClassroomTeamMember_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "ClassroomTeam"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ClassroomTeamMember" ADD CONSTRAINT "ClassroomTeamMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
