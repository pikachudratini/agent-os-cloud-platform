import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { PrismaClient } from '@prisma/client';
import type { CurrentUserIdentity } from './current-user';
import type { MinionRuntimeRecord, RuntimeAction } from './minion-runtime';

type RuntimeStore = { runtimes: MinionRuntimeRecord[] };
type RuntimePersistenceMode = 'local_fallback' | 'postgres';

declare global {
  var prismaForMinionMintRuntime: PrismaClient | undefined;
}

const runtimeStorePath = path.join(process.cwd(), '.data', 'minion-runtimes.json');

function hasDatabaseUrl() {
  return Boolean(process.env.DATABASE_URL && process.env.DATABASE_URL.trim() && process.env.MINIONMINT_FORCE_LOCAL_STORE !== 'true');
}

function prisma() {
  globalThis.prismaForMinionMintRuntime ??= new PrismaClient();
  return globalThis.prismaForMinionMintRuntime;
}

export function runtimePersistenceMode(): RuntimePersistenceMode {
  return hasDatabaseUrl() ? 'postgres' : 'local_fallback';
}

async function readLocalRuntimeStore(): Promise<RuntimeStore> {
  try {
    return JSON.parse(await readFile(runtimeStorePath, 'utf8')) as RuntimeStore;
  } catch {
    return { runtimes: [] };
  }
}

async function writeLocalRuntimeStore(store: RuntimeStore) {
  await mkdir(path.dirname(runtimeStorePath), { recursive: true });
  await writeFile(runtimeStorePath, JSON.stringify(store, null, 2));
}

function jsonArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
}

function jsonActionArray(value: unknown): RuntimeAction[] {
  const allowed = new Set(['prepare_workspace', 'generate_config', 'launch_minion', 'open_workspace', 'stop_minion', 'status_check']);
  return jsonArray(value).filter((item): item is RuntimeAction => allowed.has(item));
}

function dateString(value: Date | string | null | undefined) {
  if (!value) return new Date().toISOString();
  return value instanceof Date ? value.toISOString() : value;
}

function fromDbRuntime(row: any): MinionRuntimeRecord {
  return {
    id: row.id,
    minionId: row.minionId,
    ownerUserId: row.ownerUserId,
    blueprintId: row.blueprintId,
    blueprintName: row.blueprintName,
    providerType: row.providerType,
    workspaceStatus: row.workspaceStatus,
    hermesTemplateRef: row.hermesTemplateRef,
    credentialVaultRefs: jsonArray(row.credentialVaultRefs),
    workspaceRoot: row.workspaceRoot,
    hermesProfilePath: row.hermesProfilePath,
    hermesConfigPath: row.hermesConfigPath,
    credentialVaultPath: row.credentialVaultPath,
    workspaceUrl: row.launchUrl,
    processSupervisor: row.processSupervisor,
    logs: jsonArray(row.logs),
    nextMissingImplementationStep: row.nextMissingImplementationStep,
    availableActions: jsonActionArray(row.availableActions),
    hermesConfigDraft: row.hermesConfigDraft,
    createdAt: dateString(row.createdAt),
    updatedAt: dateString(row.updatedAt),
  };
}

function toDbRuntimeData(runtime: MinionRuntimeRecord) {
  return {
    ownerUserId: runtime.ownerUserId,
    blueprintId: runtime.blueprintId,
    blueprintName: runtime.blueprintName,
    minionId: runtime.minionId,
    providerType: runtime.providerType,
    workspaceStatus: runtime.workspaceStatus,
    hermesTemplateRef: runtime.hermesTemplateRef,
    credentialVaultRefs: runtime.credentialVaultRefs,
    hermesConfigDraft: runtime.hermesConfigDraft,
    logs: runtime.logs,
    launchUrl: runtime.workspaceUrl,
    workspaceRoot: runtime.workspaceRoot,
    hermesProfilePath: runtime.hermesProfilePath,
    hermesConfigPath: runtime.hermesConfigPath,
    credentialVaultPath: runtime.credentialVaultPath,
    supervisorPath: runtime.workspaceRoot ? path.join(runtime.workspaceRoot, 'supervisor.json') : null,
    logPath: runtime.processSupervisor.logPath,
    processSupervisor: runtime.processSupervisor,
    availableActions: runtime.availableActions,
    nextMissingImplementationStep: runtime.nextMissingImplementationStep,
  };
}

