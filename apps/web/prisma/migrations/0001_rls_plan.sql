-- Phase 1 managed Postgres RLS plan.
-- Apply after Prisma creates the baseline tables in managed Postgres.
-- Prisma does not manage PostgreSQL row-level security policies directly, so these policies live as SQL.

ALTER TABLE "Organization" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Membership" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Workspace" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AuditLog" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "UsageEvent" ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_workspace_isolation ON "Workspace"
  USING ("orgId"::text = current_setting('app.current_org_id', true));

CREATE POLICY tenant_audit_log_isolation ON "AuditLog"
  USING ("orgId"::text = current_setting('app.current_org_id', true));

CREATE POLICY tenant_usage_event_isolation ON "UsageEvent"
  USING ("orgId"::text = current_setting('app.current_org_id', true));
