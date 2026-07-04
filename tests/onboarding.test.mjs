import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync('apps/web/app/lib/onboarding.ts', 'utf8');
assert.match(source, /gpt-4o-mini/);
assert.match(source, /drafts_require_approval/);
assert.match(source, /Require human approval/);
assert.match(source, /Owner-provided onboarding answers/);
console.log('onboarding planner source includes MVP model, approval gate, and saved knowledge source behavior.');
