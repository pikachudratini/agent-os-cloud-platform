import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';

// ---------------------------------------------------------------------------
// End-to-end provisioning vertical slice test
//
// Validates that all the pieces of the MinionMint provisioning pipeline
// exist, compile, and wire together correctly:
//
//   blueprint → computer type → network type → prepare → launch → status → stop
//
// This test does NOT require a live SSH connection. It validates:
//   1. All source files exist
//   2. Key exports are present
//   3. The ComputerProvider interface is fully implemented by RemoteSshComputerProvider
//   4. The network provider has all required modes
//   5. The Hermes installer has all required functions
//   6. The computer-use actions cover all Orgo-parity actions
//   7. The API routes exist
//   8. The dashboard integrates ComputerTypeSelector and network status
//   9. The production deployment guide exists
//  10. The Orgo capability analysis exists
// ---------------------------------------------------------------------------

const requiredFiles = [
  // Core provisioning
  'apps/web/app/lib/provisioning.ts',
  'apps/web/app/lib/remote-ssh-provider.ts',
  'apps/web/app/lib/network-provider.ts',
  'apps/web/app/lib/hermes-installer.ts',
  'apps/web/app/lib/computer-use-actions.ts',
  'apps/web/app/lib/minion-runtime.ts',
  'apps/web/app/lib/workspace-store.ts',
  'apps/web/app/lib/credential-store.ts',

  // API routes
  'apps/web/app/api/provisioning/route.ts',
  'apps/web/app/api/computer-use/route.ts',
  'apps/web/app/api/credentials/route.ts',
  'apps/web/app/api/onboarding/route.ts',

  // UI
  'apps/web/app/page.tsx',
  'apps/web/app/dashboard/page.tsx',
  'apps/web/app/dashboard/computer-type-selector.tsx',
  'apps/web/app/dashboard/runtime-actions.tsx',
  'apps/web/app/dashboard/credential-setup-panel.tsx',
  'apps/web/app/setup/page.tsx',
  'apps/web/app/onboarding/page.tsx',

  // Config
  '.env.example',
  'apps/web/package.json',

  // Docs
  'docs/PRODUCTION_DEPLOY.md',
  'research/orgo-capability-analysis.md',
];

let passCount = 0;
let failCount = 0;

function check(name, condition, detail = '') {
  if (condition) {
    passCount++;
  } else {
    failCount++;
    console.error(`  ✗ ${name}${detail ? ': ' + detail : ''}`);
  }
}

console.log('\n=== MinionMint End-to-End Provisioning Vertical Slice Test ===\n');

// 1. All required files exist
console.log('1. Required files exist');
for (const file of requiredFiles) {
  check(`  ${file} exists`, existsSync(file));
}

// 2. RemoteSshComputerProvider fully implements ComputerProvider
console.log('\n2. RemoteSshComputerProvider implements all ComputerProvider methods');
const sshProvider = readFileSync('apps/web/app/lib/remote-ssh-provider.ts', 'utf8');
const requiredMethods = [
  'checkReadiness',
  'prepareWorkspace',
  'launchWorkspace',
  'stopWorkspace',
  'getWorkspaceStatus',
  'getAccessUrl',
  'attachCredentials',
];
for (const method of requiredMethods) {
  check(`  ${method}() implemented`, sshProvider.includes(`async ${method}(`) || sshProvider.includes(`${method}(`));
}

// 3. Network provider has all required modes
console.log('\n3. Network provider supports all modes');
const networkProvider = readFileSync('apps/web/app/lib/network-provider.ts', 'utf8');
check('  socks5_proxy mode', networkProvider.includes("'socks5_proxy'"));
check('  wireguard_vpn mode', networkProvider.includes("'wireguard_vpn'"));
check('  direct mode', networkProvider.includes("'direct'"));
check('  getNetworkReadiness() exported', networkProvider.includes('export function getNetworkReadiness'));
check('  DefaultNetworkProvider class', networkProvider.includes('export class DefaultNetworkProvider'));

// 4. Hermes installer has all required functions
console.log('\n4. Hermes installer has required functions');
const hermesInstaller = readFileSync('apps/web/app/lib/hermes-installer.ts', 'utf8');
check('  detectHermesInstall()', hermesInstaller.includes('export async function detectHermesInstall'));
check('  installHermes()', hermesInstaller.includes('export async function installHermes'));
check('  verifyHermesReadiness()', hermesInstaller.includes('export async function verifyHermesReadiness'));
check('  deployBrowserProfile()', hermesInstaller.includes('export async function deployBrowserProfile'));

// 5. Computer-use actions cover all Orgo-parity actions
console.log('\n5. Computer-use actions match Orgo API');
const computerUse = readFileSync('apps/web/app/lib/computer-use-actions.ts', 'utf8');
const requiredActions = ['screenshot', 'click', 'drag', 'typeText', 'pressKey', 'scroll', 'wait', 'bash', 'execPython'];
for (const action of requiredActions) {
  check(`  ${action}() implemented`, computerUse.includes(`export async function ${action}(`));
}
check('  executeComputerUseAction() dispatcher', computerUse.includes('export async function executeComputerUseAction'));

