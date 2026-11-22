CREATE TABLE "GradePeriod" (
  "id" TEXT NOT NULL,
  "classroomId" TEXT NOT NULL,
  "name" VARCHAR(150) NOT NULL,
  "startsAt" TIMESTAMP(3),
  "endsAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "GradePeriod_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "GradePeriod_classroomId_name_key" ON "GradePeriod"("classroomId", "name");
CREATE INDEX "GradePeriod_classroomId_createdAt_idx" ON "GradePeriod"("classroomId", "createdAt");
ALTER TABLE "GradePeriod" ADD CONSTRAINT "GradePeriod_classroomId_fkey" FOREIGN KEY ("classroomId") REFERENCES "Classroom"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "GradeAssessment" (
  "id" TEXT NOT NULL,
  "periodId" TEXT NOT NULL,
  "missionId" TEXT NOT NULL,
  "weight" INTEGER NOT NULL DEFAULT 1,
  CONSTRAINT "GradeAssessment_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "GradeAssessment_periodId_missionId_key" ON "GradeAssessment"("periodId", "missionId");
CREATE INDEX "GradeAssessment_missionId_idx" ON "GradeAssessment"("missionId");
ALTER TABLE "GradeAssessment" ADD CONSTRAINT "GradeAssessment_periodId_fkey" FOREIGN KEY ("periodId") REFERENCES "GradePeriod"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "GradeAssessment" ADD CONSTRAINT "GradeAssessment_missionId_fkey" FOREIGN KEY ("missionId") REFERENCES "Mission"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "GradeAssessment" ADD CONSTRAINT "GradeAssessment_weight_check" CHECK ("weight" > 0 AND "weight" <= 100);
