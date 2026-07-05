import { spawn, spawnSync } from 'node:child_process';
import { openSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

export type SupervisorStatus = 'not_started' | 'launch_blocked' | 'starting' | 'healthy' | 'unhealthy' | 'stopped' | 'exited';
export type RuntimeHealthCheckKind = 'pid' | 'http' | 'command';

export type RuntimeRestartPolicy = {
  enabled: boolean;
  maxRestarts: number;
};

export type RuntimeSupervisorState = {
  status: SupervisorStatus;
  executable: string | null;
  args: string[];
  launchCommand: string | null;
  pid: number | null;
  startedAt: string | null;
  stoppedAt: string | null;
  lastSignal: string | null;
  logPath: string | null;
  supervisorPath: string | null;
  runtimePackagePath: string | null;
  recentLogLines: string[];
  pidAlive: boolean;
  lastHealthCheckAt: string | null;
  healthCheckKind: RuntimeHealthCheckKind;
  healthCheckTarget: string | null;
  healthFailureReason: string | null;
  restartPolicy: RuntimeRestartPolicy;
  restartCount: number;
  lastRestartAt: string | null;
  updatedAt: string;
};

export type SupervisorRuntimePaths = {
  minionId: string;
  workspaceRoot: string;
  hermesProfilePath: string;
  hermesConfigPath: string;
  credentialVaultPath?: string;
  supervisorPath: string;
  runtimePackagePath?: string;
  logPath: string;
};

const placeholderPattern = /\{profile\}|\{config\}|\{workspace\}|\{minionId\}/g;

function now() {
  return new Date().toISOString();
}

export function configuredRestartPolicy(): RuntimeRestartPolicy {
  const maxRestarts = Number.parseInt(process.env.MINIONMINT_SELF_HOSTED_MAX_RESTARTS || '3', 10);
  return {
    enabled: process.env.MINIONMINT_SELF_HOSTED_RESTART_DISABLED !== 'true',
    maxRestarts: Number.isFinite(maxRestarts) && maxRestarts >= 0 ? maxRestarts : 3,
  };
}

export function emptySupervisorState(updatedAt = now()): RuntimeSupervisorState {
  return {
    status: 'not_started',
    executable: null,
    args: [],
    launchCommand: null,
    pid: null,
    startedAt: null,
    stoppedAt: null,
    lastSignal: null,
    logPath: null,
    supervisorPath: null,
    runtimePackagePath: null,
    recentLogLines: [],
    pidAlive: false,
    lastHealthCheckAt: null,
    healthCheckKind: 'pid',
    healthCheckTarget: null,
    healthFailureReason: null,
    restartPolicy: configuredRestartPolicy(),
    restartCount: 0,
    lastRestartAt: null,
    updatedAt,
  };
}

function renderPlaceholder(value: string, paths: SupervisorRuntimePaths) {
  return value.replace(placeholderPattern, (token) => {
    if (token === '{profile}') return paths.hermesProfilePath;
    if (token === '{config}') return paths.hermesConfigPath;
    if (token === '{workspace}') return paths.workspaceRoot;
    return paths.minionId;
  });
}

function parseJsonArgs(raw: string | undefined, paths: SupervisorRuntimePaths, envName: string) {
  if (!raw?.trim()) return [];
  const parsed = JSON.parse(raw) as unknown;
  if (!Array.isArray(parsed) || !parsed.every((item) => typeof item === 'string')) {
    throw new Error(`${envName} must be a JSON array of strings.`);
  }
  return parsed.map((item) => renderPlaceholder(item, paths));
}

function parseArgs(paths: SupervisorRuntimePaths) {
  return parseJsonArgs(process.env.MINIONMINT_SELF_HOSTED_ARGS_JSON, paths, 'MINIONMINT_SELF_HOSTED_ARGS_JSON');
}

export function configuredLaunchPlan(paths: SupervisorRuntimePaths) {
  const executable = process.env.MINIONMINT_SELF_HOSTED_EXECUTABLE?.trim();
  if (!executable) return null;
  const args = parseArgs(paths);
  return {
    executable,
    args,
    launchCommand: [executable, ...args].join(' '),
  };
}

function configuredHealthCheck(paths: SupervisorRuntimePaths) {
  const url = process.env.MINIONMINT_SELF_HOSTED_HEALTH_URL?.trim();
  if (url) return { kind: 'http' as const, target: renderPlaceholder(url, paths), executable: null, args: [] };
  const executable = process.env.MINIONMINT_SELF_HOSTED_HEALTH_EXECUTABLE?.trim();
  if (executable) {
    const args = parseJsonArgs(process.env.MINIONMINT_SELF_HOSTED_HEALTH_ARGS_JSON, paths, 'MINIONMINT_SELF_HOSTED_HEALTH_ARGS_JSON');
    return { kind: 'command' as const, target: [executable, ...args].join(' '), executable, args };
  }
  return { kind: 'pid' as const, target: 'pid_alive', executable: null, args: [] };
}

async function readRecentLogLines(logPath: string | null, limit = 40) {
  if (!logPath) return [];
  try {
    const content = await readFile(logPath, 'utf8');
    return content.split(/\r?\n/).filter(Boolean).slice(-limit);
  } catch {
    return [];
  }
}

async function writeState(paths: SupervisorRuntimePaths, state: RuntimeSupervisorState) {
  await mkdir(path.dirname(paths.supervisorPath), { recursive: true });
  await writeFile(paths.supervisorPath, JSON.stringify(state, null, 2));
}

function normalizeState(parsed: Partial<RuntimeSupervisorState>, paths: SupervisorRuntimePaths): RuntimeSupervisorState {
  const base = emptySupervisorState(parsed.updatedAt);
  return {
    ...base,
    ...parsed,
    logPath: parsed.logPath ?? paths.logPath,
    supervisorPath: parsed.supervisorPath ?? paths.supervisorPath,
    runtimePackagePath: parsed.runtimePackagePath ?? paths.runtimePackagePath ?? path.join(paths.workspaceRoot, 'runtime-package.json'),
    restartPolicy: parsed.restartPolicy ?? configuredRestartPolicy(),
    restartCount: parsed.restartCount ?? 0,
    pidAlive: parsed.pidAlive ?? false,
    healthCheckKind: parsed.healthCheckKind ?? 'pid',
    healthCheckTarget: parsed.healthCheckTarget ?? null,
    healthFailureReason: parsed.healthFailureReason ?? null,
    lastHealthCheckAt: parsed.lastHealthCheckAt ?? null,
    lastRestartAt: parsed.lastRestartAt ?? null,
  };
}

export async function readSupervisorState(paths: SupervisorRuntimePaths): Promise<RuntimeSupervisorState> {
  try {
    const parsed = JSON.parse(await readFile(paths.supervisorPath, 'utf8')) as Partial<RuntimeSupervisorState>;
    const normalized = normalizeState(parsed, paths);
    return { ...normalized, recentLogLines: await readRecentLogLines(normalized.logPath) };
  } catch {
    return normalizeState({}, paths);
  }
}

function isPidAlive(pid: number | null) {
  if (!pid) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

async function runHealthCheck(paths: SupervisorRuntimePaths, pidAlive: boolean) {
  const checkedAt = now();
  const config = configuredHealthCheck(paths);
  if (!pidAlive) {
    return {
      status: 'exited' as const,
      checkedAt,
      kind: config.kind,
      target: config.target,
      failureReason: 'PID is not alive.',
    };
  }

  if (config.kind === 'pid') {
    return { status: 'healthy' as const, checkedAt, kind: config.kind, target: config.target, failureReason: null };
  }

  if (config.kind === 'http') {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 2000);
      const response = await fetch(config.target, { signal: controller.signal });
      clearTimeout(timeout);
      if (response.ok) return { status: 'healthy' as const, checkedAt, kind: config.kind, target: config.target, failureReason: null };
      return { status: 'unhealthy' as const, checkedAt, kind: config.kind, target: config.target, failureReason: `HTTP health check returned status ${response.status}.` };
    } catch {
      return { status: 'unhealthy' as const, checkedAt, kind: config.kind, target: config.target, failureReason: 'HTTP health check failed.' };
    }
  }

  const result = spawnSync(config.executable as string, config.args, {
    cwd: paths.workspaceRoot,
    shell: false,
    timeout: 3000,
    stdio: ['ignore', 'ignore', 'ignore'],
    env: {
      ...process.env,
      MINIONMINT_MINION_ID: paths.minionId,
      MINIONMINT_HERMES_PROFILE_PATH: paths.hermesProfilePath,
      MINIONMINT_HERMES_CONFIG_PATH: paths.hermesConfigPath,
      MINIONMINT_WORKSPACE_ROOT: paths.workspaceRoot,
    },
  });
  if (result.status === 0) return { status: 'healthy' as const, checkedAt, kind: config.kind, target: config.target, failureReason: null };
  if (result.error) return { status: 'unhealthy' as const, checkedAt, kind: config.kind, target: config.target, failureReason: 'Command health check failed to execute.' };
  return { status: 'unhealthy' as const, checkedAt, kind: config.kind, target: config.target, failureReason: `Command health check exited with code ${result.status ?? 'unknown'}.` };
}

