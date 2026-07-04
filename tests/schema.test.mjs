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
console.log('postgres schema and RLS plan include required Phase 1 tenant models.');
