import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type { CurrentUserIdentity } from './current-user';
import type { OnboardingPlan } from './onboarding';
import { buildHermesConfigPreview, getProvisioningReadiness, type ComputerProviderName, type ProvisioningReadiness } from './provisioning';

export type RuntimeAction = 'prepare_workspace' | 'generate_config' | 'launch_minion' | 'open_workspace' | 'stop_minion' | 'status_check';
export type RuntimeStatus = 'blueprint_ready' | 'workspace_prepared' | 'config_generated' | 'launch_blocked' | 'running' | 'stopped';

export type HermesRuntimeConfigDraft = {
  version: 1;
  minionName: string;
  mission: string;
  modelProvider: string;
  model: string;
  allowedTools: string[];
  approvalRails: string[];
  memoryRules: string[];
  knowledgeVaultRefs: string[];
  credentialRefs: string[];
  stopTakeoverPolicy: string;
  workspacePlan: string;
  generatedAt: string;
};

export type RuntimeProcessSupervisor = {
  status: 'not_started' | 'launch_blocked' | 'running' | 'stopped';
  launchCommand: string | null;
  pid: number | null;
  lastSignal: string | null;
  updatedAt: string;
};

export type MinionRuntimeRecord = {
  id: string;
  minionId: string;
  ownerUserId: string;
  blueprintId: string;
  blueprintName: string;
  providerType: ComputerProviderName | 'not_selected';
  workspaceStatus: RuntimeStatus;
  hermesTemplateRef: string | null;
  credentialVaultRefs: string[];
  workspaceRoot: string | null;
  hermesProfilePath: string | null;
  hermesConfigPath: string | null;
  credentialVaultPath: string | null;
  workspaceUrl: string | null;
  processSupervisor: RuntimeProcessSupervisor;
  logs: string[];
  nextMissingImplementationStep: string;
  availableActions: RuntimeAction[];
  hermesConfigDraft: HermesRuntimeConfigDraft;
  createdAt: string;
  updatedAt: string;
};

type RuntimeStore = { runtimes: MinionRuntimeRecord[] };

type RuntimePaths = {
  workspaceRoot: string;
  hermesProfilePath: string;
  hermesConfigPath: string;
  credentialVaultPath: string;
  supervisorPath: string;
};

const runtimeStorePath = path.join(process.cwd(), '.data', 'minion-runtimes.json');

function slugify(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60) || 'minion-runtime';
}

function runtimeBaseDir() {
  return process.env.MINIONMINT_SELF_HOSTED_WORKSPACE_ROOT || path.join(process.cwd(), '.data', 'minion-workspaces');
}

function buildRuntimePaths(ownerUserId: string, minionId: string): RuntimePaths {
  const safeOwner = slugify(ownerUserId);
  const workspaceRoot = path.join(runtimeBaseDir(), safeOwner, minionId);
  const hermesProfilePath = path.join(workspaceRoot, 'hermes-profile');
  return {
    workspaceRoot,
    hermesProfilePath,
    hermesConfigPath: path.join(hermesProfilePath, 'config.json'),
    credentialVaultPath: path.join(workspaceRoot, 'credential-vault', 'refs.json'),
    supervisorPath: path.join(workspaceRoot, 'supervisor.json'),
  };
}

function workspaceUrlFor(paths: RuntimePaths) {
  return `file://${paths.workspaceRoot}`;
}

async function readRuntimeStore(): Promise<RuntimeStore> {
  try {
    const parsed = JSON.parse(await readFile(runtimeStorePath, 'utf8')) as RuntimeStore;
    return { runtimes: parsed.runtimes.map(normalizeRuntimeRecord) };
  } catch {
    return { runtimes: [] };
  }
}

async function writeRuntimeStore(store: RuntimeStore) {
  await mkdir(path.dirname(runtimeStorePath), { recursive: true });
  await writeFile(runtimeStorePath, JSON.stringify(store, null, 2));
}

function processSupervisor(status: RuntimeProcessSupervisor['status'], now: string, existing?: RuntimeProcessSupervisor): RuntimeProcessSupervisor {
  return {
    status,
    launchCommand: existing?.launchCommand ?? null,
    pid: existing?.pid ?? null,
    lastSignal: existing?.lastSignal ?? null,
    updatedAt: now,
  };
}

function normalizeRuntimeRecord(runtime: MinionRuntimeRecord): MinionRuntimeRecord {
  const now = runtime.updatedAt || new Date().toISOString();
  return {
    ...runtime,
    workspaceRoot: runtime.workspaceRoot ?? null,
    hermesProfilePath: runtime.hermesProfilePath ?? null,
    hermesConfigPath: runtime.hermesConfigPath ?? null,
    credentialVaultPath: runtime.credentialVaultPath ?? null,
    processSupervisor: runtime.processSupervisor ?? processSupervisor('not_started', now),
    availableActions: runtime.availableActions.includes('status_check') ? runtime.availableActions : [...runtime.availableActions, 'status_check'],
  };
}

