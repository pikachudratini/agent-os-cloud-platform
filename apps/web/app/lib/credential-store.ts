import { createCipheriv, createHash, randomBytes, randomUUID } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { PrismaClient } from '@prisma/client';
import type { CurrentUserIdentity } from './current-user';

export type CredentialSetupReadiness = 'missing' | 'scaffolded' | 'ready';
export type CredentialType = 'api_key' | 'oauth_pending' | 'password_ref' | 'browser_profile_ref' | 'custom_ref';

export type CredentialSetupRecord = {
  id: string;
  ownerUserId: string;
  minionId: string;
  displayName: string;
  credentialType: CredentialType;
  allowedUse: string;
  vaultProvider: string | null;
  credentialRefs: string[];
  redactedValue: string;
  encrypted: boolean;
  readiness: CredentialSetupReadiness;
  createdAt: string;
  updatedAt: string;
};

type StoredCredentialSetupRecord = CredentialSetupRecord & {
  secretCiphertext: string | null;
  valueFingerprint: string | null;
};

type CredentialSetupInput = {
  minionId: string;
  displayName: string;
  credentialType: CredentialType;
  credentialValue: string;
  allowedUse?: string;
};

type CredentialSetupStore = { credentialSetups: StoredCredentialSetupRecord[] };
type CredentialPersistenceMode = 'local_fallback' | 'postgres';

declare global {
  var prismaForMinionMintCredentials: PrismaClient | undefined;
}

const credentialStorePath = path.join(process.cwd(), '.data', 'credential-setups.json');
const credentialTypes = new Set<CredentialType>(['api_key', 'oauth_pending', 'password_ref', 'browser_profile_ref', 'custom_ref']);
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

function sanitizeLine(value: string, fallback: string, limit: number) {
  return value.replace(/[\r\n\t]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, limit) || fallback;
}

export function normalizeCredentialDisplayName(value: string) {
  return sanitizeLine(value, 'Owner credential reference', 80);
}

export function normalizeAllowedUse(value = '') {
  return sanitizeLine(value, 'Owner-approved use only. No send, spend, submit, book, modify, or sensitive account access without approval.', 220);
}

export function normalizeCredentialValue(value: string) {
  return value.trim().slice(0, 1000);
}

export function normalizeCredentialType(value: string): CredentialType {
  return credentialTypes.has(value as CredentialType) ? value as CredentialType : 'custom_ref';
}

export function isRealCredentialVaultProvider(provider = process.env.MINIONMINT_CREDENTIAL_VAULT_PROVIDER || '') {
  const normalized = provider.trim();
  return Boolean(normalized && !localDevVaultProviders.has(normalized));
}

export function isNonScaffoldCredentialRef(ref: string) {
  const normalized = normalizeCredentialValue(ref).toLowerCase();
  if (!normalized) return false;
  if (normalized.includes('pending') || normalized.includes('scaffold')) return false;
  return normalized.startsWith('vault://local/') || normalized.startsWith('vault://postgres/') || normalized.startsWith('vault://encrypted/') || normalized.startsWith('op://') || normalized.startsWith('aws-secretsmanager://') || normalized.startsWith('gcp-secret-manager://');
}

export function isEncryptedCredentialRef(ref: string) {
  const normalized = normalizeCredentialValue(ref).toLowerCase();
  if (!isNonScaffoldCredentialRef(normalized)) return false;
  return normalized.startsWith('vault://encrypted/') || normalized.startsWith('op://') || normalized.startsWith('aws-secretsmanager://') || normalized.startsWith('gcp-secret-manager://');
}

export function credentialReadinessFor(refs: string[], provider = process.env.MINIONMINT_CREDENTIAL_VAULT_PROVIDER || ''): CredentialSetupReadiness {
  if (!refs.length) return 'missing';
  if (!isRealCredentialVaultProvider(provider)) return 'scaffolded';
  return refs.every(isNonScaffoldCredentialRef) ? 'ready' : 'scaffolded';
}

function fingerprint(value: string) {
  return createHash('sha256').update(value).digest('hex');
}

function localVaultKey() {
  const keyMaterial = process.env.MINIONMINT_LOCAL_VAULT_KEY?.trim();
  return keyMaterial ? createHash('sha256').update(keyMaterial).digest() : null;
}

function encryptForLocalVault(value: string) {
  const key = localVaultKey();
  if (!key) return null;
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const ciphertext = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `v1:${iv.toString('base64')}:${tag.toString('base64')}:${ciphertext.toString('base64')}`;
}

function redactedValue(value: string) {
  if (!value) return 'not saved';
  const prefix = value.includes('://') ? value.split('://')[0] : 'value';
  return `${prefix}://••••${fingerprint(value).slice(0, 6)}`;
}

function vaultRefFor(mode: CredentialPersistenceMode, id: string) {
  return `vault://${mode === 'postgres' ? 'postgres' : 'local'}/${id}`;
}

