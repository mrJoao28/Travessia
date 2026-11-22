-- AlterTable
ALTER TABLE "Classroom" ADD COLUMN "ownerId" TEXT;
ALTER TABLE "Classroom" ADD COLUMN "archivedAt" TIMESTAMP(3);

-- Backfill determinístico e sem perda de dados:
-- 1) vínculo teacher ativo mais antigo; 2) qualquer vínculo ativo mais antigo;
-- 3) qualquer vínculo mais antigo; 4) usuário mais antigo (turmas órfãs legadas).
UPDATE "Classroom" AS c
SET "ownerId" = COALESCE(
    (SELECT m."userId" FROM "Membership" AS m
     WHERE m."classroomId" = c."id" AND m."role" = 'teacher' AND m."active" = true
     ORDER BY m."id" ASC LIMIT 1),
    (SELECT m."userId" FROM "Membership" AS m
     WHERE m."classroomId" = c."id" AND m."active" = true
     ORDER BY m."id" ASC LIMIT 1),
    (SELECT m."userId" FROM "Membership" AS m
     WHERE m."classroomId" = c."id"
     ORDER BY m."id" ASC LIMIT 1),
    (SELECT u."id" FROM "User" AS u ORDER BY u."id" ASC LIMIT 1)
);

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM "Classroom" WHERE "ownerId" IS NULL) THEN
        RAISE EXCEPTION 'Não foi possível atribuir ownerId a uma turma sem usuários no banco';
    END IF;
END $$;

ALTER TABLE "Classroom" ALTER COLUMN "ownerId" SET NOT NULL;

-- AddForeignKey
ALTER TABLE "Classroom" ADD CONSTRAINT "Classroom_ownerId_fkey"
    FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- CreateIndex
CREATE INDEX "Classroom_ownerId_archivedAt_idx" ON "Classroom"("ownerId", "archivedAt");
