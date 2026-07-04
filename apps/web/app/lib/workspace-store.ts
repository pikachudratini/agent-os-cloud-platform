import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type { OnboardingPlan } from './onboarding';

type SavedWorkspace = OnboardingPlan & { id: string; userId: string; createdAt: string; updatedAt: string };

type Store = { workspaces: SavedWorkspace[] };

const storePath = path.join(process.cwd(), '.data', 'workspaces.json');

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

export async function saveWorkspaceForUser(userId: string, plan: OnboardingPlan) {
  const store = await readStore();
  const now = new Date().toISOString();
  const existingIndex = store.workspaces.findIndex((workspace) => workspace.userId === userId);
  const saved: SavedWorkspace = {
    ...plan,
    id: existingIndex >= 0 ? store.workspaces[existingIndex].id : crypto.randomUUID(),
    userId,
    createdAt: existingIndex >= 0 ? store.workspaces[existingIndex].createdAt : now,
    updatedAt: now,
  };
  if (existingIndex >= 0) store.workspaces[existingIndex] = saved;
  else store.workspaces.push(saved);
  await writeStore(store);
  return saved;
}

export async function getLatestWorkspaceForUser(userId: string) {
  const store = await readStore();
  return store.workspaces.filter((workspace) => workspace.userId === userId).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0] ?? null;
}