function publicRecord(record: StoredCredentialSetupRecord): CredentialSetupRecord {
  const { secretCiphertext, valueFingerprint, ...safe } = record;
  void secretCiphertext;
  void valueFingerprint;
  return safe;
}

function buildCredentialSetupRecord(identity: CurrentUserIdentity, input: CredentialSetupInput, existing?: StoredCredentialSetupRecord): StoredCredentialSetupRecord {
  const now = new Date().toISOString();
  const id = existing?.id || randomUUID();
  const provider = process.env.MINIONMINT_CREDENTIAL_VAULT_PROVIDER?.trim() || null;
  const mode = credentialPersistenceMode();
  const normalizedValue = normalizeCredentialValue(input.credentialValue);
  const generatedRef = vaultRefFor(mode, id);
  const credentialRefs = Array.from(new Set([...(existing?.credentialRefs ?? []), generatedRef]));
  const readiness = credentialReadinessFor(credentialRefs, provider ?? '');
  const secretCiphertext = encryptForLocalVault(normalizedValue);
  return {
    id,
    ownerUserId: identity.userId,
    minionId: input.minionId,
    displayName: normalizeCredentialDisplayName(input.displayName),
    credentialType: normalizeCredentialType(input.credentialType),
    allowedUse: normalizeAllowedUse(input.allowedUse),
    vaultProvider: provider,
    credentialRefs,
    redactedValue: redactedValue(normalizedValue),
    secretCiphertext,
    valueFingerprint: fingerprint(normalizedValue),
    encrypted: Boolean(secretCiphertext),
    readiness,
    createdAt: existing?.createdAt || now,
    updatedAt: now,
  };
}

function fromDbCredentialSetup(row: any): StoredCredentialSetupRecord {
  return {
    id: row.id,
    ownerUserId: row.ownerUserId,
    minionId: row.minionId,
    displayName: row.displayName,
    credentialType: normalizeCredentialType(row.credentialType ?? 'custom_ref'),
    allowedUse: row.allowedUse ?? '',
    vaultProvider: row.vaultProvider,
    credentialRefs: jsonArray(row.credentialRefs),
    redactedValue: row.redactedValue ?? '••••',
    secretCiphertext: row.secretCiphertext ?? null,
    valueFingerprint: row.valueFingerprint ?? null,
    encrypted: Boolean(row.encrypted),
    readiness: row.readiness,
    createdAt: dateString(row.createdAt),
    updatedAt: dateString(row.updatedAt),
  };
}

function toDbCredentialSetupData(setup: StoredCredentialSetupRecord) {
  return {
    ownerUserId: setup.ownerUserId,
    minionId: setup.minionId,
    displayName: setup.displayName,
    credentialType: setup.credentialType,
    allowedUse: setup.allowedUse,
    vaultProvider: setup.vaultProvider,
    credentialRefs: setup.credentialRefs,
    redactedValue: setup.redactedValue,
    secretCiphertext: setup.secretCiphertext,
    valueFingerprint: setup.valueFingerprint,
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
    return rows.map(fromDbCredentialSetup).map(publicRecord);
  }
  const store = await readLocalCredentialStore();
  return store.credentialSetups.filter((setup) => setup.ownerUserId === identity.userId).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).map(publicRecord);
}

export async function getCredentialSetupForMinion(identity: CurrentUserIdentity, minionId: string): Promise<CredentialSetupRecord | null> {
  const setups = await getCredentialSetupsForUser(identity);
  return setups.find((setup) => setup.minionId === minionId) ?? null;
}

export async function saveCredentialSetupForUser(identity: CurrentUserIdentity, input: CredentialSetupInput): Promise<CredentialSetupRecord> {
  const minionId = normalizeCredentialValue(input.minionId).replace(/[^a-zA-Z0-9-]/g, '').slice(0, 80);
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
      : await client.credentialSetup.create({ data: { id: setup.id, ...toDbCredentialSetupData(setup), orgId: workspace.orgId, workspaceId: workspace.id } });
    return publicRecord(fromDbCredentialSetup(row));
  }

  const store = await readLocalCredentialStore();
  const existingIndex = store.credentialSetups.findIndex((setup) => setup.ownerUserId === identity.userId && setup.minionId === minionId);
  const existing = existingIndex >= 0 ? store.credentialSetups[existingIndex] : undefined;
  const setup = buildCredentialSetupRecord(identity, sanitizedInput, existing);
  if (existingIndex >= 0) store.credentialSetups[existingIndex] = setup;
  else store.credentialSetups.push(setup);
  await writeLocalCredentialStore(store);
  return publicRecord(setup);
}

export function isCredentialSetupLaunchReady(setup: CredentialSetupRecord | null) {
  return Boolean(setup && setup.readiness === 'ready' && setup.credentialRefs.every(isNonScaffoldCredentialRef));
}
