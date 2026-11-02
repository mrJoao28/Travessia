BEGIN;
-- Existing invitations remain single-use and keep their original hashes.
ALTER TABLE "Invitation" ADD COLUMN "codeHash" TEXT, ADD COLUMN "reusable" BOOLEAN NOT NULL DEFAULT false;
CREATE UNIQUE INDEX "Invitation_codeHash_key" ON "Invitation"("codeHash");
COMMIT;
