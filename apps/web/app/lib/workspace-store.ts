import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { PrismaClient } from '@prisma/client';
import type { CurrentUserIdentity } from './current-user';
import type { OnboardingPlan } from './onboarding';

type SavedWorkspace = OnboardingPlan & { id: string; userId: string; createdAt: string; updatedAt: string; persistenceMode: 'local_fallback' | 'postgres' };
type Store = { workspaces: SavedWorkspace[] };

declare global {
  var prismaForMinionMint: PrismaClient | undefined;
}

const storePath = path.join(process.cwd(), '.data', 'workspaces.json');

function hasDatabaseUrl() {
  return Boolean(process.env.DATABASE_URL && process.env.DATABASE_URL.trim() && process.env.MINIONMINT_FORCE_LOCAL_STORE !== 'true');
}

function prisma() {
  globalThis.prismaForMinionMint ??= new PrismaClient();
  return globalThis.prismaForMinionMint;
}

async function readStore(): Promise<Store> {
  try {
    return JSON.parse(await readFile(storePath, 'utf8')) as Store;
  } catch {
    return { workspaces: [] };
  }
}

async function writeStore(store: Store) {
  await mkdir(path.dirname(storePath), { recursive: true });
  await writeFile(storePath, JSON.stringify(store, null, 2));
}

function slugify(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 50) || 'minionmint-workspace';
}

async function ensureOwner(identity: CurrentUserIdentity, plan: OnboardingPlan) {
  const client = prisma();
  const user = await client.user.upsert({
    where: { clerkUserId: identity.userId },
    create: { clerkUserId: identity.userId, email: identity.email, name: identity.name },
    update: { email: identity.email, name: identity.name },
  });
  const org = await client.organization.upsert({
    where: { slug: slugify(`${identity.userId}-${plan.workspaceName}`) },
    create: { name: plan.workspaceName, slug: slugify(`${identity.userId}-${plan.workspaceName}`), clerkOrgId: null },
    update: { name: plan.workspaceName },
  });
  await client.membership.upsert({
    where: { orgId_userId: { orgId: org.id, userId: user.id } },
    create: { orgId: org.id, userId: user.id, role: 'owner' },
    update: { role: 'owner' },
  });
  return { user, org };
}

function fromDbWorkspace(row: { id: string; onboardingState: unknown; createdAt: Date; updatedAt: Date }, identity: CurrentUserIdentity): SavedWorkspace {
  const plan = row.onboardingState as OnboardingPlan;
  return { ...plan, id: row.id, userId: identity.userId, createdAt: row.createdAt.toISOString(), updatedAt: row.updatedAt.toISOString(), persistenceMode: 'postgres' };
}

export async function saveWorkspaceForUser(identity: CurrentUserIdentity, plan: OnboardingPlan): Promise<SavedWorkspace> {
  if (hasDatabaseUrl()) {
    const client = prisma();
    const { org } = await ensureOwner(identity, plan);
    const existing = await client.workspace.findFirst({ where: { orgId: org.id }, orderBy: { updatedAt: 'desc' } });
    const saved = existing
      ? await client.workspace.update({ where: { id: existing.id }, data: { name: plan.workspaceName, status: plan.status === 'blueprint_approved' ? 'active' : 'draft', onboardingState: plan, agentSpec: plan.agentSpec } })
      : await client.workspace.create({ data: { orgId: org.id, name: plan.workspaceName, status: plan.status === 'blueprint_approved' ? 'active' : 'draft', onboardingState: plan, agentSpec: plan.agentSpec } });
    await client.auditLog.create({ data: { orgId: org.id, actorType: 'user', actorId: identity.userId, action: `blueprint.${plan.status}`, targetType: 'workspace', targetId: saved.id, workspaceId: saved.id, metadata: { ownerReviewState: plan.ownerReviewState, generationMode: plan.generationMode } } });
    await client.usageEvent.create({ data: { orgId: org.id, workspaceId: saved.id, kind: 'blueprint_save', quantity: 1, unit: 'event', metadata: { generationMode: plan.generationMode } } });
    return fromDbWorkspace(saved, identity);
  }

  const store = await readStore();
  const now = new Date().toISOString();
  const existingIndex = store.workspaces.findIndex((workspace) => workspace.userId === identity.userId);
  const saved: SavedWorkspace = {
    ...plan,
    id: existingIndex >= 0 ? store.workspaces[existingIndex].id : crypto.randomUUID(),
    userId: identity.userId,
    createdAt: existingIndex >= 0 ? store.workspaces[existingIndex].createdAt : now,
    updatedAt: now,
    persistenceMode: 'local_fallback',
  };
  if (existingIndex >= 0) store.workspaces[existingIndex] = saved;
  else store.workspaces.push(saved);
  await writeStore(store);
  return saved;
}

export async function getLatestWorkspaceForUser(identity: CurrentUserIdentity): Promise<SavedWorkspace | null> {
  if (hasDatabaseUrl()) {
    const client = prisma();
    const user = await client.user.findUnique({ where: { clerkUserId: identity.userId }, include: { memberships: true } });
    const orgIds = user?.memberships.map((membership: { orgId: string }) => membership.orgId) ?? [];
    if (!orgIds.length) return null;
    const workspace = await client.workspace.findFirst({ where: { orgId: { in: orgIds } }, orderBy: { updatedAt: 'desc' } });
    return workspace ? fromDbWorkspace(workspace, identity) : null;
  }

  const store = await readStore();
  return store.workspaces.filter((workspace) => workspace.userId === identity.userId).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0] ?? null;
}
