ALTER TYPE "Role" ADD VALUE 'monitor';

ALTER TABLE "Invitation" ADD COLUMN "role" "Role" NOT NULL DEFAULT 'student';