export async function checkSelfHostedRuntimeStatus(paths: SupervisorRuntimePaths): Promise<RuntimeSupervisorState> {
  const state = await readSupervisorState(paths);
  const updatedAt = now();
  const alive = isPidAlive(state.pid);
  const health = await runHealthCheck(paths, alive);
  const nextStatus = alive ? health.status : state.status === 'stopped' ? 'stopped' : state.pid ? 'exited' : state.status;
  const next: RuntimeSupervisorState = {
    ...state,
    status: nextStatus,
    pidAlive: alive,
    stoppedAt: alive ? state.stoppedAt : state.pid && !state.stoppedAt ? updatedAt : state.stoppedAt,
    recentLogLines: await readRecentLogLines(state.logPath),
    lastHealthCheckAt: health.checkedAt,
    healthCheckKind: health.kind,
    healthCheckTarget: health.target,
    healthFailureReason: health.failureReason,
    restartPolicy: configuredRestartPolicy(),
    updatedAt,
  };
  await writeState(paths, next);
  return next;
}

export async function launchSelfHostedRuntime(paths: SupervisorRuntimePaths): Promise<RuntimeSupervisorState> {
  const existing = await checkSelfHostedRuntimeStatus(paths);
  if ((existing.status === 'healthy' || existing.status === 'starting') && existing.pid && existing.pidAlive) return existing;
  const plan = configuredLaunchPlan(paths);
  const updatedAt = now();
  if (!plan) {
    const blocked = {
      ...existing,
      status: 'launch_blocked' as const,
      pidAlive: false,
      lastSignal: 'missing_launch_plan',
      updatedAt,
      logPath: paths.logPath,
      supervisorPath: paths.supervisorPath,
      runtimePackagePath: paths.runtimePackagePath ?? path.join(paths.workspaceRoot, 'runtime-package.json'),
      recentLogLines: await readRecentLogLines(paths.logPath),
      healthFailureReason: 'Missing structured launch plan.',
      restartPolicy: configuredRestartPolicy(),
    };
    await writeState(paths, blocked);
    return blocked;
  }

  await mkdir(path.dirname(paths.logPath), { recursive: true });
  const out = openSync(paths.logPath, 'a');
  const child = spawn(plan.executable, plan.args, {
    cwd: paths.workspaceRoot,
    detached: true,
    env: {
      ...process.env,
      MINIONMINT_MINION_ID: paths.minionId,
      MINIONMINT_HERMES_PROFILE_PATH: paths.hermesProfilePath,
      MINIONMINT_HERMES_CONFIG_PATH: paths.hermesConfigPath,
      MINIONMINT_WORKSPACE_ROOT: paths.workspaceRoot,
    },
    shell: false,
    stdio: ['ignore', out, out],
  });
  child.unref();

  const state: RuntimeSupervisorState = {
    ...emptySupervisorState(updatedAt),
    status: 'starting',
    executable: plan.executable,
    args: plan.args,
    launchCommand: plan.launchCommand,
    pid: child.pid ?? null,
    pidAlive: Boolean(child.pid),
    startedAt: updatedAt,
    stoppedAt: null,
    lastSignal: 'launch_requested',
    logPath: paths.logPath,
    supervisorPath: paths.supervisorPath,
    runtimePackagePath: paths.runtimePackagePath ?? path.join(paths.workspaceRoot, 'runtime-package.json'),
    recentLogLines: await readRecentLogLines(paths.logPath),
    restartPolicy: configuredRestartPolicy(),
    restartCount: existing.restartCount,
    lastRestartAt: existing.lastRestartAt,
  };
  await writeState(paths, state);
  return state;
}