async function authorizedOrgIds(identity: CurrentUserIdentity) {
  const client = prisma();
  const user = await client.user.findUnique({ where: { clerkUserId: identity.userId }, include: { memberships: true } });
  return user?.memberships.map((membership: { orgId: string }) => membership.orgId) ?? [];
}

async function runtimeWorkspaceForUser(identity: CurrentUserIdentity, runtime: MinionRuntimeRecord) {
  const client = prisma();
  const orgIds = await authorizedOrgIds(identity);
  if (!orgIds.length) return null;
  const workspace = await client.workspace.findFirst({
    where: { id: runtime.blueprintId, orgId: { in: orgIds } },
    orderBy: { updatedAt: 'desc' },
  });
  if (workspace) return workspace;
  return client.workspace.findFirst({ where: { orgId: { in: orgIds } }, orderBy: { updatedAt: 'desc' } });
}

export async function readRuntimeStoreForUser(identity: CurrentUserIdentity): Promise<RuntimeStore> {
  if (hasDatabaseUrl()) {
    const client = prisma();
    const orgIds = await authorizedOrgIds(identity);
    if (!orgIds.length) return { runtimes: [] };
    const rows = await client.minionRuntime.findMany({ where: { orgId: { in: orgIds }, ownerUserId: identity.userId } as any, orderBy: { updatedAt: 'desc' } });
    return { runtimes: rows.map(fromDbRuntime) };
  }
  const store = await readLocalRuntimeStore();
  return { runtimes: store.runtimes.filter((runtime) => runtime.ownerUserId === identity.userId) };
}

export async function getRuntimeByMinionIdFromStore(identity: CurrentUserIdentity, minionId: string): Promise<MinionRuntimeRecord | null> {
  if (hasDatabaseUrl()) {
    const client = prisma();
    const orgIds = await authorizedOrgIds(identity);
    if (!orgIds.length) return null;
    const row = await client.minionRuntime.findFirst({ where: { orgId: { in: orgIds }, ownerUserId: identity.userId, minionId } as any, orderBy: { updatedAt: 'desc' } });
    return row ? fromDbRuntime(row) : null;
  }
  const store = await readRuntimeStoreForUser(identity);
  return store.runtimes.find((runtime) => runtime.minionId === minionId) ?? null;
}

export async function upsertRuntimeForUser(identity: CurrentUserIdentity, runtime: MinionRuntimeRecord): Promise<MinionRuntimeRecord> {
  if (hasDatabaseUrl()) {
    const client = prisma();
    const workspace = await runtimeWorkspaceForUser(identity, runtime);
    if (!workspace) throw new Error('Cannot persist Minion runtime without an authorized workspace for the signed-in owner.');
    const data = toDbRuntimeData(runtime);
    const row = await client.minionRuntime.upsert({
      where: { orgId_minionId: { orgId: workspace.orgId, minionId: runtime.minionId } } as any,
      create: { ...data, orgId: workspace.orgId, workspaceId: workspace.id } as any,
      update: data as any,
    });
    return fromDbRuntime(row);
  }

  const all = await readLocalRuntimeStore();
  const index = all.runtimes.findIndex((item) => item.ownerUserId === identity.userId && item.blueprintId === runtime.blueprintId);
  if (index >= 0) all.runtimes[index] = runtime;
  else all.runtimes.push(runtime);
  await writeLocalRuntimeStore(all);
  return runtime;
}

export async function updateRuntimeForUser(identity: CurrentUserIdentity, runtime: MinionRuntimeRecord): Promise<MinionRuntimeRecord> {
  if (hasDatabaseUrl()) {
    const client = prisma();
    const orgIds = await authorizedOrgIds(identity);
    if (!orgIds.length) throw new Error('Cannot update Minion runtime without an authorized owner org.');
    const existing = await client.minionRuntime.findFirst({ where: { id: runtime.id, orgId: { in: orgIds }, ownerUserId: identity.userId } as any });
    if (!existing) throw new Error('Cannot update Minion runtime outside the signed-in owner scope.');
    const row = await client.minionRuntime.update({ where: { id: existing.id }, data: toDbRuntimeData(runtime) as any });
    return fromDbRuntime(row);
  }

  const all = await readLocalRuntimeStore();
  const index = all.runtimes.findIndex((item) => item.ownerUserId === identity.userId && item.id === runtime.id);
  if (index >= 0) all.runtimes[index] = runtime;
  else all.runtimes.push(runtime);
  await writeLocalRuntimeStore(all);
  return runtime;
}
