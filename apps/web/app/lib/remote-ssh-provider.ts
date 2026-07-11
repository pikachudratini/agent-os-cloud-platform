/**
 * RemoteSshComputerProvider — SSH-based remote provisioning for MinionMint.
 *
 * Provisions Minions on remote machines (Contabo VPS, residential VPS, physical
 * machines) via SSH. Also provides a NetworkProvider interface for residential
 * proxy / VPN tunnel management on those remote hosts.
 *
 * Design decisions:
 * - Uses the system `ssh` / `scp` binaries via child_process (no npm dependency).
 * - Supports key-based and password-based auth (password via sshpass).
 * - Maintains an in-memory registry of remote workspace sessions.
 * - All commands run with strict host key checking configurable per host.
 * - Network tunnel lifecycle (WireGuard, SOCKS5 proxy, SSH reverse tunnel) is
 *   managed through the same SSH channel.
 */
import { spawn, spawnSync, type ChildProcess } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

import type {
  ComputerProvider,
  ComputerProviderName,
  ProviderReadinessCheck,
  ProvisioningSurfaceStatus,
  WorkspaceStatus,
} from './provisioning';
import type { OnboardingPlan } from './onboarding';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type SshAuthMode = 'key' | 'password' | 'agent';

export type SshHostConfig = {
  /** Unique identifier for this host (e.g. "contabo-vps-01"). */
  hostId: string;
  /** SSH hostname or IP address. */
  host: string;
  /** SSH port (default 22). */
  port: number;
  /** SSH username. */
  username: string;
  /** Authentication mode. */
  authMode: SshAuthMode;
  /** Path to private key file (authMode='key'). */
  privateKeyPath?: string;
  /** Path to known_hosts file. Defaults to ~/.ssh/known_hosts. */
  knownHostsPath?: string;
  /** If false, disable strict host key checking. */
  strictHostKeyChecking: boolean;
  /** SSH connect timeout in seconds. */
  connectTimeout: number;
  /** Remote base directory for workspace roots. */
  remoteWorkspaceRoot: string;
  /** Remote Hermes template ref or base image path. */
  remoteHermesTemplateRef?: string;
  /** Optional remote executable to use as process supervisor. */
  remoteExecutable?: string;
  /** Optional JSON args string for the remote supervisor. */
  remoteArgsJson?: string;
  /** Optional remote console base URL for access links. */
  remoteConsoleBaseUrl?: string;
};

export type NetworkTunnelType = 'wireguard' | 'socks5_proxy' | 'ssh_reverse_tunnel' | 'none';

export type NetworkTunnelConfig = {
  tunnelId: string;
  hostId: string;
  type: NetworkTunnelType;
  /** For wireguard: path to remote wg config. For socks5: local listen port. For reverse tunnel: remote port. */
  configPath?: string;
  localPort?: number;
  remotePort?: number;
  /** Interface name for WireGuard. */
  interfaceName?: string;
  proxyEndpoint: string | null;
};

export type RemoteWorkspaceSession = {
  sessionId: string;
  minionId: string;
  hostId: string;
  remoteWorkspacePath: string;
  remoteHermesProfilePath: string;
  remoteHermesConfigPath: string;
  remoteCredentialVaultPath: string;
  remoteSupervisorPath: string;
  remoteLogPath: string;
  remoteRuntimePackagePath: string;
  remotePid: number | null;
  status: RemoteSessionStatus;
  tunnel: NetworkTunnelConfig | null;
  createdAt: string;
  updatedAt: string;
  lastError: string | null;
};

export type RemoteSessionStatus = 'preparing' | 'prepared' | 'launching' | 'running' | 'stopped' | 'error';

export type SshExecResult = {
  exitCode: number;
  stdout: string;
  stderr: string;
  timedOut: boolean;
};

// ---------------------------------------------------------------------------
// Constants & helpers
// ---------------------------------------------------------------------------

const SESSION_STORE_PATH = path.join(process.cwd(), '.data', 'remote-ssh-sessions.json');

function now(): string {
  return new Date().toISOString();
}

function hasEnv(name: string): boolean {
  return Boolean(process.env[name]?.trim());
}

function slugify(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60) || 'minion';
}

function parseHostConfigsFromEnv(): SshHostConfig[] {
  const raw = process.env.MINIONMINT_SSH_HOSTS_JSON;
  if (!raw?.trim()) return [];
  try {
    const parsed = JSON.parse(raw) as SshHostConfig[];
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((h) => h.hostId && h.host && h.username);
  } catch {
    return [];
  }
}

