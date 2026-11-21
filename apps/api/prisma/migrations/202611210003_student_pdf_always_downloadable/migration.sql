UPDATE "MaterialSource" SET "downloadAllowed" = TRUE WHERE "downloadAllowed" = FALSE;

ALTER TABLE "MaterialSource"
ALTER COLUMN "downloadAllowed" SET DEFAULT TRUE;
