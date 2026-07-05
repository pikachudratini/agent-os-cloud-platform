import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { PrismaClient } from '@prisma/client';
import type { CurrentUserIdentity } from './current-user';

export type CredentialSetupReadiness = 'missing' | 'scaffolded' | 'ready';

export type CredentialSetupRecord = {
  id: string;
  ownerUserId: string;
  minionId: string;
  displayName: string;
  vaultProvider: string | null;
  credentialRefs: string[];
  encrypted: boolean;
  readiness: CredentialSetupReadiness;
  createdAt: string;
  updatedAt: string;
};

type CredentialSetupInput = {
  minionId: string;
  displayName: string;
  credentialRef: string;
};

type CredentialSetupStore = { credentialSetups: CredentialSetupRecord[] };
type CredentialPersistenceMode = 'local_fallback' | 'postgres';

declare global {
  var prismaForMinionMintCredentials: PrismaClient | undefined;
}

const credentialStorePath = path.join(process.cwd(), '.data', 'credential-setups.json');
const localDevVaultProviders = new Set(['local-dev-vault', 'scaffolded-local-refs']);

function hasDatabaseUrl() {
  return Boolean(process.env.DATABASE_URL && process.env.DATABASE_URL.trim() && process.env.MINIONMINT_FORCE_LOCAL_STORE !== 'true');
}

function prisma() {
  globalThis.prismaForMinionMintCredentials ??= new PrismaClient();
  return globalThis.prismaForMinionMintCredentials;
}

export function credentialPersistenceMode(): CredentialPersistenceMode {
  return hasDatabaseUrl() ? 'postgres' : 'local_fallback';
}

async function readLocalCredentialStore(): Promise<CredentialSetupStore> {
  try {
    return JSON.parse(await readFile(credentialStorePath, 'utf8')) as CredentialSetupStore;
  } catch {
    return { credentialSetups: [] };
  }
}

async function writeLocalCredentialStore(store: CredentialSetupStore) {
  await mkdir(path.dirname(credentialStorePath), { recursive: true });
  await writeFile(credentialStorePath, JSON.stringify(store, null, 2));
}

function jsonArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
}

function dateString(value: Date | string | null | undefined) {
  if (!value) return new Date().toISOString();
  return value instanceof Date ? value.toISOString() : value;
}

export function normalizeCredentialDisplayName(value: string) {
  return value.replace(/[\r\n\t]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 80) || 'Owner credential reference';
}

export function normalizeCredentialRef(value: string) {
  return value.replace(/[\r\n\t\s]+/g, '').trim().slice(0, 240);
}

export function isRealCredentialVaultProvider(provider = process.env.MINIONMINT_CREDENTIAL_VAULT_PROVIDER || '') {
  const normalized = provider.trim();
  return Boolean(normalized && !localDevVaultProviders.has(normalized));
}

export function isEncryptedCredentialRef(ref: string) {
  const normalized = normalizeCredentialRef(ref).toLowerCase();
  if (!normalized) return false;
  if (normalized.includes('pending') || normalized.includes('scaffold')) return false;
  return normalized.startsWith('vault://encrypted/') || normalized.startsWith('op://') || normalized.startsWith('aws-secretsmanager://') || normalized.startsWith('gcp-secret-manager://');
}

export function credentialReadinessFor(refs: string[], provider = process.env.MINIONMINT_CREDENTIAL_VAULT_PROVIDER || ''): CredentialSetupReadiness {
  if (!refs.length) return 'missing';
  if (!isRealCredentialVaultProvider(provider)) return 'scaffolded';
  return refs.every(isEncryptedCredentialRef) ? 'ready' : 'scaffolded';
}

function buildCredentialSetupRecord(identity: CurrentUserIdentity, input: CredentialSetupInput, existing?: CredentialSetupRecord): CredentialSetupRecord {
  const now = new Date().toISOString();
  const credentialRef = normalizeCredentialRef(input.credentialRef);
  const provider = process.env.MINIONMINT_CREDENTIAL_VAULT_PROVIDER?.trim() || null;
  const existingRefs = existing?.credentialRefs ?? [];
  const credentialRefs = credentialRef ? Array.from(new Set([...existingRefs, credentialRef])) : existingRefs;
  const readiness = credentialReadinessFor(credentialRefs, provider ?? '');
  return {
    id: existing?.id || `credential-setup-${crypto.randomUUID()}`,
    ownerUserId: identity.userId,
    minionId: input.minionId,
    displayName: normalizeCredentialDisplayName(input.displayName),
    vaultProvider: provider,
    credentialRefs,
    encrypted: readiness === 'ready',
    readiness,
    createdAt: existing?.createdAt || now,
    updatedAt: now,
  };
}

