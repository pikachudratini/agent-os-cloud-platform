import { spawn } from 'node:child_process';
import { openSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

export type SupervisorStatus = 'not_started' | 'launch_blocked' | 'running' | 'stopped' | 'exited';

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
  recentLogLines: string[];
  updatedAt: string;
};

export type SupervisorRuntimePaths = {
  minionId: string;
  workspaceRoot: string;
  hermesProfilePath: string;
  hermesConfigPath: string;
  supervisorPath: string;
  logPath: string;
};

const placeholderPattern = /\{profile\}|\{config\}|\{workspace\}|\{minionId\}/g;

function now() {
  return new Date().toISOString();
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
    recentLogLines: [],
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

function parseArgs(paths: SupervisorRuntimePaths) {
  const raw = process.env.MINIONMINT_SELF_HOSTED_ARGS_JSON?.trim();
  if (!raw) return [];
  const parsed = JSON.parse(raw) as unknown;
  if (!Array.isArray(parsed) || !parsed.every((item) => typeof item === 'string')) {
    throw new Error('MINIONMINT_SELF_HOSTED_ARGS_JSON must be a JSON array of strings.');
  }
  return parsed.map((item) => renderPlaceholder(item, paths));
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

export async function readSupervisorState(paths: SupervisorRuntimePaths): Promise<RuntimeSupervisorState> {
  try {
    const parsed = JSON.parse(await readFile(paths.supervisorPath, 'utf8')) as RuntimeSupervisorState;
    return { ...emptySupervisorState(parsed.updatedAt), ...parsed, recentLogLines: await readRecentLogLines(parsed.logPath) };
  } catch {
    return { ...emptySupervisorState(), logPath: paths.logPath };
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

export async function checkSelfHostedRuntimeStatus(paths: SupervisorRuntimePaths): Promise<RuntimeSupervisorState> {
  const state = await readSupervisorState(paths);
  const updatedAt = now();
  const alive = isPidAlive(state.pid);
  const next: RuntimeSupervisorState = {
    ...state,
    status: alive ? 'running' : state.pid ? 'exited' : state.status,
    stoppedAt: alive ? state.stoppedAt : state.pid && !state.stoppedAt ? updatedAt : state.stoppedAt,
    recentLogLines: await readRecentLogLines(state.logPath),
    updatedAt,
  };
  await writeState(paths, next);
  return next;
}

export async function launchSelfHostedRuntime(paths: SupervisorRuntimePaths): Promise<RuntimeSupervisorState> {
  const existing = await checkSelfHostedRuntimeStatus(paths);
  if (existing.status === 'running' && existing.pid) return existing;
  const plan = configuredLaunchPlan(paths);
  const updatedAt = now();
  if (!plan) {
    const blocked = {
      ...existing,
      status: 'launch_blocked' as const,
      lastSignal: 'missing_launch_plan',
      updatedAt,
      logPath: paths.logPath,
      recentLogLines: await readRecentLogLines(paths.logPath),
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
    status: 'running',
    executable: plan.executable,
    args: plan.args,
    launchCommand: plan.launchCommand,
    pid: child.pid ?? null,
    startedAt: updatedAt,
    stoppedAt: null,
    lastSignal: 'launch_requested',
    logPath: paths.logPath,
    recentLogLines: await readRecentLogLines(paths.logPath),
    updatedAt,
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
    status: stillAlive ? 'running' : 'stopped',
    stoppedAt: stillAlive ? state.stoppedAt : updatedAt,
    lastSignal: 'stop_requested',
    recentLogLines: await readRecentLogLines(state.logPath),
    updatedAt,
  };
  await writeState(paths, next);
  return next;
}
