import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type { CurrentUserIdentity } from './current-user';
import { getCredentialSetupForMinion, isCredentialSetupLaunchReady } from './credential-store';
import type { OnboardingPlan } from './onboarding';
import { buildHermesConfigPreview, getProvisioningReadiness, type ComputerProviderName, type ProvisioningReadiness } from './provisioning';
import { checkSelfHostedRuntimeStatus, emptySupervisorState, launchSelfHostedRuntime, stopSelfHostedRuntime, type RuntimeSupervisorState } from './runtime-supervisor';
import { getRuntimeByMinionIdFromStore, readRuntimeStoreForUser, updateRuntimeForUser, upsertRuntimeForUser } from './runtime-store';

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

export type RuntimeProcessSupervisor = RuntimeSupervisorState;

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

type RuntimePaths = {
  workspaceRoot: string;
  hermesProfilePath: string;
  hermesConfigPath: string;
  credentialVaultPath: string;
  supervisorPath: string;
  logPath: string;
};

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
    logPath: path.join(workspaceRoot, 'logs', 'runtime.log'),
  };
}

function workspaceUrlFor(minionId: string) {
  return `/minions/${encodeURIComponent(minionId)}`;
}

function processSupervisor(status: RuntimeProcessSupervisor['status'], now: string, existing?: RuntimeProcessSupervisor): RuntimeProcessSupervisor {
  const base = existing ?? emptySupervisorState(now);
  return {
    ...base,
    status,
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

async function applyCredentialSetupReadiness(identity: CurrentUserIdentity, runtime: MinionRuntimeRecord): Promise<MinionRuntimeRecord> {
  const setup = await getCredentialSetupForMinion(identity, runtime.minionId);
  if (!setup?.credentialRefs.length) return runtime;
  const ready = isCredentialSetupLaunchReady(setup);
  return {
    ...runtime,
    credentialVaultRefs: setup.credentialRefs,
    hermesConfigDraft: { ...runtime.hermesConfigDraft, credentialRefs: setup.credentialRefs },
    logs: [
      ...runtime.logs,
      ready
        ? `Owner credential setup ready with ${setup.credentialRefs.length} encrypted vault reference${setup.credentialRefs.length === 1 ? '' : 's'}.`
        : 'Owner credential setup exists but is not launch-ready because it is scaffolded or the vault provider is not production encrypted.',
    ],
    nextMissingImplementationStep: ready ? runtime.nextMissingImplementationStep : 'Save encrypted credential references through owner credential setup before launching this Minion.',
  };
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
    workspaceUrl: paths ? workspaceUrlFor(minionId) : null,
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

function pathsFromRuntime(runtime: MinionRuntimeRecord): RuntimePaths | null {
  if (!runtime.workspaceRoot || !runtime.hermesProfilePath || !runtime.hermesConfigPath || !runtime.credentialVaultPath) return null;
  return {
    workspaceRoot: runtime.workspaceRoot,
    hermesProfilePath: runtime.hermesProfilePath,
    hermesConfigPath: runtime.hermesConfigPath,
    credentialVaultPath: runtime.credentialVaultPath,
    supervisorPath: path.join(runtime.workspaceRoot, 'supervisor.json'),
    logPath: path.join(runtime.workspaceRoot, 'logs', 'runtime.log'),
  };
}

function supervisorPathsFromRuntime(runtime: MinionRuntimeRecord) {
  const paths = pathsFromRuntime(runtime);
  if (!paths) return null;
  return { ...paths, minionId: runtime.minionId };
}

function runtimePathSignature(runtime: MinionRuntimeRecord) {
  const paths = pathsFromRuntime(runtime);
  if (!paths) return 'no-self-hosted-paths';
  return [paths.workspaceRoot, paths.hermesProfilePath, paths.hermesConfigPath, paths.credentialVaultPath, paths.supervisorPath, paths.logPath].join('|');
}

function supervisorStateMatchesRuntimePaths(runtime: MinionRuntimeRecord) {
  const paths = pathsFromRuntime(runtime);
  if (!paths) return true;
  const state = runtime.processSupervisor;
  if (!state.logPath && !state.pid && !state.startedAt && !state.stoppedAt && !state.launchCommand) return true;
  return state.logPath === paths.logPath;
}

function resetSupervisorForPathChange(runtime: MinionRuntimeRecord): MinionRuntimeRecord {
  const paths = pathsFromRuntime(runtime);
  const reset = emptySupervisorState(new Date().toISOString());
  return {
    ...runtime,
    workspaceStatus: runtime.workspaceStatus === 'running' || runtime.workspaceStatus === 'stopped' ? 'workspace_prepared' : runtime.workspaceStatus,
    processSupervisor: {
      ...reset,
      logPath: paths?.logPath ?? null,
      pid: null,
      recentLogLines: [],
      startedAt: null,
      stoppedAt: null,
      launchCommand: null,
    },
    logs: [...runtime.logs, 'Runtime workspace path changed; supervisor state reset for safety.'],
  };
}

function sanitizeSupervisorForCurrentPaths(runtime: MinionRuntimeRecord): MinionRuntimeRecord {
  return supervisorStateMatchesRuntimePaths(runtime) ? runtime : resetSupervisorForPathChange(runtime);
}

async function writeSelfHostedRuntimeFiles(runtime: MinionRuntimeRecord): Promise<MinionRuntimeRecord> {
  const paths = pathsFromRuntime(runtime);
  if (!paths) return runtime;
  const now = new Date().toISOString();
  await mkdir(runtime.workspaceRoot as string, { recursive: true });
  await mkdir(runtime.hermesProfilePath as string, { recursive: true });
  await mkdir(path.dirname(runtime.credentialVaultPath as string), { recursive: true });
  await writeFile(runtime.hermesConfigPath as string, JSON.stringify(renderHermesProfileConfig(runtime), null, 2));
  await writeFile(runtime.credentialVaultPath as string, JSON.stringify({
    provider: process.env.MINIONMINT_CREDENTIAL_VAULT_PROVIDER || 'scaffolded-local-refs',
    encrypted: false,
    note: 'Scaffolded credential refs are not encrypted credentials. Configure a real credential vault before production launch.',
    refs: runtime.credentialVaultRefs,
    updatedAt: now,
  }, null, 2));
  const supervisor = { ...processSupervisor(runtime.processSupervisor.status, now, runtime.processSupervisor), logPath: paths.logPath };
  await writeFile(paths.supervisorPath, JSON.stringify(supervisor, null, 2));
  return {
    ...runtime,
    workspaceStatus: 'config_generated',
    processSupervisor: supervisor,
    workspaceUrl: runtime.workspaceUrl || workspaceUrlFor(runtime.minionId),
    logs: [...runtime.logs, `Prepared self-hosted workspace directory at ${runtime.workspaceRoot}.`, 'Generated real per-Minion Hermes profile and scaffolded credential vault refs.'],
    updatedAt: now,
  };
}

export async function prepareRuntimeForBlueprint(identity: CurrentUserIdentity, blueprint: OnboardingPlan & { id?: string }): Promise<MinionRuntimeRecord> {
  const store = await readRuntimeStoreForUser(identity);
  const readiness = getProvisioningReadiness();
  const blueprintId = blueprint.id || slugify(blueprint.projectName);
  const existing = store.runtimes.find((runtime) => runtime.ownerUserId === identity.userId && runtime.blueprintId === blueprintId);
  let next = buildInitialRuntimeRecord(identity, blueprint, blueprintId, readiness);
  if (existing) {
    const normalizedExisting = normalizeRuntimeRecord(existing);
    const pathChanged = runtimePathSignature(normalizedExisting) !== runtimePathSignature(next);
    next.id = normalizedExisting.id;
    next.createdAt = normalizedExisting.createdAt;
    next.logs = [...normalizedExisting.logs, ...next.logs.slice(1)];
    next.processSupervisor = pathChanged ? next.processSupervisor : normalizedExisting.processSupervisor;
    if (pathChanged) next = resetSupervisorForPathChange(next);
  }
  next = await applyCredentialSetupReadiness(identity, next);
  if (next.providerType === 'self_hosted') next = await writeSelfHostedRuntimeFiles(next);
  next.availableActions = actionsForStatus(next.workspaceStatus, readiness);
  return upsertRuntimeForUser(identity, next);
}

export async function getLatestRuntimeForUser(identity: CurrentUserIdentity): Promise<MinionRuntimeRecord | null> {
  const store = await readRuntimeStoreForUser(identity);
  return store.runtimes.map(normalizeRuntimeRecord).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0] ?? null;
}

export async function getRuntimeByMinionId(identity: CurrentUserIdentity, minionId: string): Promise<MinionRuntimeRecord | null> {
  let runtime = await getRuntimeByMinionIdFromStore(identity, minionId);
  if (!runtime) return null;
  runtime = sanitizeSupervisorForCurrentPaths(normalizeRuntimeRecord(runtime));
  const supervisorPaths = supervisorPathsFromRuntime(runtime);
  if (!supervisorPaths) return runtime;
  const supervisor = await checkSelfHostedRuntimeStatus(supervisorPaths);
  const next: MinionRuntimeRecord = {
    ...runtime,
    processSupervisor: supervisor,
    workspaceStatus: supervisor.status === 'running' ? 'running' : supervisor.status === 'launch_blocked' ? 'launch_blocked' : supervisor.status === 'stopped' || supervisor.status === 'exited' ? 'stopped' : runtime.workspaceStatus,
  };
  return updateRuntimeForUser(identity, next);
}

export async function applyRuntimeAction(identity: CurrentUserIdentity, action: RuntimeAction): Promise<MinionRuntimeRecord | null> {
  const store = await readRuntimeStoreForUser(identity);
  const runtime = store.runtimes.map(normalizeRuntimeRecord).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0] ?? null;
  if (!runtime) return null;
  const readiness = getProvisioningReadiness();
  const now = new Date().toISOString();
  let next: MinionRuntimeRecord = { ...runtime, logs: [...runtime.logs], updatedAt: now };
  next = sanitizeSupervisorForCurrentPaths(next);

  if (action === 'prepare_workspace' || action === 'generate_config') {
    next = await writeSelfHostedRuntimeFiles(next);
  }

  if (action === 'launch_minion') {
    const supervisorPaths = supervisorPathsFromRuntime(next);
    const credentialSetup = await getCredentialSetupForMinion(identity, next.minionId);
    const credentialSetupReady = isCredentialSetupLaunchReady(credentialSetup);
    if (credentialSetupReady && credentialSetup) {
      next.credentialVaultRefs = credentialSetup.credentialRefs;
      next.hermesConfigDraft = { ...next.hermesConfigDraft, credentialRefs: credentialSetup.credentialRefs };
    }
    const usesScaffoldedCredentialRefs = next.credentialVaultRefs.some((ref) => ref.includes('pending') || ref.includes('scaffold'));
    const devAllowsScaffoldedRefs = process.env.MINIONMINT_ALLOW_SCAFFOLDED_CREDENTIAL_REFS_FOR_DEV === 'true';
    const credentialLaunchBlocked = !credentialSetupReady && !devAllowsScaffoldedRefs;
    if (!readiness.canProvisionRealMinion || !supervisorPaths || credentialLaunchBlocked || (usesScaffoldedCredentialRefs && !devAllowsScaffoldedRefs)) {
      next.workspaceStatus = 'launch_blocked';
      next.processSupervisor = processSupervisor('launch_blocked', now, { ...next.processSupervisor, lastSignal: 'launch_blocked' });
      next.logs.push('Launch blocked until approval rails, workspace prerequisites, and owner credential setup readiness are present. Scaffolded credential refs are not encrypted credentials.');
      next.nextMissingImplementationStep = credentialLaunchBlocked || (usesScaffoldedCredentialRefs && !devAllowsScaffoldedRefs)
        ? 'Save encrypted credential references through owner credential setup, or set MINIONMINT_ALLOW_SCAFFOLDED_CREDENTIAL_REFS_FOR_DEV=true for local supervisor testing only.'
        : nextStepFromReadiness(readiness);
    } else {
      const supervisor = await launchSelfHostedRuntime(supervisorPaths);
      next.processSupervisor = supervisor;
      next.workspaceStatus = supervisor.status === 'running' ? 'running' : 'launch_blocked';
      next.logs.push(supervisor.status === 'running' ? `Process supervisor started PID ${supervisor.pid}.` : 'Process supervisor launch blocked because no structured executable is configured.');
      next.logs.push(...supervisor.recentLogLines.slice(-5));
      next.nextMissingImplementationStep = supervisor.status === 'running' ? 'Open the Minion console and supervise runtime work.' : 'Configure MINIONMINT_SELF_HOSTED_EXECUTABLE and MINIONMINT_SELF_HOSTED_ARGS_JSON for the process supervisor.';
    }
  }

  if (action === 'stop_minion') {
    const supervisorPaths = supervisorPathsFromRuntime(next);
    const supervisor = supervisorPaths ? await stopSelfHostedRuntime(supervisorPaths) : processSupervisor('stopped', now, { ...next.processSupervisor, lastSignal: 'stop_requested' });
    next.workspaceStatus = supervisor.status === 'running' ? 'running' : 'stopped';
    next.processSupervisor = supervisor;
    next.logs.push(supervisor.status === 'running' ? 'Process supervisor stop requested, but the PID is still alive.' : `Process supervisor stopped PID ${supervisor.pid}.`);
    next.logs.push(...supervisor.recentLogLines.slice(-5));
  }

  if (action === 'status_check') {
    const supervisorPaths = supervisorPathsFromRuntime(next);
    const supervisor = supervisorPaths ? await checkSelfHostedRuntimeStatus(supervisorPaths) : next.processSupervisor;
    next.processSupervisor = supervisor;
    next.workspaceStatus = supervisor.status === 'running' ? 'running' : supervisor.status === 'launch_blocked' ? 'launch_blocked' : supervisor.status === 'stopped' || supervisor.status === 'exited' ? 'stopped' : next.workspaceStatus;
    next.logs.push(`Status check: workspace is ${next.workspaceStatus}; supervisor is ${supervisor.status}; PID is ${supervisor.pid ?? 'not started'}.`);
    next.logs.push(...supervisor.recentLogLines.slice(-5));
  }

  next.availableActions = actionsForStatus(next.workspaceStatus, readiness);
  return updateRuntimeForUser(identity, next);
}