export async function stopSelfHostedRuntime(paths: SupervisorRuntimePaths): Promise<RuntimeSupervisorState> {
  const state = await readSupervisorState(paths);
  const updatedAt = now();
  if (state.pid && isPidAlive(state.pid)) {
    process.kill(state.pid, 'SIGTERM');
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  const stillAlive = isPidAlive(state.pid);
  const next: RuntimeSupervisorState = {
    ...state,
    status: stillAlive ? 'unhealthy' : 'stopped',
    pidAlive: stillAlive,
    stoppedAt: stillAlive ? state.stoppedAt : updatedAt,
    lastSignal: 'stop_requested',
    recentLogLines: await readRecentLogLines(state.logPath),
    healthFailureReason: stillAlive ? 'Stop requested, but PID is still alive.' : null,
    restartPolicy: configuredRestartPolicy(),
    updatedAt,
  };
  await writeState(paths, next);
  return next;
}

export async function restartSelfHostedRuntime(paths: SupervisorRuntimePaths): Promise<RuntimeSupervisorState> {
  const before = await readSupervisorState(paths);
  const policy = configuredRestartPolicy();
  const plan = configuredLaunchPlan(paths);
  const updatedAt = now();
  if (!policy.enabled) {
    const blocked = { ...before, status: 'launch_blocked' as const, lastSignal: 'restart_blocked', healthFailureReason: 'Restart policy is disabled.', restartPolicy: policy, updatedAt };
    await writeState(paths, blocked);
    return blocked;
  }
  if (before.restartCount >= policy.maxRestarts) {
    const blocked = { ...before, status: 'launch_blocked' as const, lastSignal: 'restart_blocked', healthFailureReason: 'Restart policy max restart count reached.', restartPolicy: policy, updatedAt };
    await writeState(paths, blocked);
    return blocked;
  }
  if (!plan) {
    const blocked = { ...before, status: 'launch_blocked' as const, lastSignal: 'restart_blocked', healthFailureReason: 'Missing structured launch plan.', restartPolicy: policy, updatedAt };
    await writeState(paths, blocked);
    return blocked;
  }
  const stopped = await stopSelfHostedRuntime(paths);
  if (stopped.pidAlive) {
    const blocked = { ...stopped, status: 'unhealthy' as const, lastSignal: 'restart_blocked', healthFailureReason: 'Restart blocked because old PID is still alive.', restartPolicy: policy, updatedAt: now() };
    await writeState(paths, blocked);
    return blocked;
  }
  const launched = await launchSelfHostedRuntime(paths);
  const restarted = {
    ...launched,
    restartPolicy: policy,
    restartCount: before.restartCount + 1,
    lastRestartAt: now(),
    lastSignal: launched.status === 'launch_blocked' ? 'restart_blocked' : 'restart_requested',
  };
  await writeState(paths, restarted);
  return restarted;
}