export function buildHermesRuntimeConfigDraft(blueprint: OnboardingPlan, now = new Date().toISOString()): HermesRuntimeConfigDraft {
  const preview = buildHermesConfigPreview(blueprint);
  return {
    version: 1,
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
    workspacePlan: String(preview.workspacePlan || blueprint.workstationPlan),
    generatedAt: now,
  };
}

function nextStepFromReadiness(readiness: ProvisioningReadiness) {
  if (!readiness.selectedProvider) return 'Select a self-hosted or managed computer provider path.';
  if (readiness.hermesTemplate !== 'configured') return 'Configure a Hermes template or base image reference.';
  if (readiness.credentialVault !== 'configured') return 'Configure a credential vault provider and save encrypted credential references.';
  if (!readiness.canProvisionRealMinion) return `Resolve readiness: ${readiness.missingReadinessItems.join(', ')}.`;
  return 'Self-hosted runtime files can be prepared. Launch is blocked until a supervisor command is explicitly configured.';
}

function actionsForStatus(status: RuntimeStatus, readiness: ProvisioningReadiness): RuntimeAction[] {
  if (status === 'running') return ['open_workspace', 'status_check', 'stop_minion'];
  if (status === 'stopped') return ['prepare_workspace', 'status_check'];
  const actions: RuntimeAction[] = ['prepare_workspace', 'generate_config', 'status_check'];
  if (readiness.canProvisionRealMinion) actions.push('launch_minion');
  return actions;
}

export function buildInitialRuntimeRecord(identity: CurrentUserIdentity, blueprint: OnboardingPlan, blueprintId: string, readiness = getProvisioningReadiness()): MinionRuntimeRecord {
  const now = new Date().toISOString();
  const minionId = slugify(blueprint.agentSpec.name || blueprint.projectName);
  const hermesConfigDraft = buildHermesRuntimeConfigDraft(blueprint, now);
  const paths = readiness.selectedProvider === 'self_hosted' ? buildRuntimePaths(identity.userId, minionId) : null;
  return {
    id: `runtime-${minionId}`,
    minionId,
    ownerUserId: identity.userId,
    blueprintId,
    blueprintName: blueprint.projectName,
    providerType: readiness.selectedProvider ?? 'not_selected',
    workspaceStatus: paths ? 'workspace_prepared' : 'config_generated',
    hermesTemplateRef: process.env.MINIONMINT_HERMES_TEMPLATE_REF || null,
    credentialVaultRefs: hermesConfigDraft.credentialRefs,
    workspaceRoot: paths?.workspaceRoot ?? null,
    hermesProfilePath: paths?.hermesProfilePath ?? null,
    hermesConfigPath: paths?.hermesConfigPath ?? null,
    credentialVaultPath: paths?.credentialVaultPath ?? null,
    workspaceUrl: paths ? workspaceUrlFor(paths) : null,
    processSupervisor: processSupervisor('not_started', now),
    logs: [
      `Runtime record created for ${blueprint.projectName}.`,
      'Hermes config draft generated from approved Minion Blueprint.',
      'Launch blocked until approval rails and workspace prerequisites are present.',
      `Next missing implementation step: ${nextStepFromReadiness(readiness)}`,
    ],
    nextMissingImplementationStep: nextStepFromReadiness(readiness),
    availableActions: actionsForStatus(paths ? 'workspace_prepared' : 'config_generated', readiness),
    hermesConfigDraft,
    createdAt: now,
    updatedAt: now,
  };
}

function renderHermesProfileConfig(runtime: MinionRuntimeRecord) {
  return {
    profile: runtime.minionId,
    ownerUserId: runtime.ownerUserId,
    minionName: runtime.hermesConfigDraft.minionName,
    mission: runtime.hermesConfigDraft.mission,
    modelProvider: runtime.hermesConfigDraft.modelProvider,
    model: runtime.hermesConfigDraft.model,
    allowedTools: runtime.hermesConfigDraft.allowedTools,
    approvalRails: [
      'Never send, spend, submit, book, or change external data without approval.',
      ...runtime.hermesConfigDraft.approvalRails,
    ],
    memoryRules: runtime.hermesConfigDraft.memoryRules,
    knowledgeVaultRefs: runtime.hermesConfigDraft.knowledgeVaultRefs,
    credentialVaultRefs: runtime.credentialVaultRefs,
    stopTakeoverPolicy: runtime.hermesConfigDraft.stopTakeoverPolicy,
    workspaceRoot: runtime.workspaceRoot,
    generatedAt: new Date().toISOString(),
  };
}

