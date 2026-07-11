import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type { CurrentUserIdentity } from './current-user';

// ---------------------------------------------------------------------------
// Network Provider — configures residential proxy, VPN tunnel, or direct
// datacenter connection for each Minion runtime.
//
// Connection modes:
//   • socks5_proxy   — SOCKS5 residential/datacenter proxy
//   • wireguard_vpn  — WireGuard tunnel interface
//   • direct         — no proxy or tunnel (datacenter direct)
// ---------------------------------------------------------------------------

export type NetworkConnectionMode = 'socks5_proxy' | 'wireguard_vpn' | 'direct';
export type NetworkProviderStatus = 'disabled' | 'planned' | 'configured' | 'connected';
export type NetworkHealthState = 'unknown' | 'connected' | 'disconnected' | 'degraded' | 'error';

export type Socks5ProxyConfig = {
  host: string;
  port: number;
  username: string | null;
  passwordRef: string | null;
  proxyType: 'residential' | 'datacenter' | 'isp';
  rotationPolicy: 'sticky' | 'per_session' | 'per_request';
  countryCode: string | null;
};

export type WireGuardTunnelConfig = {
  interfaceName: string;
  privateKeyRef: string | null;
  publicKey: string | null;
  endpoint: string;
  allowedIps: string[];
  dnsServers: string[];
  mtu: number;
  persistentKeepalive: number | null;
};

export type DirectConnectionConfig = {
  countryCode: string | null;
  ispName: string | null;
  datacenterName: string | null;
};

export type NetworkConnectionConfig =
  | { mode: 'socks5_proxy'; socks5: Socks5ProxyConfig }
  | { mode: 'wireguard_vpn'; wireguard: WireGuardTunnelConfig }
  | { mode: 'direct'; direct: DirectConnectionConfig };

export type NetworkProviderReadinessCheck = {
  label: string;
  status: NetworkProviderStatus;
  required: boolean;
  envVar?: string;
};

export type NetworkEgressInfo = {
  ipAddress: string | null;
  countryCode: string | null;
  city: string | null;
  ispName: string | null;
  connectionMode: NetworkConnectionMode;
  proxyType: Socks5ProxyConfig['proxyType'] | null;
  collectedAt: string | null;
};

export type NetworkProviderState = {
  minionId: string;
  ownerUserId: string;
  config: NetworkConnectionConfig;
  status: NetworkProviderStatus;
  health: NetworkHealthState;
  healthFailureReason: string | null;
  egress: NetworkEgressInfo | null;
  lastConnectedAt: string | null;
  lastHealthCheckAt: string | null;
  logs: string[];
  createdAt: string;
  updatedAt: string;
};

export type NetworkProviderSummary = {
  minionId: string;
  mode: NetworkConnectionMode;
  status: NetworkProviderStatus;
  health: NetworkHealthState;
  label: string;
  detail: string;
  egressCountry: string | null;
  updatedAt: string;
};

export interface NetworkProvider {
  providerName: string;
  checkReadiness(): NetworkProviderReadinessCheck[];
  configureConnection(minionId: string, config: NetworkConnectionConfig): Promise<NetworkProviderState>;
  connect(minionId: string): Promise<NetworkProviderState>;
  disconnect(minionId: string): Promise<NetworkProviderState>;
  getStatus(minionId: string): Promise<NetworkProviderState>;
  healthCheck(minionId: string): Promise<NetworkProviderState>;
  getEgressInfo(minionId: string): Promise<NetworkEgressInfo | null>;
  summarize(minionId: string): Promise<NetworkProviderSummary>;
}

// ---------------------------------------------------------------------------
// Persistence — local JSON file store (same pattern as credential-store.ts)
// ---------------------------------------------------------------------------

type NetworkProviderStore = { providers: NetworkProviderState[] };

const storePath = path.join(process.cwd(), '.data', 'network-providers.json');

function now() {
  return new Date().toISOString();
}

function hasEnv(name: string) {
  return Boolean(process.env[name]?.trim());
}

function env(name: string): string | null {
  const value = process.env[name]?.trim();
  return value || null;
}

async function readStore(): Promise<NetworkProviderStore> {
  try {
    return JSON.parse(await readFile(storePath, 'utf8')) as NetworkProviderStore;
  } catch {
    return { providers: [] };
  }
}

