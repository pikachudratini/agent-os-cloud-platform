import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const supervisor = readFileSync('apps/web/app/lib/runtime-supervisor.ts', 'utf8');
const runtime = readFileSync('apps/web/app/lib/minion-runtime.ts', 'utf8');
const route = readFileSync('apps/web/app/minions/[minionId]/page.tsx', 'utf8');

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

assert.match(route, /Minion console/);
assert.match(route, /Owner takeover/);
assert.match(route, /Recent runtime logs/);
assert.match(route, /getRuntimeByMinionId/);

console.log('runtime supervisor launch, PID status, stop, logs, console route, and credential guardrails are present.');