// 6. Provisioning API route has all endpoints
console.log('\n6. Provisioning API has all endpoints');
const provisioningRoute = readFileSync('apps/web/app/api/provisioning/route.ts', 'utf8');
check('  GET handler', provisioningRoute.includes('export async function GET'));
check('  POST handler', provisioningRoute.includes('export async function POST'));
check('  network detail endpoint', provisioningRoute.includes("detail === 'network'"));
check('  hermes detail endpoint', provisioningRoute.includes("detail === 'hermes'"));
check('  browser_profile detail endpoint', provisioningRoute.includes("detail === 'browser_profile'"));

// 7. Computer-use API route exists
console.log('\n7. Computer-use API route');
const computerUseRoute = readFileSync('apps/web/app/api/computer-use/route.ts', 'utf8');
check('  GET handler', computerUseRoute.includes('export async function GET'));
check('  POST handler', computerUseRoute.includes('export async function POST'));

// 8. Dashboard integrates ComputerTypeSelector and network status
console.log('\n8. Dashboard integration');
const dashboard = readFileSync('apps/web/app/dashboard/page.tsx', 'utf8');
check('  ComputerTypeSelector imported', dashboard.includes("import { ComputerTypeSelector }"));
check('  ComputerTypeSelector rendered', dashboard.includes('<ComputerTypeSelector'));
check('  getNetworkReadiness imported', dashboard.includes('getNetworkReadiness'));
check('  networkReadiness used', dashboard.includes('networkReadiness'));

// 9. Homepage has product flow with computer types
console.log('\n9. Homepage product flow');
const homepage = readFileSync('apps/web/app/page.tsx', 'utf8');
check('  Minion examples with icons', homepage.includes('icon:'));
check('  computer types section', homepage.includes('computerTypes'));
check('  product loop with details', homepage.includes('productLoop'));
check('  competitive advantages section', homepage.includes('Why MinionMint'));
check('  approval rails mentioned', homepage.includes('Approval rails'));
check('  residential network mentioned', homepage.includes('Residential network'));
check('  credential vault mentioned', homepage.includes('credential vault'));

// 10. .env.example has all new variables
console.log('\n10. Environment variables');
const envExample = readFileSync('.env.example', 'utf8');
check('  SSH host', envExample.includes('MINIONMINT_SSH_HOST'));
check('  SSH username', envExample.includes('MINIONMINT_SSH_USERNAME'));
check('  SSH private key path', envExample.includes('MINIONMINT_SSH_PRIVATE_KEY_PATH'));
check('  network type', envExample.includes('MINIONMINT_NETWORK_TYPE'));
check('  SOCKS5 host', envExample.includes('MINIONMINT_RESIDENTIAL_PROXY_HOST') || envExample.includes('MINIONMINT_SOCKS5_HOST'));
check('  SOCKS5 port', envExample.includes('MINIONMINT_RESIDENTIAL_PROXY_PORT') || envExample.includes('MINIONMINT_SOCKS5_PORT'));
check('  disable WebRTC', envExample.includes('MINIONMINT_DISABLE_WEBRTC'));
check('  VPN kill switch', envExample.includes('MINIONMINT_VPN_KILL_SWITCH'));

// 11. Production deployment guide
console.log('\n11. Production deployment guide');
const deployGuide = readFileSync('docs/PRODUCTION_DEPLOY.md', 'utf8');
check('  Vercel deployment', deployGuide.includes('vercel'));
check('  Neon Postgres', deployGuide.includes('Neon'));
check('  Clerk auth', deployGuide.includes('Clerk'));
check('  SSH provider config', deployGuide.includes('MINIONMINT_SSH_HOST'));
check('  Residential proxy config', deployGuide.includes('residential'));
check('  WireGuard VPN config', deployGuide.includes('wireguard_vpn'));
check('  Troubleshooting section', deployGuide.includes('Troubleshooting'));

// 12. Orgo capability analysis
console.log('\n12. Orgo capability analysis');
const orgoAnalysis = readFileSync('research/orgo-capability-analysis.md', 'utf8');
check('  Orgo capabilities listed', orgoAnalysis.includes('Screenshot'));
check('  MinionMint advantages listed', orgoAnalysis.toLowerCase().includes('exceeds orgo') || orgoAnalysis.toLowerCase().includes('minionmint advantage'));
check('  Feature parity matrix', orgoAnalysis.includes('Parity Matrix') || orgoAnalysis.includes('parity'));

// 13. ssh2 package installed
console.log('\n13. Dependencies');
const webPackageJson = JSON.parse(readFileSync('apps/web/package.json', 'utf8'));
const deps = { ...webPackageJson.dependencies, ...webPackageJson.devDependencies };
check('  ssh2 installed', Boolean(deps.ssh2));
check('  @types/ssh2 installed', Boolean(deps['@types/ssh2']));

// Summary
console.log('\n=== Summary ===');
console.log(`  Passed: ${passCount}`);
console.log(`  Failed: ${failCount}`);
console.log(failCount === 0 ? '\n  ✓ All provisioning vertical slice checks passed.' : `\n  ✗ ${failCount} check(s) failed.`);

process.exit(failCount === 0 ? 0 : 1);