async function writeSelfHostedRuntimeFiles(runtime: MinionRuntimeRecord): Promise<MinionRuntimeRecord> {
  if (!runtime.workspaceRoot || !runtime.hermesProfilePath || !runtime.hermesConfigPath || !runtime.credentialVaultPath) return runtime;
  const now = new Date().toISOString();
  await mkdir(runtime.workspaceRoot, { recursive: true });
  await mkdir(runtime.hermesProfilePath, { recursive: true });
  await mkdir(path.dirname(runtime.credentialVaultPath), { recursive: true });
  await writeFile(runtime.hermesConfigPath, JSON.stringify(renderHermesProfileConfig(runtime), null, 2));
  await writeFile(runtime.credentialVaultPath, JSON.stringify({
    provider: process.env.MINIONMINT_CREDENTIAL_VAULT_PROVIDER || 'scaffolded-local-refs',
    encrypted: false,
    note: 'Scaffolded credential references only. Store encrypted credentials before enabling external actions.',
    refs: runtime.credentialVaultRefs,
    updatedAt: now,
  }, null, 2));
  const supervisor = processSupervisor(runtime.processSupervisor.status, now, runtime.processSupervisor);
  await writeFile(path.join(runtime.workspaceRoot, 'supervisor.json'), JSON.stringify(supervisor, null, 2));
  return {
    ...runtime,
    workspaceStatus: 'config_generated',
    processSupervisor: supervisor,
    workspaceUrl: runtime.workspaceUrl || `file://${runtime.workspaceRoot}`,
    logs: [...runtime.logs, `Prepared self-hosted workspace directory at ${runtime.workspaceRoot}.`, 'Generated real per-Minion Hermes profile and scaffolded credential vault refs.'],
    updatedAt: now,
  };
}

export async function prepareRuntimeForBlueprint(identity: CurrentUserIdentity, blueprint: OnboardingPlan & { id?: string }): Promise<MinionRuntimeRecord> {
  const store = await readRuntimeStore();
  const readiness = getProvisioningReadiness();
  const blueprintId = blueprint.id || slugify(blueprint.projectName);
  const existingIndex = store.runtimes.findIndex((runtime) => runtime.ownerUserId === identity.userId && runtime.blueprintId === blueprintId);
  let next = buildInitialRuntimeRecord(identity, blueprint, blueprintId, readiness);
  if (existingIndex >= 0) {
    next.id = store.runtimes[existingIndex].id;
    next.createdAt = store.runtimes[existingIndex].createdAt;
    next.processSupervisor = store.runtimes[existingIndex].processSupervisor;
    next.logs = [...store.runtimes[existingIndex].logs, ...next.logs.slice(1)];
  }
  if (next.providerType === 'self_hosted') next = await writeSelfHostedRuntimeFiles(next);
  next.availableActions = actionsForStatus(next.workspaceStatus, readiness);
  if (existingIndex >= 0) {
    store.runtimes[existingIndex] = next;
  } else {
    store.runtimes.push(next);
  }
  await writeRuntimeStore(store);
  return next;
}

export async function getLatestRuntimeForUser(identity: CurrentUserIdentity): Promise<MinionRuntimeRecord | null> {
  const store = await readRuntimeStore();
  return store.runtimes.filter((runtime) => runtime.ownerUserId === identity.userId).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0] ?? null;
}

export async function applyRuntimeAction(identity: CurrentUserIdentity, action: RuntimeAction): Promise<MinionRuntimeRecord | null> {
  const store = await readRuntimeStore();
  const index = store.runtimes.findIndex((runtime) => runtime.ownerUserId === identity.userId);
  if (index < 0) return null;
  const runtime = store.runtimes[index];
  const readiness = getProvisioningReadiness();
  const now = new Date().toISOString();
  let next: MinionRuntimeRecord = { ...runtime, logs: [...runtime.logs], updatedAt: now };

  if (action === 'prepare_workspace' || action === 'generate_config') {
    next = await writeSelfHostedRuntimeFiles(next);
  }

  if (action === 'launch_minion') {
    const launchCommand = process.env.MINIONMINT_SELF_HOSTED_LAUNCH_COMMAND?.trim();
    if (!readiness.canProvisionRealMinion || !launchCommand) {
      next.workspaceStatus = 'launch_blocked';
      next.processSupervisor = processSupervisor('launch_blocked', now, { ...next.processSupervisor, launchCommand: launchCommand || null, lastSignal: 'launch_blocked' });
      next.logs.push('Launch blocked until approval rails and workspace prerequisites are present, plus MINIONMINT_SELF_HOSTED_LAUNCH_COMMAND is configured.');
      next.nextMissingImplementationStep = launchCommand ? nextStepFromReadiness(readiness) : 'Configure MINIONMINT_SELF_HOSTED_LAUNCH_COMMAND for the process supervisor.';
    } else {
      next.workspaceStatus = 'running';
      next.processSupervisor = processSupervisor('running', now, { ...next.processSupervisor, launchCommand, lastSignal: 'launch_requested' });
      next.logs.push(`Process supervisor launch requested with command: ${launchCommand}`);
    }
  }

  if (action === 'stop_minion') {
    next.workspaceStatus = 'stopped';
    next.processSupervisor = processSupervisor('stopped', now, { ...next.processSupervisor, lastSignal: 'stop_requested' });
    next.logs.push('Process supervisor stop requested.');
  }

  if (action === 'status_check') {
    next.logs.push(`Status check: workspace is ${next.workspaceStatus}; supervisor is ${next.processSupervisor.status}.`);
  }

  next.availableActions = actionsForStatus(next.workspaceStatus, readiness);
  store.runtimes[index] = next;
  await writeRuntimeStore(store);
  return next;
}
