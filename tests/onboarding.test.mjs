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
assert.match(source, /communicationIdentity/);
assert.match(source, /phonePlan/);
assert.match(source, /emailPlan/);
assert.match(source, /paymentPlan/);
assert.match(source, /credentialPlan/);
assert.match(source, /knowledgeVaultPlan/);
assert.match(source, /observabilityPlan/);
assert.match(source, /ownerTakeoverPlan/);
assert.match(source, /spendingLimits/);
assert.match(source, /AgentPhone-style/);
assert.match(source, /AgentMail-style/);
assert.match(source, /AgentCard-style/);

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
assert.match(guardrail, /MinionMint mints bounded AI Minions through a guided blueprint process/);
assert.match(guardrail, /Do not implement it as a generic chatbot builder/);
assert.match(guardrail, /AgentPhone-style/);
assert.match(guardrail, /AgentMail-style/);
assert.match(guardrail, /AgentCard-style/);

const provisioning = readFileSync('apps/web/app/lib/provisioning.ts', 'utf8');
assert.match(provisioning, /MinionProvisioningProvider/);
assert.match(provisioning, /ORGO_API_KEY/);
assert.match(provisioning, /HERMES_TEMPLATE_REF/);
assert.match(provisioning, /CREDENTIAL_VAULT_PROVIDER/);
assert.match(provisioning, /StubMinionProvisioningProvider/);
assert.match(provisioning, /buildHermesConfigPreview/);

const provisioningRoute = readFileSync('apps/web/app/api/provisioning/route.ts', 'utf8');
assert.match(provisioningRoute, /getMinionProvisioningProvider/);
assert.match(provisioningRoute, /not_configured|409/);

const setupPage = readFileSync('apps/web/app/setup/page.tsx', 'utf8');
assert.match(setupPage, /Local demo mode/);
assert.match(setupPage, /Production Phase 1 mode/);
assert.match(setupPage, /Provisioning mode/);
assert.match(setupPage, /Do not paste provider keys/);

const readme = readFileSync('README.md', 'utf8');
assert.match(readme, /Phase 1 complete does not mean MinionMint can provision real Minions yet/);
assert.match(readme, /Local demo mode/);
assert.match(readme, /Production Phase 1 mode/);
assert.match(readme, /Provisioning mode/);
assert.match(readme, /Google OAuth enabled in Clerk/);
assert.match(readme, /Live Orgo\/Hermes API calls are intentionally not implemented yet/);

const deployment = readFileSync('docs/DEPLOYMENT.md', 'utf8');
assert.match(deployment, /not a real Orgo\/Hermes provisioning system yet/);
assert.match(deployment, /ORGO_API_KEY/);
assert.match(deployment, /HERMES_TEMPLATE_REF/);
assert.match(deployment, /CREDENTIAL_VAULT_PROVIDER/);

console.log('onboarding planner, provisioning bridge, model concierge boundary, blueprint review states, and doctrine guardrail are present.');
