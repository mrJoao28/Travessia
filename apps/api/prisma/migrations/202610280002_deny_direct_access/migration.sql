-- The API's server role must own these tables or have BYPASSRLS. API queries
-- still apply authorization explicitly; browser Supabase roles have no grants.
DO $$
DECLARE
  table_name text;
  browser_role text;
BEGIN
  FOREACH table_name IN ARRAY ARRAY['User','Session','Account','Verification','Profile',
    'ReadingPreferences','Classroom','Membership','Invitation','Mission','MissionVersion',
    'Step','Material','Submission','Feedback','BarrierReport','AiGeneration','RateBucket',
    'AuditEvent','DemoDataset']
  LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', table_name);
    EXECUTE format('REVOKE ALL ON TABLE %I FROM PUBLIC', table_name);
    FOREACH browser_role IN ARRAY ARRAY['anon','authenticated']
    LOOP
      IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = browser_role) THEN
        EXECUTE format('REVOKE ALL ON TABLE %I FROM %I', table_name, browser_role);
      END IF;
    END LOOP;
  END LOOP;
END $$;

ALTER TABLE "Step" ADD CONSTRAINT "step_position_positive" CHECK ("position" > 0);
ALTER TABLE "Submission" ADD CONSTRAINT "submission_revision_positive" CHECK ("revision" > 0);
