import { spawn } from 'node:child_process';
import { mkdir, writeFile, readFile, access } from 'node:fs/promises';
import path from 'node:path';

export type HermesInstallStatus = 'not_installed' | 'installing' | 'installed' | 'install_failed' | 'version_mismatch';

export type HermesInstallResult = {
  status: HermesInstallStatus;
  version: string | null;
  path: string | null;
  message: string;
  installedAt: string | null;
};

export type HermesReadinessCheck = {
  label: string;
  passed: boolean;
  detail: string;
};

export type HermesReadinessResult = {
  ready: boolean;
  checks: HermesReadinessCheck[];
  version: string | null;
  installPath: string | null;
};

const HERMES_INSTALL_SCRIPT = 'https://raw.githubusercontent.com/NousResearch/hermes-agent/main/scripts/install.sh';
const HERMES_BIN_NAMES = ['hermes', 'hermes-agent'];

function exec(command: string, options: { cwd?: string; timeout?: number; env?: NodeJS.ProcessEnv } = {}): Promise<{ stdout: string; stderr: string; exitCode: number }> {
  return new Promise((resolve) => {
    const child = spawn('bash', ['-c', command], {
      cwd: options.cwd || process.cwd(),
      timeout: options.timeout || 60000,
      env: { ...process.env, ...options.env },
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let stdout = '';
    let stderr = '';
    child.stdout?.on('data', (d) => { stdout += d.toString(); });
    child.stderr?.on('data', (d) => { stderr += d.toString(); });
    child.on('close', (code) => {
      resolve({ stdout: stdout.trim(), stderr: stderr.trim(), exitCode: code ?? -1 });
    });
    child.on('error', () => {
      resolve({ stdout: '', stderr: 'spawn error', exitCode: -1 });
    });
  });
}

export async function detectHermesInstall(workspaceRoot?: string): Promise<HermesInstallResult> {
  const { stdout, exitCode } = await exec('which hermes 2>/dev/null || which hermes-agent 2>/dev/null || echo NOT_FOUND', {
    cwd: workspaceRoot,
    timeout: 10000,
  });

  if (stdout === 'NOT_FOUND' || exitCode !== 0) {
    return {
      status: 'not_installed',
      version: null,
      path: null,
      message: 'Hermes Agent binary not found on the target machine.',
      installedAt: null,
    };
  }

  const hermesPath = stdout.trim().split('\n')[0];
  const { stdout: versionOut } = await exec(`${hermesPath} --version 2>/dev/null || echo UNKNOWN`, {
    cwd: workspaceRoot,
    timeout: 10000,
  });

  return {
    status: 'installed',
    version: versionOut.trim() || 'unknown',
    path: hermesPath,
    message: `Hermes Agent found at ${hermesPath}.`,
    installedAt: null,
  };
}

export async function installHermes(workspaceRoot: string): Promise<HermesInstallResult> {
  await mkdir(workspaceRoot, { recursive: true });

  const existing = await detectHermesInstall(workspaceRoot);
  if (existing.status === 'installed') {
    return existing;
  }

  const installScriptEnv: Record<string, string | undefined> = {};
  if (process.env.MINIONMINT_HERMES_INSTALL_URL) {
    installScriptEnv.HERMES_INSTALL_URL = process.env.MINIONMINT_HERMES_INSTALL_URL;
  }
  const mergedEnv = { ...process.env, ...installScriptEnv };

  const { stdout, stderr, exitCode } = await exec(
    `curl -fsSL ${process.env.MINIONMINT_HERMES_INSTALL_URL || HERMES_INSTALL_SCRIPT} | bash`,
    { cwd: workspaceRoot, timeout: 300000, env: mergedEnv },
  );

  if (exitCode !== 0) {
    return {
      status: 'install_failed',
      version: null,
      path: null,
      message: `Hermes installation failed. stderr: ${stderr.slice(0, 500)}`,
      installedAt: null,
    };
  }

  const verify = await detectHermesInstall(workspaceRoot);
  return {
    ...verify,
    message: verify.status === 'installed'
      ? `Hermes Agent installed successfully at ${verify.path}.`
      : `Install script ran but Hermes binary not detected. stdout: ${stdout.slice(0, 200)}`,
    installedAt: new Date().toISOString(),
  };
}

export async function verifyHermesReadiness(
  workspaceRoot: string,
  hermesProfilePath: string,
  hermesConfigPath: string,
): Promise<HermesReadinessResult> {
  const checks: HermesReadinessCheck[] = [];

  const install = await detectHermesInstall(workspaceRoot);
  checks.push({
    label: 'Hermes binary installed',
    passed: install.status === 'installed',
    detail: install.message,
  });

  try {
    await access(hermesConfigPath);
    const configContent = await readFile(hermesConfigPath, 'utf8');
    const config = JSON.parse(configContent);
    checks.push({
      label: 'Hermes profile config exists and is valid JSON',
      passed: true,
      detail: `Config for Minion: ${config.minionName || config.profile || 'unknown'}`,
    });
    checks.push({
      label: 'Config has mission field',
      passed: Boolean(config.mission),
      detail: config.mission ? `Mission: ${String(config.mission).slice(0, 100)}` : 'Missing mission field',
    });
    checks.push({
      label: 'Config has model field',
      passed: Boolean(config.model),
      detail: config.model ? `Model: ${config.model}` : 'Missing model field',
    });
    checks.push({
      label: 'Config has allowedTools field',
      passed: Array.isArray(config.allowedTools) && config.allowedTools.length > 0,
      detail: config.allowedTools ? `Tools: ${config.allowedTools.join(', ')}` : 'Missing allowedTools field',
    });
    checks.push({
      label: 'Config has approvalRails',
      passed: Array.isArray(config.approvalRails) && config.approvalRails.length > 0,
      detail: config.approvalRails ? `${config.approvalRails.length} approval rail(s)` : 'Missing approvalRails field',
    });
  } catch {
    checks.push({
      label: 'Hermes profile config exists and is valid JSON',
      passed: false,
      detail: `Config file not found or invalid at ${hermesConfigPath}`,
    });
  }

  try {
    await access(path.join(hermesProfilePath, 'config.json'));
    checks.push({
      label: 'Profile directory accessible',
      passed: true,
      detail: `Profile path: ${hermesProfilePath}`,
    });
  } catch {
    checks.push({
      label: 'Profile directory accessible',
      passed: false,
      detail: `Profile directory not accessible at ${hermesProfilePath}`,
    });
  }

  if (install.status === 'installed' && install.path) {
    const { stdout, exitCode } = await exec(
      `${install.path} chat -q "Reply with exactly: minion-ready" --quiet 2>/dev/null || echo CHECK_FAILED`,
      { cwd: workspaceRoot, timeout: 30000 },
    );
    const ready = exitCode === 0 && stdout.includes('minion-ready');
    checks.push({
      label: 'Hermes responds to query',
      passed: ready,
      detail: ready ? 'Hermes responded correctly.' : `Hermes query returned: ${stdout.slice(0, 200)}`,
    });
  }

  const allPassed = checks.every((c) => c.passed);
  return {
    ready: allPassed,
    checks,
    version: install.version,
    installPath: install.path,
  };
}

export async function deployBrowserProfile(
  workspaceRoot: string,
  minionId: string,
  options: { visibleDesktop?: boolean; residentialProxy?: string } = {},
): Promise<{ success: boolean; message: string; profilePath: string }> {
  const browserProfileDir = path.join(workspaceRoot, 'browser-profile');
  await mkdir(browserProfileDir, { recursive: true });

  const profileConfig: Record<string, unknown> = {
    minionId,
    browserType: 'chrome',
    visibleDesktop: options.visibleDesktop ?? true,
    createdAt: new Date().toISOString(),
  };

  if (options.residentialProxy) {
    profileConfig.proxy = {
      type: 'socks5',
      address: options.residentialProxy,
      mode: 'persistent',
    };
  }

  const profileConfigPath = path.join(browserProfileDir, 'profile-config.json');
  await writeFile(profileConfigPath, JSON.stringify(profileConfig, null, 2));

  const launchScript = options.visibleDesktop
    ? `#!/bin/bash
export DISPLAY=:88
chromium-browser --user-data-dir="${browserProfileDir}" --no-first-run --disable-default-apps ${options.residentialProxy ? `--proxy-server="socks5://${options.residentialProxy}"` : ''} "$@"
`
    : `#!/bin/bash
chromium-browser --headless --user-data-dir="${browserProfileDir}" --no-first-run --disable-default-apps ${options.residentialProxy ? `--proxy-server="socks5://${options.residentialProxy}"` : ''} "$@"
`;

  const launchScriptPath = path.join(browserProfileDir, 'launch-browser.sh');
  await writeFile(launchScriptPath, launchScript);

  const { exitCode } = await exec(`chmod +x "${launchScriptPath}"`);
  if (exitCode !== 0) {
    return {
      success: false,
      message: 'Browser profile directory created but launch script could not be made executable.',
      profilePath: browserProfileDir,
    };
  }

  return {
    success: true,
    message: `Browser profile deployed at ${browserProfileDir}. ${options.residentialProxy ? `Residential proxy configured: ${options.residentialProxy}` : 'No proxy configured.'}`,
    profilePath: browserProfileDir,
  };
}