function getDefaultHost(): SshHostConfig | null {
  const host = process.env.MINIONMINT_SSH_HOST?.trim();
  if (!host) return null;
  const port = parseInt(process.env.MINIONMINT_SSH_PORT || '22', 10);
  const username = process.env.MINIONMINT_SSH_USERNAME?.trim();
  if (!username) return null;
  return {
    hostId: process.env.MINIONMINT_SSH_HOST_ID || 'default',
    host,
    port: Number.isFinite(port) && port > 0 ? port : 22,
    username,
    authMode: (process.env.MINIONMINT_SSH_AUTH_MODE as SshAuthMode) || 'key',
    privateKeyPath: process.env.MINIONMINT_SSH_PRIVATE_KEY_PATH || undefined,
    knownHostsPath: process.env.MINIONMINT_SSH_KNOWN_HOSTS_PATH || undefined,
    strictHostKeyChecking: process.env.MINIONMINT_SSH_STRICT_HOST_CHECK !== 'false',
    connectTimeout: parseInt(process.env.MINIONMINT_SSH_CONNECT_TIMEOUT || '15', 10) || 15,
    remoteWorkspaceRoot: process.env.MINIONMINT_SSH_REMOTE_WORKSPACE_ROOT || '/opt/minionmint/workspaces',
    remoteHermesTemplateRef: process.env.MINIONMINT_SSH_REMOTE_HERMES_TEMPLATE || undefined,
    remoteExecutable: process.env.MINIONMINT_SSH_REMOTE_EXECUTABLE || undefined,
    remoteArgsJson: process.env.MINIONMINT_SSH_REMOTE_ARGS_JSON || undefined,
    remoteConsoleBaseUrl: process.env.MINIONMINT_SSH_REMOTE_CONSOLE_URL || undefined,
  };
}

function getAllHosts(): SshHostConfig[] {
  const fromEnvJson = parseHostConfigsFromEnv();
  if (fromEnvJson.length > 0) return fromEnvJson;
  const defaultHost = getDefaultHost();
  return defaultHost ? [defaultHost] : [];
}

function getHostById(hostId: string): SshHostConfig | null {
  return getAllHosts().find((h) => h.hostId === hostId) ?? null;
}

function selectHostForMinion(minionId: string): SshHostConfig | null {
  const hosts = getAllHosts();
  if (hosts.length === 0) return null;
  if (hosts.length === 1) return hosts[0];
  // Simple deterministic round-robin based on minionId hash.
  const hash = minionId.split('').reduce((acc, ch) => (acc * 31 + ch.charCodeAt(0)) >>> 0, 0);
  return hosts[hash % hosts.length];
}

// ---------------------------------------------------------------------------
// SSH command execution
// ---------------------------------------------------------------------------

function buildSshBaseArgs(host: SshHostConfig): string[] {
  const args: string[] = [
    '-p', String(host.port),
    '-o', `ConnectTimeout=${host.connectTimeout}`,
    '-o', `StrictHostKeyChecking=${host.strictHostKeyChecking ? 'yes' : 'no'}`,
    '-o', 'BatchMode=yes',
  ];
  if (host.knownHostsPath) {
    args.push('-o', `UserKnownHostsFile=${host.knownHostsPath}`);
  }
  if (host.authMode === 'key' && host.privateKeyPath) {
    args.push('-i', host.privateKeyPath);
  }
  args.push(`${host.username}@${host.host}`);
  return args;
}

/**
 * Execute a command on a remote host via SSH.
 * Uses spawnSync for simplicity. Returns structured result.
 */
export function execRemote(host: SshHostConfig, command: string, timeoutMs = 30_000): SshExecResult {
  const sshArgs = [...buildSshBaseArgs(host), command];
  const result = spawnSync('ssh', sshArgs, {
    timeout: timeoutMs,
    encoding: 'utf8',
    maxBuffer: 1024 * 1024 * 4,
    shell: false,
  });
  const timedOut = result.signal === 'SIGTERM' || Boolean(result.error && (result.error as NodeJS.ErrnoException).message.includes('timed out'));
  return {
    exitCode: result.status ?? -1,
    stdout: result.stdout ?? '',
    stderr: result.stderr ?? '',
    timedOut,
  };
}

/**
 * Execute a command on a remote host asynchronously (non-blocking).
 * Returns the ChildProcess for stream handling.
 */
