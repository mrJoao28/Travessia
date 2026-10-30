-- Move the existing course before removing its old column. Identities,
-- credentials, sessions, classroom memberships and student work are unchanged.
BEGIN;
CREATE TABLE "StudentProfile" (
  "userId" TEXT NOT NULL,
  "registration" VARCHAR(50),
  "institution" VARCHAR(80),
  "unit" VARCHAR(150),
  "course" TEXT,
  "period" VARCHAR(50),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "StudentProfile_pkey" PRIMARY KEY ("userId"),
  CONSTRAINT "StudentProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE TABLE "TeacherProfile" (
  "userId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "TeacherProfile_pkey" PRIMARY KEY ("userId"),
  CONSTRAINT "TeacherProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE TABLE "TeachingAssignment" (
  "id" TEXT NOT NULL,
  "teacherId" TEXT NOT NULL,
  "subject" VARCHAR(150) NOT NULL,
  "course" VARCHAR(150) NOT NULL,
  "position" INTEGER NOT NULL,
  CONSTRAINT "TeachingAssignment_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "TeachingAssignment_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "TeacherProfile"("userId") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "teaching_position_nonnegative" CHECK ("position" >= 0)
);
CREATE UNIQUE INDEX "TeachingAssignment_teacherId_subject_course_key" ON "TeachingAssignment"("teacherId", "subject", "course");
CREATE UNIQUE INDEX "TeachingAssignment_teacherId_position_key" ON "TeachingAssignment"("teacherId", "position");

INSERT INTO "StudentProfile" ("userId", "course") SELECT "userId", "course" FROM "Profile";
INSERT INTO "StudentProfile" ("userId") SELECT DISTINCT "userId" FROM "Membership" WHERE "role" = 'student' AND "active" = true ON CONFLICT DO NOTHING;
INSERT INTO "TeacherProfile" ("userId") SELECT DISTINCT "userId" FROM "Membership" WHERE "role" = 'teacher' AND "active" = true ON CONFLICT DO NOTHING;
ALTER TABLE "Profile" ADD COLUMN "phone" VARCHAR(30), ADD COLUMN "alternateEmail" VARCHAR(150);
ALTER TABLE "Profile" DROP COLUMN "course";

-- Match the existing private-table policy, including installations with browser roles.
DO $$
DECLARE table_name text; browser_role text;
BEGIN
  FOREACH table_name IN ARRAY ARRAY['StudentProfile','TeacherProfile','TeachingAssignment'] LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', table_name);
    EXECUTE format('REVOKE ALL ON TABLE %I FROM PUBLIC', table_name);
    FOREACH browser_role IN ARRAY ARRAY['anon','authenticated'] LOOP
      IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = browser_role) THEN
        EXECUTE format('REVOKE ALL ON TABLE %I FROM %I', table_name, browser_role);
      END IF;
    END LOOP;
  END LOOP;
END $$;
COMMIT;
