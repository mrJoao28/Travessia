BEGIN;
ALTER TABLE "StrategyItem" ADD COLUMN "audio" BYTEA, ADD COLUMN "hasAudio" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "StrategyItem" ADD CONSTRAINT "StrategyItem_audio_size" CHECK (("audio" IS NULL AND NOT "hasAudio") OR ("audio" IS NOT NULL AND "hasAudio" AND octet_length("audio") BETWEEN 46 AND 1048576));
ALTER TABLE "AiGeneration" ADD COLUMN "supportDraft" JSONB;
COMMIT;