async function writeStore(store: NetworkProviderStore) {
  await mkdir(path.dirname(storePath), { recursive: true });
  await writeFile(storePath, JSON.stringify(store, null, 2));
}

async function readProvider(minionId: string): Promise<NetworkProviderState | null> {
  const store = await readStore();
  return store.providers.find((p) => p.minionId === minionId) ?? null;
}

async function writeProvider(state: NetworkProviderState): Promise<NetworkProviderState> {
  const store = await readStore();
  const index = store.providers.findIndex((p) => p.minionId === state.minionId);
  if (index >= 0) store.providers[index] = state;
  else store.providers.push(state);
  await writeStore(store);
  return state;
}

// ---------------------------------------------------------------------------
// Config validation, defaults, and helpers
// ---------------------------------------------------------------------------

export function defaultSocks5Config(): Socks5ProxyConfig {
  return {
    host: env('MINIONMINT_PROXY_HOST') ?? '127.0.0.1',
    port: Number.parseInt(env('MINIONMINT_PROXY_PORT') ?? '1080', 10) || 1080,
    username: env('MINIONMINT_PROXY_USERNAME'),
    passwordRef: env('MINIONMINT_PROXY_PASSWORD_REF'),
    proxyType: (env('MINIONMINT_PROXY_TYPE') as Socks5ProxyConfig['proxyType']) ?? 'residential',
    rotationPolicy: (env('MINIONMINT_PROXY_ROTATION') as Socks5ProxyConfig['rotationPolicy']) ?? 'sticky',
    countryCode: env('MINIONMINT_PROXY_COUNTRY_CODE'),
  };
}

export function defaultWireGuardConfig(): WireGuardTunnelConfig {
  return {
    interfaceName: env('MINIONMINT_WG_INTERFACE') ?? 'wg0',
    privateKeyRef: env('MINIONMINT_WG_PRIVATE_KEY_REF'),
    publicKey: env('MINIONMINT_WG_PUBLIC_KEY'),
    endpoint: env('MINIONMINT_WG_ENDPOINT') ?? '',
    allowedIps: env('MINIONMINT_WG_ALLOWED_IPS')?.split(',').map((s) => s.trim()).filter(Boolean) ?? ['0.0.0.0/0'],
    dnsServers: env('MINIONMINT_WG_DNS')?.split(',').map((s) => s.trim()).filter(Boolean) ?? ['1.1.1.1'],
    mtu: Number.parseInt(env('MINIONMINT_WG_MTU') ?? '1420', 10) || 1420,
    persistentKeepalive: env('MINIONMINT_WG_KEEPALIVE') ? Number.parseInt(env('MINIONMINT_WG_KEEPALIVE')!, 10) : null,
  };
}

export function defaultDirectConfig(): DirectConnectionConfig {
  return {
    countryCode: env('MINIONMINT_DIRECT_COUNTRY_CODE'),
    ispName: env('MINIONMINT_DIRECT_ISP'),
    datacenterName: env('MINIONMINT_DIRECT_DATACENTER'),
  };
}

export function defaultConnectionConfig(): NetworkConnectionConfig {
  const mode = (env('MINIONMINT_NETWORK_MODE') ?? 'direct') as NetworkConnectionMode;
  if (mode === 'socks5_proxy') return { mode, socks5: defaultSocks5Config() };
  if (mode === 'wireguard_vpn') return { mode, wireguard: defaultWireGuardConfig() };
  return { mode: 'direct', direct: defaultDirectConfig() };
}

export function validateConnectionConfig(config: NetworkConnectionConfig): string[] {
  const errors: string[] = [];
  if (config.mode === 'socks5_proxy') {
    const s = config.socks5;
    if (!s.host) errors.push('SOCKS5 proxy host is required.');
    if (!s.port || s.port < 1 || s.port > 65535) errors.push('SOCKS5 proxy port must be between 1 and 65535.');
    if (s.username && !s.passwordRef) errors.push('SOCKS5 proxy username requires a passwordRef.');
  }
  if (config.mode === 'wireguard_vpn') {
    const w = config.wireguard;
    if (!w.endpoint) errors.push('WireGuard endpoint is required.');
    if (!w.privateKeyRef) errors.push('WireGuard privateKeyRef is required.');
    if (!w.publicKey) errors.push('WireGuard publicKey is required.');
    if (!w.allowedIps.length) errors.push('WireGuard allowedIps must not be empty.');
    if (w.mtu < 576 || w.mtu > 9000) errors.push('WireGuard MTU must be between 576 and 9000.');
  }
  return errors;
}

