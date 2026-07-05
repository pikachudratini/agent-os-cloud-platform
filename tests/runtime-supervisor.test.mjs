import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const supervisor = readFileSync('apps/web/app/lib/runtime-supervisor.ts', 'utf8');
const runtime = readFileSync('apps/web/app/lib/minion-runtime.ts', 'utf8');
const route = readFileSync('apps/web/app/minions/[minionId]/page.tsx', 'utf8');
const runtimeStore = readFileSync('apps/web/app/lib/runtime-store.ts', 'utf8');
const credentialStore = readFileSync('apps/web/app/lib/credential-store.ts', 'utf8');
const credentialsRoute = readFileSync('apps/web/app/api/credentials/route.ts', 'utf8');
const credentialPanel = readFileSync('apps/web/app/dashboard/credential-setup-panel.tsx', 'utf8');

assert.match(supervisor, /from 'node:child_process'/, 'supervisor must use Node child_process');
assert.match(supervisor, /spawn\(/, 'launch must spawn a real process');
assert.match(supervisor, /shell:\s*false/, 'launch must not use a shell command string');
assert.match(supervisor, /MINIONMINT_SELF_HOSTED_EXECUTABLE/, 'launch executable must be configured structurally');
assert.match(supervisor, /MINIONMINT_SELF_HOSTED_ARGS_JSON/, 'launch args must be configured as JSON argv');
assert.match(supervisor, /\{profile\}|\{config\}|\{workspace\}|\{minionId\}/, 'launch must support only explicit placeholders');
assert.match(supervisor, /process\.kill\(pid, 0\)/, 'status must check the actual stored PID');
assert.match(supervisor, /process\.kill\(state\.pid, 'SIGTERM'\)/, 'stop must signal the actual stored PID');
assert.match(runtime, /runtime\.log/, 'runtime must assign a per-Minion runtime log path');
assert.match(supervisor, /recentLogLines/, 'supervisor must return recent log evidence');

assert.match(runtime, /launchSelfHostedRuntime\(/, 'launch_minion must call the supervisor');
assert.match(runtime, /checkSelfHostedRuntimeStatus\(/, 'status_check must call the supervisor');
assert.match(runtime, /stopSelfHostedRuntime\(/, 'stop_minion must call the supervisor');
assert.doesNotMatch(runtime, /workspaceStatus = 'running';\n\s*next\.processSupervisor = processSupervisor\('running'/, 'launch_minion must not be only a status flip');
assert.match(runtime, /workspaceUrlFor\(minionId\)/, 'Open Minion must use an app console route, not file URLs');
assert.doesNotMatch(runtime, /file:\/\//, 'runtime open URL must not be only a file URL');
assert.match(runtime, /Scaffolded credential refs are not encrypted/, 'scaffolded credential refs must not be treated as secure');
assert.match(runtime, /MINIONMINT_ALLOW_SCAFFOLDED_CREDENTIAL_REFS_FOR_DEV/, 'dev-only scaffolded credential launch must be explicit');
assert.match(runtime, /runtimePathSignature/, 'runtime must compute a path signature for stale-state detection');
assert.match(runtime, /supervisorStateMatchesRuntimePaths/, 'runtime must compare stored supervisor paths with current runtime paths');
assert.match(runtime, /resetSupervisorForPathChange/, 'runtime must reset stale supervisor state after path changes');
assert.match(runtime, /Runtime workspace path changed; supervisor state reset for safety\./, 'runtime must log path-change reset');
assert.match(runtime, /pid:\s*null/, 'path reset must clear old PID');
assert.match(runtime, /recentLogLines:\s*\[\]/, 'path reset must clear old recent log lines');
assert.match(runtime, /startedAt:\s*null/, 'path reset must clear old startedAt');
assert.match(runtime, /stoppedAt:\s*null/, 'path reset must clear old stoppedAt');
assert.match(runtime, /sanitizeSupervisorForCurrentPaths\(next\)/, 'actions must sanitize stale supervisor state before status, stop, or launch');
assert.match(runtime, /readRuntimeStoreForUser/, 'runtime transitions must read through runtime store abstraction');
assert.match(runtime, /upsertRuntimeForUser/, 'runtime preparation must upsert through runtime store abstraction');
assert.match(runtime, /updateRuntimeForUser/, 'runtime actions must persist through runtime store abstraction');
assert.doesNotMatch(runtime, /minion-runtimes\.json/, 'minion-runtime should not directly own local fallback persistence');

assert.match(runtimeStore, /PrismaClient/, 'runtime store must support Prisma Client');
assert.match(runtimeStore, /DATABASE_URL/, 'runtime store must switch to Prisma when DATABASE_URL is configured');
assert.match(runtimeStore, /MINIONMINT_FORCE_LOCAL_STORE/, 'runtime store must preserve forced local fallback');
assert.match(runtimeStore, /client\.minionRuntime\.upsert/, 'runtime store must upsert MinionRuntime rows');
assert.match(runtimeStore, /client\.minionRuntime\.update/, 'runtime store must update MinionRuntime rows after actions');
assert.match(runtimeStore, /client\.minionRuntime\.findFirst/, 'runtime store must read MinionRuntime rows through tenant-scoped filters');
assert.match(runtimeStore, /clerkUserId/, 'runtime store must resolve signed-in users by clerkUserId');
assert.match(runtimeStore, /memberships/, 'runtime store must restrict reads to owner org memberships');
assert.match(runtimeStore, /local_fallback/, 'runtime store must retain local fallback mode');

assert.match(credentialStore, /CredentialSetupRecord/, 'credential setup must have a durable owner state model');
assert.match(credentialStore, /credential-setups\.json/, 'credential setup must preserve local fallback records');
assert.match(credentialStore, /credentialSetup\.findMany/, 'credential setup must read Prisma rows when DATABASE_URL is configured');
assert.match(credentialStore, /credentialSetup\.create/, 'credential setup must persist Prisma rows when DATABASE_URL is configured');
assert.match(credentialStore, /isEncryptedCredentialRef/, 'credential setup must distinguish encrypted refs from scaffolded refs');
assert.match(credentialStore, /local-dev-vault/, 'local-dev vault must not be treated as production encrypted');
assert.match(runtime, /getCredentialSetupForMinion/, 'runtime launch must read owner credential setup state');
assert.match(runtime, /isCredentialSetupLaunchReady/, 'runtime launch must use credential setup readiness before starting');
assert.match(runtime, /owner credential setup readiness/, 'launch block log must name owner credential setup readiness');
assert.match(credentialsRoute, /Paste an encrypted credential reference, not a raw key or password\./, 'API must reject missing encrypted refs with safe copy');
assert.match(credentialPanel, /Encrypted vault reference/, 'dashboard must let the owner add credential references');
assert.match(credentialPanel, /Raw keys never belong in this page/, 'dashboard must warn against raw credential values');
assert.doesNotMatch(credentialPanel, /secretValue|passwordValue|apiKeyValue|tokenValue/, 'dashboard credential setup must not expose raw credential value fields');

assert.match(route, /Minion console/);
assert.match(route, /Owner takeover/);
assert.match(route, /Recent runtime logs/);
assert.match(route, /getRuntimeByMinionId/);

console.log('runtime supervisor launch, PID status, stop, logs, console route, and credential guardrails are present.');
