-- ============================================================
-- 030_pipelines_per_user.sql
--
-- Makes pipelines and deals user-scoped (per-agent) instead of
-- account-scoped. Each agent will see only their own pipelines
-- and deals.
-- ============================================================

-- ---- pipelines -------------------------------------------------
-- Allow users to manage their own pipelines (user_id = auth.uid())
-- and members can still view (but maybe that's not needed, let's
-- make it per-user)
DROP POLICY IF EXISTS pipelines_select ON pipelines;
DROP POLICY IF EXISTS pipelines_insert ON pipelines;
DROP POLICY IF EXISTS pipelines_update ON pipelines;
DROP POLICY IF EXISTS pipelines_delete ON pipelines;

CREATE POLICY pipelines_select ON pipelines FOR SELECT
  USING (auth.uid() = user_id);
CREATE POLICY pipelines_insert ON pipelines FOR INSERT
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY pipelines_update ON pipelines FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY pipelines_delete ON pipelines FOR DELETE
  USING (auth.uid() = user_id);

-- ---- pipeline_stages -------------------------------------------
DROP POLICY IF EXISTS pipeline_stages_select ON pipeline_stages;
DROP POLICY IF EXISTS pipeline_stages_modify ON pipeline_stages;

CREATE POLICY pipeline_stages_select ON pipeline_stages FOR SELECT
  USING (EXISTS (SELECT 1 FROM pipelines p WHERE p.id = pipeline_stages.pipeline_id AND p.user_id = auth.uid()));
CREATE POLICY pipeline_stages_modify ON pipeline_stages FOR ALL
  USING (EXISTS (SELECT 1 FROM pipelines p WHERE p.id = pipeline_stages.pipeline_id AND p.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM pipelines p WHERE p.id = pipeline_stages.pipeline_id AND p.user_id = auth.uid()));

-- ---- deals ------------------------------------------------------
DROP POLICY IF EXISTS deals_select ON deals;
DROP POLICY IF EXISTS deals_insert ON deals;
DROP POLICY IF EXISTS deals_update ON deals;
DROP POLICY IF EXISTS deals_delete ON deals;

CREATE POLICY deals_select ON deals FOR SELECT
  USING (auth.uid() = user_id);
CREATE POLICY deals_insert ON deals FOR INSERT
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY deals_update ON deals FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY deals_delete ON deals FOR DELETE
  USING (auth.uid() = user_id);

-- Also, let's update the pipeline creation permission in the UI:
-- we need to allow agents to create pipelines, not just admins!
