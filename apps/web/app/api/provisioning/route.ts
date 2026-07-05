import { NextResponse } from 'next/server';
import { getCurrentUserIdentity } from '../../lib/current-user';
import { getMinionProvisioningProvider } from '../../lib/provisioning';
import { applyRuntimeAction, prepareRuntimeForBlueprint, type RuntimeAction } from '../../lib/minion-runtime';
import { getLatestWorkspaceForUser } from '../../lib/workspace-store';

const runtimeActions = new Set<RuntimeAction>(['prepare_workspace', 'generate_config', 'launch_minion', 'open_workspace', 'restart_minion', 'stop_minion', 'status_check']);

export async function GET() {
  const provider = getMinionProvisioningProvider();
  return NextResponse.json(provider.checkReadiness());
}

async function readAction(request: Request): Promise<RuntimeAction | null> {
  try {
    const payload = await request.json();
    const action = payload?.action;
    return runtimeActions.has(action) ? action : null;
  } catch {
    return null;
  }
}

export async function POST(request: Request) {
  const identity = await getCurrentUserIdentity();
  const requestedAction = await readAction(request);

  if (requestedAction && requestedAction !== 'prepare_workspace' && requestedAction !== 'generate_config') {
    const runtime = await applyRuntimeAction(identity, requestedAction);
    if (!runtime) return NextResponse.json({ error: 'Prepare a Minion runtime before running runtime actions.' }, { status: 400 });
    return NextResponse.json({ status: runtime.workspaceStatus, message: runtime.nextMissingImplementationStep, runtime }, { status: runtime.workspaceStatus === 'launch_blocked' ? 409 : 202 });
  }

  const workspace = await getLatestWorkspaceForUser(identity);
  if (!workspace) return NextResponse.json({ error: 'Approve or save a Minion Blueprint before preparing provisioning.' }, { status: 400 });

  const runtime = await prepareRuntimeForBlueprint(identity, workspace);
  const provider = getMinionProvisioningProvider();
  const result = await provider.prepareWorkspace({ blueprint: workspace, ownerUserId: identity.userId });
  const status = result.status === 'prepared' ? 202 : 409;
  return NextResponse.json({ ...result, runtime }, { status });
}
