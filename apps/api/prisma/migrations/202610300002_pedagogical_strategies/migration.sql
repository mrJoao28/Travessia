BEGIN;
CREATE TABLE "StrategyPlan" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "versionId" TEXT NOT NULL REFERENCES "MissionVersion"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "stepId" TEXT REFERENCES "Step"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "audience" TEXT NOT NULL CHECK ("audience" IN ('classroom', 'students')),
  "revision" INTEGER NOT NULL DEFAULT 1 CHECK ("revision" > 0),
  "requestKey" TEXT NOT NULL,
  "requestHash" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL
);
CREATE UNIQUE INDEX "StrategyPlan_versionId_requestKey_key" ON "StrategyPlan"("versionId", "requestKey");
CREATE INDEX "StrategyPlan_versionId_stepId_idx" ON "StrategyPlan"("versionId", "stepId");
CREATE TABLE "StrategyItem" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "planId" TEXT NOT NULL REFERENCES "StrategyPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "strategyId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "content" TEXT NOT NULL,
  "position" INTEGER NOT NULL CHECK ("position" >= 0)
);
CREATE UNIQUE INDEX "StrategyItem_planId_strategyId_key" ON "StrategyItem"("planId", "strategyId");
CREATE UNIQUE INDEX "StrategyItem_planId_position_key" ON "StrategyItem"("planId", "position");
CREATE TABLE "StrategyRecipient" (
  "planId" TEXT NOT NULL REFERENCES "StrategyPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "userId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  PRIMARY KEY ("planId", "userId")
);
CREATE INDEX "StrategyRecipient_userId_idx" ON "StrategyRecipient"("userId");
DO $$
DECLARE table_name text; browser_role text;
BEGIN
  FOREACH table_name IN ARRAY ARRAY['StrategyPlan','StrategyItem','StrategyRecipient'] LOOP
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