function modeLabel(config: NetworkConnectionConfig): string {
  if (config.mode === 'socks5_proxy') return `SOCKS5 ${config.socks5.proxyType} proxy`;
  if (config.mode === 'wireguard_vpn') return `WireGuard tunnel (${config.wireguard.interfaceName})`;
  return 'Direct datacenter connection';
}

function modeDetail(config: NetworkConnectionConfig): string {
  if (config.mode === 'socks5_proxy') {
    const s = config.socks5;
    const auth = s.username ? ' authenticated' : '';
    return `${s.host}:${s.port}${auth} · ${s.rotationPolicy} rotation${s.countryCode ? ' · ' + s.countryCode : ''}`;
  }
  if (config.mode === 'wireguard_vpn') {
    const w = config.wireguard;
    return `${w.endpoint} via ${w.interfaceName} · MTU ${w.mtu}`;
  }
  const d = config.direct;
  return `${d.datacenterName ?? 'unspecified datacenter'}${d.countryCode ? ' · ' + d.countryCode : ''}`;
}

// ---------------------------------------------------------------------------
// Readiness
// ---------------------------------------------------------------------------

export function getNetworkReadinessChecks(mode: NetworkConnectionMode = defaultConnectionConfig().mode): NetworkProviderReadinessCheck[] {
  const checks: NetworkProviderReadinessCheck[] = [
    { label: 'Network mode selected', status: hasEnv('MINIONMINT_NETWORK_MODE') ? 'configured' : 'planned', required: true, envVar: 'MINIONMINT_NETWORK_MODE' },
  ];

  if (mode === 'socks5_proxy') {
    checks.push(
      { label: 'SOCKS5 proxy host', status: hasEnv('MINIONMINT_PROXY_HOST') ? 'configured' : 'planned', required: true, envVar: 'MINIONMINT_PROXY_HOST' },
      { label: 'SOCKS5 proxy port', status: hasEnv('MINIONMINT_PROXY_PORT') ? 'configured' : 'planned', required: true, envVar: 'MINIONMINT_PROXY_PORT' },
      { label: 'SOCKS5 proxy type', status: hasEnv('MINIONMINT_PROXY_TYPE') ? 'configured' : 'planned', required: false, envVar: 'MINIONMINT_PROXY_TYPE' },
      { label: 'Proxy authentication', status: hasEnv('MINIONMINT_PROXY_USERNAME') && hasEnv('MINIONMINT_PROXY_PASSWORD_REF') ? 'configured' : 'planned', required: false, envVar: 'MINIONMINT_PROXY_USERNAME' },
      { label: 'Proxy rotation policy', status: hasEnv('MINIONMINT_PROXY_ROTATION') ? 'configured' : 'planned', required: false, envVar: 'MINIONMINT_PROXY_ROTATION' },
    );
  }

  if (mode === 'wireguard_vpn') {
    checks.push(
      { label: 'WireGuard endpoint', status: hasEnv('MINIONMINT_WG_ENDPOINT') ? 'configured' : 'planned', required: true, envVar: 'MINIONMINT_WG_ENDPOINT' },
      { label: 'WireGuard private key ref', status: hasEnv('MINIONMINT_WG_PRIVATE_KEY_REF') ? 'configured' : 'planned', required: true, envVar: 'MINIONMINT_WG_PRIVATE_KEY_REF' },
      { label: 'WireGuard public key', status: hasEnv('MINIONMINT_WG_PUBLIC_KEY') ? 'configured' : 'planned', required: true, envVar: 'MINIONMINT_WG_PUBLIC_KEY' },
      { label: 'WireGuard interface name', status: hasEnv('MINIONMINT_WG_INTERFACE') ? 'configured' : 'planned', required: false, envVar: 'MINIONMINT_WG_INTERFACE' },
      { label: 'WireGuard allowed IPs', status: hasEnv('MINIONMINT_WG_ALLOWED_IPS') ? 'configured' : 'planned', required: false, envVar: 'MINIONMINT_WG_ALLOWED_IPS' },
    );
  }

  if (mode === 'direct') {
    checks.push(
      { label: 'Direct connection country', status: hasEnv('MINIONMINT_DIRECT_COUNTRY_CODE') ? 'configured' : 'planned', required: false, envVar: 'MINIONMINT_DIRECT_COUNTRY_CODE' },
      { label: 'Direct connection datacenter', status: hasEnv('MINIONMINT_DIRECT_DATACENTER') ? 'configured' : 'planned', required: false, envVar: 'MINIONMINT_DIRECT_DATACENTER' },
    );
  }

  return checks;
}