function fromDbCredentialSetup(row: any): CredentialSetupRecord {
  return {
    id: row.id,
    ownerUserId: row.ownerUserId,
    minionId: row.minionId,
    displayName: row.displayName,
    vaultProvider: row.vaultProvider,
    credentialRefs: jsonArray(row.credentialRefs),
    encrypted: Boolean(row.encrypted),
    readiness: row.readiness,
    createdAt: dateString(row.createdAt),
    updatedAt: dateString(row.updatedAt),
  };
}

function toDbCredentialSetupData(setup: CredentialSetupRecord) {
  return {
    ownerUserId: setup.ownerUserId,
    minionId: setup.minionId,
    displayName: setup.displayName,
    vaultProvider: setup.vaultProvider,
    credentialRefs: setup.credentialRefs,
    encrypted: setup.encrypted,
    readiness: setup.readiness,
  };
}

async function authorizedOrgIds(identity: CurrentUserIdentity) {
  const client = prisma() as any;
  const user = await client.user.findUnique({ where: { clerkUserId: identity.userId }, include: { memberships: true } });
  return user?.memberships.map((membership: { orgId: string }) => membership.orgId) ?? [];
}

async function latestWorkspaceForUser(identity: CurrentUserIdentity) {
  const client = prisma() as any;
  const orgIds = await authorizedOrgIds(identity);
  if (!orgIds.length) return null;
  return client.workspace.findFirst({ where: { orgId: { in: orgIds } }, orderBy: { updatedAt: 'desc' } });
}

export async function getCredentialSetupsForUser(identity: CurrentUserIdentity): Promise<CredentialSetupRecord[]> {
  if (hasDatabaseUrl()) {
    const client = prisma() as any;
    const orgIds = await authorizedOrgIds(identity);
    if (!orgIds.length) return [];
    const rows = await client.credentialSetup.findMany({ where: { orgId: { in: orgIds }, ownerUserId: identity.userId }, orderBy: { updatedAt: 'desc' } });
    return rows.map(fromDbCredentialSetup);
  }
  const store = await readLocalCredentialStore();
  return store.credentialSetups.filter((setup) => setup.ownerUserId === identity.userId).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export async function getCredentialSetupForMinion(identity: CurrentUserIdentity, minionId: string): Promise<CredentialSetupRecord | null> {
  const setups = await getCredentialSetupsForUser(identity);
  return setups.find((setup) => setup.minionId === minionId) ?? null;
}

export async function saveCredentialSetupForUser(identity: CurrentUserIdentity, input: CredentialSetupInput): Promise<CredentialSetupRecord> {
  const minionId = normalizeCredentialRef(input.minionId).replace(/[^a-zA-Z0-9-]/g, '').slice(0, 80);
  if (!minionId) throw new Error('A Minion ID is required before saving credential references.');
  const sanitizedInput = { ...input, minionId };

  if (hasDatabaseUrl()) {
    const client = prisma() as any;
    const workspace = await latestWorkspaceForUser(identity);
    if (!workspace) throw new Error('Cannot save credential references without an authorized workspace.');
    const existing = await client.credentialSetup.findFirst({ where: { orgId: workspace.orgId, ownerUserId: identity.userId, minionId } });
    const setup = buildCredentialSetupRecord(identity, sanitizedInput, existing ? fromDbCredentialSetup(existing) : undefined);
    const row = existing
      ? await client.credentialSetup.update({ where: { id: existing.id }, data: toDbCredentialSetupData(setup) })
      : await client.credentialSetup.create({ data: { ...toDbCredentialSetupData(setup), orgId: workspace.orgId, workspaceId: workspace.id } });
    return fromDbCredentialSetup(row);
  }

  const store = await readLocalCredentialStore();
  const existingIndex = store.credentialSetups.findIndex((setup) => setup.ownerUserId === identity.userId && setup.minionId === minionId);
  const existing = existingIndex >= 0 ? store.credentialSetups[existingIndex] : undefined;
  const setup = buildCredentialSetupRecord(identity, sanitizedInput, existing);
  if (existingIndex >= 0) store.credentialSetups[existingIndex] = setup;
  else store.credentialSetups.push(setup);
  await writeLocalCredentialStore(store);
  return setup;
}

export function isCredentialSetupLaunchReady(setup: CredentialSetupRecord | null) {
  return Boolean(setup && setup.readiness === 'ready' && setup.encrypted && setup.credentialRefs.every(isEncryptedCredentialRef));
}