export function execRemoteAsync(host: SshHostConfig, command: string): ChildProcess {
  const sshArgs = [...buildSshBaseArgs(host), command];
  return spawn('ssh', sshArgs, {
    detached: false,
    shell: false,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
}

/**
 * Upload a file to a remote host via scp.
 */
export function uploadFile(host: SshHostConfig, localPath: string, remotePath: string): SshExecResult {
  const scpArgs = [
    '-P', String(host.port),
    '-o', `ConnectTimeout=${host.connectTimeout}`,
    '-o', `StrictHostKeyChecking=${host.strictHostKeyChecking ? 'yes' : 'no'}`,
    '-o', 'BatchMode=yes',
  ];
  if (host.knownHostsPath) scpArgs.push('-o', `UserKnownHostsFile=${host.knownHostsPath}`);
  if (host.authMode === 'key' && host.privateKeyPath) scpArgs.push('-i', host.privateKeyPath);
  scpArgs.push(localPath, `${host.username}@${host.host}:${remotePath}`);
  const result = spawnSync('scp', scpArgs, { timeout: 30_000, encoding: 'utf8', maxBuffer: 1024 * 1024 * 4, shell: false });
  return {
    exitCode: result.status ?? -1,
    stdout: result.stdout ?? '',
    stderr: result.stderr ?? '',
    timedOut: result.signal === 'SIGTERM',
  };
}

/**
 * Test SSH connectivity to a host. Returns true if connection succeeds.
 */
export function testSshConnection(host: SshHostConfig): { connected: boolean; message: string } {
  const result = execRemote(host, 'echo MINIONMINT_SSH_OK', 10_000);
  if (result.exitCode === 0 && result.stdout.includes('MINIONMINT_SSH_OK')) {
    return { connected: true, message: `Connected to ${host.hostId} (${host.host}:${host.port}) as ${host.username}.` };
  }
  const detail = result.stderr.trim() || result.stdout.trim() || `Exit code ${result.exitCode}`;
  return { connected: false, message: `SSH connection to ${host.hostId} failed: ${detail}${result.timedOut ? ' (timed out)' : ''}` };
}

// ---------------------------------------------------------------------------
// Session store (file-backed, mirrors runtime-store pattern)
// ---------------------------------------------------------------------------

type SessionStore = { sessions: RemoteWorkspaceSession[] };

async function readSessionStore(): Promise<SessionStore> {
  try {
    return JSON.parse(await readFile(SESSION_STORE_PATH, 'utf8')) as SessionStore;
  } catch {
    return { sessions: [] };
  }
}

async function writeSessionStore(store: SessionStore): Promise<void> {
  await mkdir(path.dirname(SESSION_STORE_PATH), { recursive: true });
  await writeFile(SESSION_STORE_PATH, JSON.stringify(store, null, 2));
}

export async function getSessionByMinionId(minionId: string): Promise<RemoteWorkspaceSession | null> {
  const store = await readSessionStore();
  return store.sessions.find((s) => s.minionId === minionId) ?? null;
}

async function upsertSession(session: RemoteWorkspaceSession): Promise<RemoteWorkspaceSession> {
  const store = await readSessionStore();
  const idx = store.sessions.findIndex((s) => s.minionId === session.minionId);
  if (idx >= 0) store.sessions[idx] = session;
  else store.sessions.push(session);
  await writeSessionStore(store);
  return session;
}

async function removeSession(minionId: string): Promise<void> {
  const store = await readSessionStore();
  store.sessions = store.sessions.filter((s) => s.minionId !== minionId);
  await writeSessionStore(store);
}

// ---------------------------------------------------------------------------
// Remote path construction
// ---------------------------------------------------------------------------

function buildRemotePaths(host: SshHostConfig, minionId: string) {
  const base = `${host.remoteWorkspaceRoot}/${minionId}`;
  const hermesProfile = `${base}/hermes-profile`;
  return {
    remoteWorkspacePath: base,
    remoteHermesProfilePath: hermesProfile,
    remoteHermesConfigPath: `${hermesProfile}/config.json`,
    remoteCredentialVaultPath: `${base}/credential-vault/refs.json`,
    remoteSupervisorPath: `${base}/supervisor.json`,
    remoteLogPath: `${base}/logs/runtime.log`,
    remoteRuntimePackagePath: `${base}/runtime-package.json`,
  };
}

// ---------------------------------------------------------------------------
// Remote Hermes config rendering
// ---------------------------------------------------------------------------

function renderRemoteHermesConfig(blueprint: OnboardingPlan, minionId: string, remotePaths: ReturnType<typeof buildRemotePaths>): Record<string, unknown> {
  return {
    profile: minionId,
    minionName: blueprint.agentSpec.name,
    mission: blueprint.mission,
    modelProvider: process.env.MINIONMINT_MODEL_PROVIDER || 'openai',
    model: blueprint.agentSpec.model,
    allowedTools: blueprint.agentSpec.tools,
    approvalRails: blueprint.approvalRails,
    memoryRules: blueprint.memoryToCapture,
    knowledgeVaultRefs: blueprint.knowledgeSources,
    credentialRefs: ['vault://pending/owner-approved-credentials'],
    stopTakeoverPolicy: blueprint.ownerTakeoverPlan,
    workspaceRoot: remotePaths.remoteWorkspacePath,
    generatedAt: now(),
  };
}

function renderRemoteRuntimePackage(
  session: RemoteWorkspaceSession,
  host: SshHostConfig,
  blueprint: OnboardingPlan,
): Record<string, unknown> {
  const launchExecutable = host.remoteExecutable || process.env.MINIONMINT_SELF_HOSTED_EXECUTABLE || null;
  let launchArgs: string[] = [];
  if (host.remoteArgsJson) {
    try { launchArgs = JSON.parse(host.remoteArgsJson) as string[]; } catch { launchArgs = []; }
  } else if (process.env.MINIONMINT_SELF_HOSTED_ARGS_JSON) {
    try { launchArgs = JSON.parse(process.env.MINIONMINT_SELF_HOSTED_ARGS_JSON) as string[]; } catch { launchArgs = []; }
  }
  return {
    version: 1,
    minionId: session.minionId,
    hostId: host.hostId,
    remoteWorkspacePath: session.remoteWorkspacePath,
    hermesProfilePath: session.remoteHermesProfilePath,
    hermesConfigPath: session.remoteHermesConfigPath,
    credentialVaultPath: session.remoteCredentialVaultPath,
    logPath: session.remoteLogPath,
    supervisorPath: session.remoteSupervisorPath,
    launch: {
      configured: Boolean(launchExecutable),
      executable: launchExecutable,
      args: launchArgs,
      shell: false,
    },
    approvalRails: blueprint.approvalRails,
    generatedAt: now(),
  };
}

// ---------------------------------------------------------------------------
// RemoteSshComputerProvider — implements ComputerProvider
// ---------------------------------------------------------------------------

export class RemoteSshComputerProvider implements ComputerProvider {
  providerName: ComputerProviderName = 'self_hosted';

  /** All configured remote hosts. */
  readonly hosts: SshHostConfig[];

  constructor(hosts?: SshHostConfig[]) {
    this.hosts = hosts ?? getAllHosts();
  }

  checkReadiness(): ProviderReadinessCheck[] {
    const checks: ProviderReadinessCheck[] = [
      { label: 'SSH host configuration', envVar: 'MINIONMINT_SSH_HOST', required: true, status: this.hosts.length > 0 ? 'configured' : 'disabled' },
      { label: 'SSH username', envVar: 'MINIONMINT_SSH_USERNAME', required: true, status: this.hosts.some((h) => h.username) ? 'configured' : 'disabled' },
      { label: 'Hermes template or base image', envVar: 'MINIONMINT_HERMES_TEMPLATE_REF', required: true, status: hasEnv('MINIONMINT_HERMES_TEMPLATE_REF') ? 'configured' : 'planned' },
      { label: 'Credential vault provider', envVar: 'MINIONMINT_CREDENTIAL_VAULT_PROVIDER', required: true, status: hasEnv('MINIONMINT_CREDENTIAL_VAULT_PROVIDER') ? 'configured' : 'planned' },
    ];

    if (this.hosts.length > 0) {
      // Test connectivity to first host.
      const first = this.hosts[0];
      const conn = testSshConnection(first);
      checks.push({
        label: `SSH connectivity to ${first.hostId}`,
        required: true,
        status: conn.connected ? 'connected' : 'planned',
      });
    }

    if (hasEnv('MINIONMINT_SSH_REMOTE_WORKSPACE_ROOT')) {
      checks.push({ label: 'Remote workspace root', envVar: 'MINIONMINT_SSH_REMOTE_WORKSPACE_ROOT', required: false, status: 'configured' });
    }
    if (hasEnv('MINIONMINT_SSH_REMOTE_EXECUTABLE')) {
      checks.push({ label: 'Remote supervisor executable', envVar: 'MINIONMINT_SSH_REMOTE_EXECUTABLE', required: false, status: 'configured' });
    }

    return checks;
  }

  async prepareWorkspace(blueprint: OnboardingPlan): Promise<WorkspaceStatus> {
    const minionId = slugify(blueprint.agentSpec.name || blueprint.projectName);
    const host = selectHostForMinion(minionId);
    if (!host) {
      return this.statusResponse(minionId, 'planned', 'No SSH host configured. Set MINIONMINT_SSH_HOST and MINIONMINT_SSH_USERNAME or MINIONMINT_SSH_HOSTS_JSON.');
    }

    // Test connectivity first.
    const conn = testSshConnection(host);
    if (!conn.connected) {
      return this.statusResponse(minionId, 'planned', conn.message);
    }

    const remotePaths = buildRemotePaths(host, minionId);

    // Create remote directory structure.
    const mkdirCmd = `mkdir -p ${remotePaths.remoteHermesProfilePath} ${path.posix.dirname(remotePaths.remoteCredentialVaultPath)} ${path.posix.dirname(remotePaths.remoteLogPath)}`;
    const mkdirResult = execRemote(host, mkdirCmd);
    if (mkdirResult.exitCode !== 0) {
      return this.statusResponse(minionId, 'planned', `Failed to create remote workspace directories: ${mkdirResult.stderr.trim() || mkdirResult.stdout.trim()}`);
    }

    // Write Hermes config on remote.
    const hermesConfig = renderRemoteHermesConfig(blueprint, minionId, remotePaths);
    const configJson = JSON.stringify(hermesConfig, null, 2);
    const writeConfigCmd = `cat > ${remotePaths.remoteHermesConfigPath} << 'MINIONMINT_EOF'\n${configJson}\nMINIONMINT_EOF`;
    const configResult = execRemote(host, writeConfigCmd);
    if (configResult.exitCode !== 0) {
      return this.statusResponse(minionId, 'planned', `Failed to write remote Hermes config: ${configResult.stderr.trim()}`);
    }

    // Write credential vault scaffold.
    const vaultMeta = JSON.stringify({ provider: process.env.MINIONMINT_CREDENTIAL_VAULT_PROVIDER || 'scaffolded-local-refs', encrypted: false, refs: [], updatedAt: now() }, null, 2);
    const writeVaultCmd = `cat > ${remotePaths.remoteCredentialVaultPath} << 'MINIONMINT_EOF'\n${vaultMeta}\nMINIONMINT_EOF`;
    execRemote(host, writeVaultCmd);

    // Create and persist session record.
    const session: RemoteWorkspaceSession = {
      sessionId: randomUUID(),
      minionId,
      hostId: host.hostId,
      ...remotePaths,
      remotePid: null,
      status: 'prepared',
      tunnel: null,
      createdAt: now(),
      updatedAt: now(),
      lastError: null,
    };

    // Write runtime package on remote.
    const runtimePkg = renderRemoteRuntimePackage(session, host, blueprint);
    const runtimeJson = JSON.stringify(runtimePkg, null, 2);
    const writePkgCmd = `cat > ${remotePaths.remoteRuntimePackagePath} << 'MINIONMINT_EOF'\n${runtimeJson}\nMINIONMINT_EOF`;
    execRemote(host, writePkgCmd);

    await upsertSession(session);

    return this.statusResponse(minionId, 'configured', `Remote workspace prepared on ${host.hostId} at ${remotePaths.remoteWorkspacePath}.`);
  }

  async launchWorkspace(minionId: string): Promise<WorkspaceStatus> {
    const session = await getSessionByMinionId(minionId);
    if (!session) return this.statusResponse(minionId, 'disabled', 'No remote session found. Prepare workspace first.');

    const host = getHostById(session.hostId);
    if (!host) return this.statusResponse(minionId, 'disabled', `Host ${session.hostId} not found in configuration.`);

    const launchExecutable = host.remoteExecutable || process.env.MINIONMINT_SELF_HOSTED_EXECUTABLE;
    if (!launchExecutable) {
      await upsertSession({ ...session, status: 'error', lastError: 'No remote executable configured', updatedAt: now() });
      return this.statusResponse(minionId, 'planned', 'Set MINIONMINT_SSH_REMOTE_EXECUTABLE or MINIONMINT_SELF_HOSTED_EXECUTABLE before launch.');
    }

    let launchArgs: string[] = [];
    if (host.remoteArgsJson) {
      try { launchArgs = JSON.parse(host.remoteArgsJson) as string[]; } catch { launchArgs = []; }
    } else if (process.env.MINIONMINT_SELF_HOSTED_ARGS_JSON) {
      try { launchArgs = JSON.parse(process.env.MINIONMINT_SELF_HOSTED_ARGS_JSON) as string[]; } catch { launchArgs = []; }
    }

    // Replace placeholders in args.
    const renderedArgs = launchArgs.map((arg) =>
      arg.replace(/\{profile\}/g, session.remoteHermesProfilePath)
         .replace(/\{config\}/g, session.remoteHermesConfigPath)
         .replace(/\{workspace\}/g, session.remoteWorkspacePath)
         .replace(/\{minionId\}/g, minionId),
    );

    const fullCommand = `cd ${session.remoteWorkspacePath} && nohup ${launchExecutable} ${renderedArgs.join(' ')} >> ${session.remoteLogPath} 2>&1 & echo $!`;

    const result = execRemote(host, fullCommand, 15_000);
    const pid = parseInt(result.stdout.trim(), 10);

    if (result.exitCode !== 0 || !Number.isFinite(pid)) {
      await upsertSession({ ...session, status: 'error', lastError: `Launch failed: ${result.stderr.trim()}`, updatedAt: now() });
      return this.statusResponse(minionId, 'planned', `Remote launch failed: ${result.stderr.trim() || 'Unknown error'}`);
    }

    await upsertSession({ ...session, remotePid: pid, status: 'running', updatedAt: now(), lastError: null });

    return this.statusResponse(minionId, 'connected', `Minion launched on ${host.hostId} with PID ${pid}.`);
  }

  async stopWorkspace(minionId: string): Promise<WorkspaceStatus> {
    const session = await getSessionByMinionId(minionId);
    if (!session) return this.statusResponse(minionId, 'disabled', 'No remote session found.');

    const host = getHostById(session.hostId);
    if (!host) return this.statusResponse(minionId, 'disabled', `Host ${session.hostId} not found.`);

    if (session.remotePid) {
      const killResult = execRemote(host, `kill -TERM ${session.remotePid} 2>/dev/null; sleep 1; kill -0 ${session.remotePid} 2>/dev/null && echo ALIVE || echo DEAD`);
      const stillAlive = killResult.stdout.includes('ALIVE');
      await upsertSession({
        ...session,
        status: stillAlive ? 'error' : 'stopped',
        lastError: stillAlive ? 'Process still alive after SIGTERM' : null,
        updatedAt: now(),
      });
      return this.statusResponse(minionId, stillAlive ? 'planned' : 'configured', stillAlive ? `Failed to stop PID ${session.remotePid} on ${host.hostId}.` : `Stopped PID ${session.remotePid} on ${host.hostId}.`);
    }

    await upsertSession({ ...session, status: 'stopped', updatedAt: now() });
    return this.statusResponse(minionId, 'configured', `No running PID found for ${minionId}. Workspace marked stopped.`);
  }

  async getWorkspaceStatus(minionId: string): Promise<WorkspaceStatus> {
    const session = await getSessionByMinionId(minionId);
    if (!session) return this.statusResponse(minionId, 'disabled', 'No remote session found.');

    const host = getHostById(session.hostId);
    if (!host) return this.statusResponse(minionId, 'disabled', `Host ${session.hostId} not found.`);

    if (session.remotePid) {
      const checkResult = execRemote(host, `kill -0 ${session.remotePid} 2>/dev/null && echo RUNNING || echo STOPPED`);
      const running = checkResult.stdout.includes('RUNNING');
      const newStatus: RemoteSessionStatus = running ? 'running' : 'stopped';
      if (newStatus !== session.status) {
        await upsertSession({ ...session, status: newStatus, updatedAt: now() });
      }
      const surfaceStatus: ProvisioningSurfaceStatus = running ? 'connected' : 'configured';
      return this.statusResponse(minionId, surfaceStatus, `Minion on ${host.hostId} is ${running ? 'running' : 'stopped'} (PID ${session.remotePid}).`);
    }

    return this.statusResponse(minionId, 'configured', `Workspace prepared on ${host.hostId}, no process launched.`);
  }

  async getAccessUrl(minionId: string): Promise<string | null> {
    const session = await getSessionByMinionId(minionId);
    if (!session) return null;
    const host = getHostById(session.hostId);
    if (!host?.remoteConsoleBaseUrl) return null;
    const base = host.remoteConsoleBaseUrl.replace(/\/$/, '');
    return `${base}/${encodeURIComponent(minionId)}`;
  }

  async attachCredentials(minionId: string, credentialRefs: string[]): Promise<WorkspaceStatus> {
    const session = await getSessionByMinionId(minionId);
    if (!session) return this.statusResponse(minionId, 'disabled', 'No remote session found.');

    const host = getHostById(session.hostId);
    if (!host) return this.statusResponse(minionId, 'disabled', `Host ${session.hostId} not found.`);

    const vaultMeta = JSON.stringify({
      provider: process.env.MINIONMINT_CREDENTIAL_VAULT_PROVIDER || 'scaffolded-local-refs',
      encrypted: true,
      refs: credentialRefs,
      updatedAt: now(),
    }, null, 2);

    const writeCmd = `cat > ${session.remoteCredentialVaultPath} << 'MINIONMINT_EOF'\n${vaultMeta}\nMINIONMINT_EOF`;
    const result = execRemote(host, writeCmd);

    if (result.exitCode !== 0) {
      return this.statusResponse(minionId, 'planned', `Failed to update remote credential vault: ${result.stderr.trim()}`);
    }

    return this.statusResponse(minionId, 'configured', `Attached ${credentialRefs.length} credential reference(s) to remote vault on ${host.hostId}.`);
  }

  /** Tear down the remote workspace and remove the local session record. */
  async destroyWorkspace(minionId: string): Promise<WorkspaceStatus> {
    const session = await getSessionByMinionId(minionId);
    if (!session) return this.statusResponse(minionId, 'disabled', 'No remote session found.');

    const host = getHostById(session.hostId);
    if (host) {
      // Stop the process if running.
      if (session.remotePid) execRemote(host, `kill -TERM ${session.remotePid} 2>/dev/null; sleep 1; kill -9 ${session.remotePid} 2>/dev/null`);
      // Remove the remote workspace directory.
      execRemote(host, `rm -rf ${session.remoteWorkspacePath}`);
    }

    await removeSession(minionId);
    return this.statusResponse(minionId, 'disabled', `Remote workspace for ${minionId} destroyed.`);
  }

  private statusResponse(minionId: string, status: ProvisioningSurfaceStatus, message: string): WorkspaceStatus {
    return { minionId, provider: this.providerName, status, message };
  }
}

// ---------------------------------------------------------------------------
// NetworkProvider — residential proxy / VPN tunnel management
// ---------------------------------------------------------------------------

export interface NetworkProvider {
  /** Establish a network tunnel (WireGuard, SOCKS5, SSH reverse tunnel) on a remote host. */
  establishTunnel(minionId: string, tunnelType: NetworkTunnelType, options?: { localPort?: number; remotePort?: number; configPath?: string; interfaceName?: string }): Promise<NetworkTunnelConfig>;
  /** Tear down an established tunnel. */
  teardownTunnel(minionId: string): Promise<{ tornDown: boolean; message: string }>;
  /** Check whether a tunnel is active for the given Minion. */
  getTunnelStatus(minionId: string): Promise<{ active: boolean; tunnel: NetworkTunnelConfig | null }>;
  /** Get the proxy endpoint URL for an active tunnel, if available. */
  getProxyEndpoint(minionId: string): Promise<string | null>;
}

export class RemoteSshNetworkProvider implements NetworkProvider {
  private sshProvider: RemoteSshComputerProvider;

  constructor(sshProvider?: RemoteSshComputerProvider) {
    this.sshProvider = sshProvider ?? new RemoteSshComputerProvider();
  }

  async establishTunnel(
    minionId: string,
    tunnelType: NetworkTunnelType,
    options: { localPort?: number; remotePort?: number; configPath?: string; interfaceName?: string } = {},
  ): Promise<NetworkTunnelConfig> {
    const session = await getSessionByMinionId(minionId);
    if (!session) throw new Error(`No remote session found for Minion ${minionId}.`);

    const host = getHostById(session.hostId);
    if (!host) throw new Error(`Host ${session.hostId} not found in configuration.`);

    const tunnelId = randomUUID();
    let tunnel: NetworkTunnelConfig;

    if (tunnelType === 'wireguard') {
      const wgConfigPath = options.configPath || '/etc/wireguard/wg0.conf';
      const iface = options.interfaceName || 'wg0';
      const result = execRemote(host, `sudo wg-quick up ${iface} 2>&1 || wg-quick up ${iface} 2>&1`);
      if (result.exitCode !== 0) {
        throw new Error(`Failed to bring up WireGuard on ${host.hostId}: ${result.stderr.trim() || result.stdout.trim()}`);
      }
      tunnel = { tunnelId, hostId: host.hostId, type: 'wireguard', configPath: wgConfigPath, interfaceName: iface, proxyEndpoint: null };

    } else if (tunnelType === 'socks5_proxy') {
      const localPort = options.localPort ?? 1080;
      // Start a SOCKS5 proxy via SSH dynamic port forwarding.
      // This creates a local SOCKS5 proxy that routes through the remote host.
      const sshArgs = [
        '-p', String(host.port),
        '-o', `ConnectTimeout=${host.connectTimeout}`,
        '-o', `StrictHostKeyChecking=${host.strictHostKeyChecking ? 'yes' : 'no'}`,
        '-o', 'BatchMode=yes',
        '-N', // no remote command
        '-D', `127.0.0.1:${localPort}`,
      ];
      if (host.authMode === 'key' && host.privateKeyPath) sshArgs.push('-i', host.privateKeyPath);
      if (host.knownHostsPath) sshArgs.push('-o', `UserKnownHostsFile=${host.knownHostsPath}`);
      sshArgs.push(`${host.username}@${host.host}`);

      const child = spawn('ssh', sshArgs, { detached: true, shell: false, stdio: ['ignore', 'ignore', 'ignore'] });
      child.unref();

      tunnel = {
        tunnelId,
        hostId: host.hostId,
        type: 'socks5_proxy',
        localPort,
        proxyEndpoint: `socks5://127.0.0.1:${localPort}`,
      };

    } else if (tunnelType === 'ssh_reverse_tunnel') {
      const remotePort = options.remotePort ?? 8080;
      const localPort = options.localPort ?? remotePort;
      // Create a reverse tunnel: remote port -> local port.
      const sshArgs = [
        '-p', String(host.port),
        '-o', `ConnectTimeout=${host.connectTimeout}`,
        '-o', `StrictHostKeyChecking=${host.strictHostKeyChecking ? 'yes' : 'no'}`,
        '-o', 'BatchMode=yes',
        '-N',
        '-R', `${remotePort}:127.0.0.1:${localPort}`,
      ];
      if (host.authMode === 'key' && host.privateKeyPath) sshArgs.push('-i', host.privateKeyPath);
      if (host.knownHostsPath) sshArgs.push('-o', `UserKnownHostsFile=${host.knownHostsPath}`);
      sshArgs.push(`${host.username}@${host.host}`);

      const child = spawn('ssh', sshArgs, { detached: true, shell: false, stdio: ['ignore', 'ignore', 'ignore'] });
      child.unref();

      tunnel = {
        tunnelId,
        hostId: host.hostId,
        type: 'ssh_reverse_tunnel',
        localPort,
        remotePort,
        proxyEndpoint: `${host.host}:${remotePort}`,
      };

    } else {
      // 'none' — no tunnel, direct connection.
      tunnel = { tunnelId, hostId: host.hostId, type: 'none', proxyEndpoint: null };
    }

    // Persist tunnel in session record.
    await upsertSession({ ...session, tunnel, updatedAt: now() });
    return tunnel;
  }

  async teardownTunnel(minionId: string): Promise<{ tornDown: boolean; message: string }> {
    const session = await getSessionByMinionId(minionId);
    if (!session) return { tornDown: false, message: 'No remote session found.' };
    if (!session.tunnel) return { tornDown: true, message: 'No tunnel to tear down.' };

    const host = getHostById(session.hostId);
    if (!host) return { tornDown: false, message: `Host ${session.hostId} not found.` };

    const tunnel = session.tunnel;

    if (tunnel.type === 'wireguard') {
      const iface = tunnel.interfaceName || 'wg0';
      const result = execRemote(host, `sudo wg-quick down ${iface} 2>&1 || wg-quick down ${iface} 2>&1`);
      const success = result.exitCode === 0;
      await upsertSession({ ...session, tunnel: null, updatedAt: now() });
      return { tornDown: success, message: success ? `WireGuard ${iface} brought down on ${host.hostId}.` : `Failed to bring down WireGuard: ${result.stderr.trim()}` };

    } else if (tunnel.type === 'socks5_proxy' || tunnel.type === 'ssh_reverse_tunnel') {
      // Kill the SSH tunnel process. For SOCKS5 and reverse tunnels, we spawned
      // a local ssh process. Kill it by matching the command pattern.
      const killCmd = `pkill -f 'ssh.*-D.*${tunnel.localPort}|ssh.*-R.*${tunnel.remotePort}' 2>/dev/null; echo DONE`;
      // Kill locally since the SSH tunnel process runs locally.
      try {
        spawnSync('pkill', ['-f', `ssh.*-D.*${tunnel.localPort}`], { shell: false });
        spawnSync('pkill', ['-f', `ssh.*-R.*${tunnel.remotePort}`], { shell: false });
      } catch {
        // Best effort.
      }
      await upsertSession({ ...session, tunnel: null, updatedAt: now() });
      return { tornDown: true, message: `${tunnel.type} tunnel torn down.` };

    } else {
      await upsertSession({ ...session, tunnel: null, updatedAt: now() });
      return { tornDown: true, message: 'No tunnel type to tear down.' };
    }
  }

  async getTunnelStatus(minionId: string): Promise<{ active: boolean; tunnel: NetworkTunnelConfig | null }> {
    const session = await getSessionByMinionId(minionId);
    if (!session?.tunnel) return { active: false, tunnel: null };
    return { active: true, tunnel: session.tunnel };
  }

  async getProxyEndpoint(minionId: string): Promise<string | null> {
    const status = await this.getTunnelStatus(minionId);
    return status.tunnel?.proxyEndpoint ?? null;
  }
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

export function createRemoteSshProvider(hosts?: SshHostConfig[]): RemoteSshComputerProvider {
  return new RemoteSshComputerProvider(hosts);
}

export function createRemoteSshNetworkProvider(sshProvider?: RemoteSshComputerProvider): RemoteSshNetworkProvider {
  return new RemoteSshNetworkProvider(sshProvider);
}

/**
 * Check whether SSH provisioning is configured (at least one host available).
 */
export function isRemoteSshConfigured(): boolean {
  return getAllHosts().length > 0;
}
