import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const schema = readFileSync('apps/web/prisma/schema.prisma', 'utf8');
for (const model of ['Organization', 'User', 'Membership', 'Workspace', 'AuditLog', 'UsageEvent']) {
  assert.match(schema, new RegExp(`model ${model}`));
}
assert.match(schema, /provider = "postgresql"/);
assert.match(schema, /clerkUserId/);
assert.match(schema, /onboardingState/);
const rls = readFileSync('apps/web/prisma/migrations/0001_rls_plan.sql', 'utf8');
assert.match(rls, /ENABLE ROW LEVEL SECURITY/);
assert.match(rls, /app.current_org_id/);

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
