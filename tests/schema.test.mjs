import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const schema = readFileSync('apps/web/prisma/schema.prisma', 'utf8');
for (const model of ['Organization', 'User', 'Membership', 'Workspace', 'AuditLog', 'MinionRuntime', 'CredentialSetup', 'UsageEvent']) {
  assert.match(schema, new RegExp(`model ${model}`));
}
assert.match(schema, /provider = "postgresql"/);
assert.match(schema, /clerkUserId/);
assert.match(schema, /onboardingState/);
assert.match(schema, /credentialVaultRefs/);
assert.match(schema, /hermesConfigDraft/);
assert.match(schema, /nextMissingImplementationStep/);
for (const field of ['minionId', 'blueprintName', 'workspaceRoot', 'hermesProfilePath', 'hermesConfigPath', 'credentialVaultPath', 'supervisorPath', 'logPath', 'processSupervisor']) {
  assert.match(schema, new RegExp(field), `MinionRuntime schema must include ${field}`);
}
assert.match(schema, /@@unique\(\[orgId, minionId\]\)/, 'MinionRuntime lookup should be unique inside an org');
const rls = readFileSync('apps/web/prisma/migrations/0001_rls_plan.sql', 'utf8');
assert.match(rls, /ENABLE ROW LEVEL SECURITY/);
assert.match(rls, /app.current_org_id/);
const runtimeMigration = readFileSync('apps/web/prisma/migrations/0002_minion_runtime.sql', 'utf8');
assert.match(runtimeMigration, /CREATE TABLE IF NOT EXISTS "MinionRuntime"/);
assert.match(runtimeMigration, /ENABLE ROW LEVEL SECURITY/);
assert.match(runtimeMigration, /minion_runtime_org_isolation/);
const runtimePersistenceMigration = readFileSync('apps/web/prisma/migrations/0003_minion_runtime_persistence.sql', 'utf8');
assert.match(runtimePersistenceMigration, /ADD COLUMN IF NOT EXISTS "minionId"/);
assert.match(runtimePersistenceMigration, /ADD COLUMN IF NOT EXISTS "processSupervisor"/);
assert.match(runtimePersistenceMigration, /MinionRuntime_orgId_minionId_key/);
const credentialSetupMigration = readFileSync('apps/web/prisma/migrations/0004_credential_setup.sql', 'utf8');
assert.match(credentialSetupMigration, /CREATE TABLE IF NOT EXISTS "CredentialSetup"/);
assert.match(credentialSetupMigration, /"credentialRefs" jsonb NOT NULL DEFAULT '\[\]'::jsonb/);
assert.match(credentialSetupMigration, /"credentialType" text NOT NULL DEFAULT 'custom_ref'/);
assert.match(credentialSetupMigration, /"allowedUse" text NOT NULL DEFAULT ''/);
assert.match(credentialSetupMigration, /"redactedValue" text NOT NULL DEFAULT '••••'/);
assert.match(credentialSetupMigration, /"secretCiphertext" text/);
assert.match(credentialSetupMigration, /"valueFingerprint" text/);
assert.match(credentialSetupMigration, /"encrypted" boolean NOT NULL DEFAULT false/);
assert.match(credentialSetupMigration, /CredentialSetup_orgId_minionId_key/);
assert.match(credentialSetupMigration, /credential_setup_org_isolation/);
const credentialSetupMetadataMigration = readFileSync('apps/web/prisma/migrations/0005_credential_setup_metadata.sql', 'utf8');
assert.match(credentialSetupMetadataMigration, /ADD COLUMN IF NOT EXISTS "credentialType"/);
assert.match(credentialSetupMetadataMigration, /ADD COLUMN IF NOT EXISTS "secretCiphertext"/);
assert.match(schema, /credentialSetups CredentialSetup\[\]/);
assert.match(schema, /@@unique\(\[orgId, minionId\]\)/, 'CredentialSetup lookup should be unique inside an org');

const store = readFileSync('apps/web/app/lib/workspace-store.ts', 'utf8');
assert.match(store, /DATABASE_URL/);
assert.match(store, /MINIONMINT_FORCE_LOCAL_STORE/);
assert.match(store, /new PrismaClient/);
assert.match(store, /local_fallback/);
assert.match(store, /auditLog.create/);
assert.match(store, /usageEvent.create/);

const currentUser = readFileSync('apps/web/app/lib/current-user.ts', 'utf8');
assert.match(currentUser, /currentUser/);
assert.match(currentUser, /local-demo-user/);
assert.match(currentUser, /Authentication required/);

console.log('postgres schema, RLS plan, Clerk identity boundary, Prisma adapter, and local fallback are present.');
