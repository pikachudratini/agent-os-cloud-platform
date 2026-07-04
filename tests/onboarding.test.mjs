import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const filesThatMustNotNameRemovedProvider = [
  'AGENTS.md',
  'README.md',
  'docs/PRODUCT.md',
  'docs/DEPLOYMENT.md',
  'apps/web/app/lib/provisioning.ts',
  'apps/web/app/lib/onboarding.ts',
  'apps/web/app/lib/concierge.ts',
  'apps/web/app/setup/page.tsx',
  'apps/web/app/dashboard/page.tsx',
];

const removedProviderPattern = new RegExp(`${['O', 'rgo'].join('')}|${['o', 'rgo'].join('')}|${['OR', 'GO'].join('')}`);

for (const file of filesThatMustNotNameRemovedProvider) {
  const content = readFileSync(file, 'utf8');
  assert.doesNotMatch(content, removedProviderPattern, `${file} should not mention removed provider branding`);
}

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
assert.match(source, /cloud-computer-style workspace/);

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
assert.match(provisioning, /ComputerProvider/);
assert.match(provisioning, /WorkspaceProvider/);
assert.match(provisioning, /HermesTemplateProvider/);
assert.match(provisioning, /CredentialVaultProvider/);
assert.match(provisioning, /MinionRuntimeProvider/);
assert.match(provisioning, /MINIONMINT_COMPUTER_PROVIDER/);
assert.match(provisioning, /MINIONMINT_HERMES_TEMPLATE_REF/);
assert.match(provisioning, /MINIONMINT_CREDENTIAL_VAULT_PROVIDER/);
assert.match(provisioning, /self_hosted/);
assert.match(provisioning, /E2B_API_KEY/);
assert.match(provisioning, /BROWSERBASE_API_KEY/);
assert.match(provisioning, /SCRAPYBARA_API_KEY/);
assert.match(provisioning, /buildHermesConfigPreview/);
assert.match(provisioning, /renderHermesConfig/);
assert.doesNotMatch(provisioning, /const requiredProvisioningEnv/);

const provisioningRoute = readFileSync('apps/web/app/api/provisioning/route.ts', 'utf8');
assert.match(provisioningRoute, /getMinionProvisioningProvider/);
assert.match(provisioningRoute, /not_configured|409/);

const setupPage = readFileSync('apps/web/app/setup/page.tsx', 'utf8');
assert.match(setupPage, /Local demo mode/);
assert.match(setupPage, /Production Phase 1 mode/);
assert.match(setupPage, /Provisioning mode/);
assert.match(setupPage, /Computer provider/);
assert.match(setupPage, /E2B_API_KEY:<\/strong> required only when/);
assert.match(setupPage, /Do not paste provider keys/);
assert.match(setupPage, /no single managed provider is required/);

const dashboard = readFileSync('apps/web/app/dashboard/page.tsx', 'utf8');
assert.match(dashboard, /Computer provider/);
assert.match(dashboard, /No single managed provider is mandatory/);

const readme = readFileSync('README.md', 'utf8');
assert.match(readme, /Phase 1 complete does not mean MinionMint can provision real Minions yet/);
assert.match(readme, /MinionMint is provider-neutral/);
assert.match(readme, /Local demo mode/);
assert.match(readme, /Production Phase 1 mode/);
assert.match(readme, /Provisioning mode/);
assert.match(readme, /Google OAuth enabled in Clerk/);
assert.match(readme, /E2B_API_KEY` only when `MINIONMINT_COMPUTER_PROVIDER=e2b/);
assert.match(readme, /no single managed provider is required/);

const deployment = readFileSync('docs/DEPLOYMENT.md', 'utf8');
assert.match(deployment, /provider-neutral provisioning system/);
assert.match(deployment, /Cloud-computer providers are adapters behind MinionMint/);
assert.match(deployment, /ComputerProvider/);
assert.match(deployment, /WorkspaceProvider/);
assert.match(deployment, /E2B_API_KEY=.*only when MINIONMINT_COMPUTER_PROVIDER=e2b/);
assert.match(deployment, /Owned or self-hosted provider requirements/);

console.log('onboarding planner, provider-neutral provisioning bridge, model concierge boundary, blueprint review states, no removed provider branding, and doctrine guardrail are present.');
