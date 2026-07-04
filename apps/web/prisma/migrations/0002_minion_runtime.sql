-- Minion runtime records connect approved blueprints to provider-neutral workspace preparation.
CREATE TABLE IF NOT EXISTS "MinionRuntime" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "orgId" UUID NOT NULL REFERENCES "Organization"("id") ON DELETE CASCADE,
  "workspaceId" UUID NOT NULL REFERENCES "Workspace"("id") ON DELETE CASCADE,
  "ownerUserId" TEXT NOT NULL,
  "blueprintId" TEXT NOT NULL,
  "providerType" TEXT NOT NULL,
  "workspaceStatus" TEXT NOT NULL DEFAULT 'blueprint_ready',
  "hermesTemplateRef" TEXT,
  "credentialVaultRefs" JSONB NOT NULL DEFAULT '[]'::jsonb,
  "hermesConfigDraft" JSONB NOT NULL DEFAULT '{}'::jsonb,
  "logs" JSONB NOT NULL DEFAULT '[]'::jsonb,
  "launchUrl" TEXT,
  "nextMissingImplementationStep" TEXT NOT NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "MinionRuntime_orgId_updatedAt_idx" ON "MinionRuntime"("orgId", "updatedAt");
CREATE INDEX IF NOT EXISTS "MinionRuntime_workspaceId_idx" ON "MinionRuntime"("workspaceId");
CREATE INDEX IF NOT EXISTS "MinionRuntime_ownerUserId_idx" ON "MinionRuntime"("ownerUserId");

ALTER TABLE "MinionRuntime" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "minion_runtime_org_isolation" ON "MinionRuntime";
CREATE POLICY "minion_runtime_org_isolation" ON "MinionRuntime"
  USING ("orgId"::text = current_setting('app.current_org_id', true));
