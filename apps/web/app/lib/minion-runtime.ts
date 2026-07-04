import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type { CurrentUserIdentity } from './current-user';
import type { OnboardingPlan } from './onboarding';
import { buildHermesConfigPreview, getProvisioningReadiness, type ComputerProviderName, type ProvisioningReadiness } from './provisioning';

export type RuntimeAction = 'prepare_workspace' | 'generate_config' | 'launch_minion' | 'open_workspace' | 'stop_minion';
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
  workspaceUrl: string | null;
  logs: string[];
  nextMissingImplementationStep: string;
  availableActions: RuntimeAction[];
  hermesConfigDraft: HermesRuntimeConfigDraft;
  createdAt: string;
  updatedAt: string;
};

type RuntimeStore = { runtimes: MinionRuntimeRecord[] };

const runtimeStorePath = path.join(process.cwd(), '.data', 'minion-runtimes.json');

function slugify(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60) || 'minion-runtime';
}

async function readRuntimeStore(): Promise<RuntimeStore> {
  try {
    return JSON.parse(await readFile(runtimeStorePath, 'utf8')) as RuntimeStore;
  } catch {
    return { runtimes: [] };
  }
}

async function writeRuntimeStore(store: RuntimeStore) {
  await mkdir(path.dirname(runtimeStorePath), { recursive: true });
  await writeFile(runtimeStorePath, JSON.stringify(store, null, 2));
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
  return 'Implement the selected provider adapter launch call and workspace URL handoff.';
}

function actionsForStatus(status: RuntimeStatus, readiness: ProvisioningReadiness): RuntimeAction[] {
  if (status === 'running') return ['open_workspace', 'stop_minion'];
  if (status === 'stopped') return ['prepare_workspace'];
  const actions: RuntimeAction[] = ['prepare_workspace', 'generate_config'];
  if (readiness.canProvisionRealMinion) actions.push('launch_minion');
  return actions;
}

export function buildInitialRuntimeRecord(identity: CurrentUserIdentity, blueprint: OnboardingPlan, blueprintId: string, readiness = getProvisioningReadiness()): MinionRuntimeRecord {
  const now = new Date().toISOString();
  const minionId = slugify(blueprint.agentSpec.name || blueprint.projectName);
  const hermesConfigDraft = buildHermesRuntimeConfigDraft(blueprint, now);
  return {
    id: `runtime-${minionId}`,
    minionId,
    ownerUserId: identity.userId,
    blueprintId,
    blueprintName: blueprint.projectName,
    providerType: readiness.selectedProvider ?? 'not_selected',
    workspaceStatus: 'config_generated',
    hermesTemplateRef: process.env.MINIONMINT_HERMES_TEMPLATE_REF || null,
    credentialVaultRefs: hermesConfigDraft.credentialRefs,
    workspaceUrl: null,
    logs: [
      `Runtime record created for ${blueprint.projectName}.`,
      'Hermes config draft generated from approved Minion Blueprint.',
      `Next missing implementation step: ${nextStepFromReadiness(readiness)}`,
    ],
    nextMissingImplementationStep: nextStepFromReadiness(readiness),
    availableActions: actionsForStatus('config_generated', readiness),
    hermesConfigDraft,
    createdAt: now,
    updatedAt: now,
  };
}

export async function prepareRuntimeForBlueprint(identity: CurrentUserIdentity, blueprint: OnboardingPlan & { id?: string }): Promise<MinionRuntimeRecord> {
  const store = await readRuntimeStore();
  const readiness = getProvisioningReadiness();
  const blueprintId = blueprint.id || slugify(blueprint.projectName);
  const existingIndex = store.runtimes.findIndex((runtime) => runtime.ownerUserId === identity.userId && runtime.blueprintId === blueprintId);
  const next = buildInitialRuntimeRecord(identity, blueprint, blueprintId, readiness);
  if (existingIndex >= 0) {
    next.id = store.runtimes[existingIndex].id;
    next.createdAt = store.runtimes[existingIndex].createdAt;
    next.logs = [...store.runtimes[existingIndex].logs, ...next.logs.slice(1)];
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
