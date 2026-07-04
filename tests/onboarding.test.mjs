import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync('apps/web/app/lib/onboarding.ts', 'utf8');
assert.match(source, /Minion Blueprint/);
assert.match(source, /gpt-4o-mini/);
assert.match(source, /drafts_require_approval/);
assert.match(source, /approvalBoundaries/);
assert.match(source, /workstationPlan/);
assert.match(source, /firstWeekWin/);
console.log('onboarding planner source includes Minion Blueprint doctrine, MVP model, approval rails, workstation plan, and first-week win.');
