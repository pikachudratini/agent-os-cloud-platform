import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync('apps/web/app/lib/onboarding.ts', 'utf8');
assert.match(source, /Minion Blueprint/);
assert.match(source, /gpt-4o-mini/);
assert.match(source, /drafts_require_approval/);
assert.match(source, /approvalBoundaries/);
assert.match(source, /workstationPlan/);
assert.match(source, /firstWeekWin/);
assert.match(source, /ownerReviewState/);
assert.match(source, /blueprint_approved/);
assert.match(source, /connectedToolsNeeded/);
assert.match(source, /approvalQueue/);

const ui = readFileSync('apps/web/app/onboarding/ui.tsx', 'utf8');
assert.match(ui, /Refine with concierge/);
assert.match(ui, /Approve blueprint/);
assert.match(ui, /Owner review note/);

const concierge = readFileSync('apps/web/app/lib/concierge.ts', 'utf8');
assert.match(concierge, /OPENAI_API_KEY/);
assert.match(concierge, /chat\/completions/);
assert.match(source, /deterministic_fallback/);
assert.match(concierge, /Do not behave like a generic chatbot builder/);

const guardrail = readFileSync('AGENTS.md', 'utf8');
assert.match(guardrail, /MinionMint mints bounded AI workers through a guided blueprint process/);
assert.match(guardrail, /Do not implement it as a generic chatbot builder/);

console.log('onboarding planner, model concierge boundary, blueprint review states, and doctrine guardrail are present.');
