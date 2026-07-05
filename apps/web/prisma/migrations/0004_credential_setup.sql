CREATE TABLE IF NOT EXISTS "CredentialSetup" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "orgId" uuid NOT NULL REFERENCES "Organization"("id") ON DELETE CASCADE,
  "workspaceId" uuid NOT NULL REFERENCES "Workspace"("id") ON DELETE CASCADE,
  "ownerUserId" text NOT NULL,
  "minionId" text NOT NULL,
  "displayName" text NOT NULL,
  "vaultProvider" text,
  "credentialRefs" jsonb NOT NULL DEFAULT '[]'::jsonb,
  "encrypted" boolean NOT NULL DEFAULT false,
  "readiness" text NOT NULL DEFAULT 'missing',
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  "updatedAt" timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "CredentialSetup_orgId_updatedAt_idx" ON "CredentialSetup" ("orgId", "updatedAt");
CREATE INDEX IF NOT EXISTS "CredentialSetup_workspaceId_idx" ON "CredentialSetup" ("workspaceId");
CREATE INDEX IF NOT EXISTS "CredentialSetup_ownerUserId_idx" ON "CredentialSetup" ("ownerUserId");
CREATE UNIQUE INDEX IF NOT EXISTS "CredentialSetup_orgId_minionId_key" ON "CredentialSetup" ("orgId", "minionId");

ALTER TABLE "CredentialSetup" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS credential_setup_org_isolation ON "CredentialSetup";
CREATE POLICY credential_setup_org_isolation ON "CredentialSetup"
  USING ("orgId"::text = current_setting('app.current_org_id', true));