export function isNetworkConfigured(mode: NetworkConnectionMode = defaultConnectionConfig().mode): boolean {
  return getNetworkReadinessChecks(mode).every((c) => !c.required || c.status === 'configured' || c.status === 'connected');
}

// ---------------------------------------------------------------------------
// Egress detection (simulated / stubbed — real implementation would call an
// IP geolocation API or read local interface state)
// ---------------------------------------------------------------------------

async function detectEgress(config: NetworkConnectionConfig): Promise<NetworkEgressInfo> {
  const collectedAt = now();

  if (config.mode === 'direct') {
    return {
      ipAddress: env('MINIONMINT_DIRECT_IP') ?? null,
      countryCode: config.direct.countryCode,
      city: null,
      ispName: config.direct.ispName ?? config.direct.datacenterName,
      connectionMode: 'direct',
      proxyType: null,
      collectedAt,
    };
  }

  if (config.mode === 'socks5_proxy') {
    return {
      ipAddress: null,
      countryCode: config.socks5.countryCode,
      city: null,
      ispName: config.socks5.proxyType === 'residential' ? 'Residential ISP' : config.socks5.proxyType === 'isp' ? 'ISP proxy' : 'Datacenter',
      connectionMode: 'socks5_proxy',
      proxyType: config.socks5.proxyType,
      collectedAt,
    };
  }

  // wireguard_vpn
  return {
    ipAddress: null,
    countryCode: env('MINIONMINT_WG_COUNTRY_CODE'),
    city: null,
    ispName: 'VPN tunnel',
    connectionMode: 'wireguard_vpn',
    proxyType: null,
    collectedAt,
  };
}

// ---------------------------------------------------------------------------
// Concrete NetworkProvider implementation
// ---------------------------------------------------------------------------

export class DefaultNetworkProvider implements NetworkProvider {
  providerName = 'default';

  checkReadiness() {
    return getNetworkReadinessChecks();
  }

  async configureConnection(minionId: string, config: NetworkConnectionConfig): Promise<NetworkProviderState> {
    const errors = validateConnectionConfig(config);
    const ts = now();
    const existing = await readProvider(minionId);

    if (errors.length) {
      const state: NetworkProviderState = {
        minionId,
        ownerUserId: existing?.ownerUserId ?? 'unknown',
        config,
        status: 'planned',
        health: 'unknown',
        healthFailureReason: errors.join(' '),
        egress: null,
        lastConnectedAt: existing?.lastConnectedAt ?? null,
        lastHealthCheckAt: existing?.lastHealthCheckAt ?? null,
        logs: [...(existing?.logs ?? []), `[${ts}] Configuration rejected: ${errors.join(' ')}`],
        createdAt: existing?.createdAt ?? ts,
        updatedAt: ts,
      };
      return writeProvider(state);
    }

    const state: NetworkProviderState = {
      minionId,
      ownerUserId: existing?.ownerUserId ?? 'unknown',
      config,
      status: 'configured',
      health: 'unknown',
      healthFailureReason: null,
      egress: null,
      lastConnectedAt: existing?.lastConnectedAt ?? null,
      lastHealthCheckAt: existing?.lastHealthCheckAt ?? null,
      logs: [...(existing?.logs ?? []), `[${ts}] Network configuration set to ${modeLabel(config)} (${modeDetail(config)}).`],
      createdAt: existing?.createdAt ?? ts,
      updatedAt: ts,
    };
    return writeProvider(state);
  }

