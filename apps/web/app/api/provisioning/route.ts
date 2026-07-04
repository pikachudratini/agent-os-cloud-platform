import { NextResponse } from 'next/server';
import { getCurrentUserIdentity } from '../../lib/current-user';
import { getMinionProvisioningProvider } from '../../lib/provisioning';
import { getLatestWorkspaceForUser } from '../../lib/workspace-store';

export async function GET() {
  const provider = getMinionProvisioningProvider();
  return NextResponse.json(provider.checkReadiness());
}

export async function POST() {
  const identity = await getCurrentUserIdentity();
  const workspace = await getLatestWorkspaceForUser(identity);
  if (!workspace) return NextResponse.json({ error: 'Approve or save a Minion Blueprint before preparing provisioning.' }, { status: 400 });
  const provider = getMinionProvisioningProvider();
  const result = await provider.prepareWorkspace({ blueprint: workspace, ownerUserId: identity.userId });
  const status = result.status === 'prepared' ? 202 : 409;
  return NextResponse.json(result, { status });
}