  async connect(minionId: string): Promise<NetworkProviderState> {
    const existing = await readProvider(minionId);
    if (!existing) throw new Error(`No network configuration found for Minion ${minionId}.`);
    const ts = now();

    const readiness = getNetworkReadinessChecks(existing.config.mode);
    const missing = readiness.filter((c) => c.required && c.status !== 'configured' && c.status !== 'connected');
    if (missing.length) {
      const state: NetworkProviderState = {
        ...existing,
        status: 'planned',
        health: 'disconnected',
        healthFailureReason: `Missing required configuration: ${missing.map((m) => m.label).join(', ')}.`,
        logs: [...existing.logs, `[${ts}] Connection blocked: missing ${missing.map((m) => m.label).join(', ')}.`],
        updatedAt: ts,
      };
      return writeProvider(state);
    }

    const egress = await detectEgress(existing.config);
    const state: NetworkProviderState = {
      ...existing,
      status: 'connected',
      health: 'connected',
      healthFailureReason: null,
      egress,
      lastConnectedAt: ts,
      lastHealthCheckAt: ts,
      logs: [...existing.logs, `[${ts}] Network connected via ${modeLabel(existing.config)}. Egress: ${egress.countryCode ?? 'unknown'}.`],
      updatedAt: ts,
    };
    return writeProvider(state);
  }

  async disconnect(minionId: string): Promise<NetworkProviderState> {
    const existing = await readProvider(minionId);
    if (!existing) throw new Error(`No network configuration found for Minion ${minionId}.`);
    const ts = now();

    const state: NetworkProviderState = {
      ...existing,
      status: 'configured',
      health: 'disconnected',
      healthFailureReason: null,
      egress: null,
      logs: [...existing.logs, `[${ts}] Network disconnected from ${modeLabel(existing.config)}.`],
      updatedAt: ts,
    };
    return writeProvider(state);
  }

  async getStatus(minionId: string): Promise<NetworkProviderState> {
    return (await readProvider(minionId)) ?? this.createDefault(minionId);
  }

  async healthCheck(minionId: string): Promise<NetworkProviderState> {
    const existing = await readProvider(minionId);
    if (!existing) throw new Error(`No network configuration found for Minion ${minionId}.`);
    const ts = now();

    let health: NetworkHealthState = 'unknown';
    let failureReason: string | null = null;

    if (existing.status === 'connected') {
      const egress = await detectEgress(existing.config);
      if (egress.connectionMode === existing.config.mode) {
        health = 'connected';
      } else {
        health = 'degraded';
        failureReason = 'Egress info does not match configured connection mode.';
      }
    } else if (existing.status === 'configured') {
      health = 'disconnected';
      failureReason = 'Network is configured but not connected.';
    } else {
      health = 'disconnected';
      failureReason = `Network status is ${existing.status}.`;
    }

    const state: NetworkProviderState = {
      ...existing,
      health,
      healthFailureReason: failureReason,
      lastHealthCheckAt: ts,
      logs: [...existing.logs, `[${ts}] Health check: ${health}${failureReason ? ' — ' + failureReason : ''}.`],
      updatedAt: ts,
    };
    return writeProvider(state);
  }

  async getEgressInfo(minionId: string): Promise<NetworkEgressInfo | null> {
    const existing = await readProvider(minionId);
    if (!existing) return null;
    if (existing.egress) return existing.egress;
    return detectEgress(existing.config);
  }

  async summarize(minionId: string): Promise<NetworkProviderSummary> {
    const existing = await this.getStatus(minionId);
    return {
      minionId,
      mode: existing.config.mode,
      status: existing.status,
      health: existing.health,
      label: modeLabel(existing.config),
      detail: modeDetail(existing.config),
      egressCountry: existing.egress?.countryCode ?? null,
      updatedAt: existing.updatedAt,
    };
  }

  private createDefault(minionId: string): NetworkProviderState {
    const ts = now();
    return {
      minionId,
      ownerUserId: 'unknown',
      config: defaultConnectionConfig(),
      status: 'disabled',
      health: 'unknown',
      healthFailureReason: null,
      egress: null,
      lastConnectedAt: null,
      lastHealthCheckAt: null,
      logs: [`[${ts}] Network provider initialized with default configuration.`],
      createdAt: ts,
      updatedAt: ts,
    };
  }
}

// ---------------------------------------------------------------------------
// Factory & user-scoped helpers
// ---------------------------------------------------------------------------

export function getNetworkProvider(): NetworkProvider {
  return new DefaultNetworkProvider();
}

export async function configureNetworkForMinion(identity: CurrentUserIdentity, minionId: string, config: NetworkConnectionConfig): Promise<NetworkProviderState> {
  const provider = getNetworkProvider();
  const state = await provider.configureConnection(minionId, config);
  state.ownerUserId = identity.userId;
  return writeProvider(state);
}

export async function getNetworkProviderForMinion(minionId: string): Promise<NetworkProviderState | null> {
  return readProvider(minionId);
}
