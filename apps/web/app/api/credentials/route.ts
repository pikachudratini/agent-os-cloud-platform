import { NextResponse } from 'next/server';
import { getCurrentUserIdentity } from '../../lib/current-user';
import { getCredentialSetupsForUser, saveCredentialSetupForUser } from '../../lib/credential-store';
import { getLatestRuntimeForUser } from '../../lib/minion-runtime';

type CredentialSetupPayload = {
  minionId?: string;
  displayName?: string;
  credentialRef?: string;
};

export async function GET() {
  const identity = await getCurrentUserIdentity();
  const credentialSetups = await getCredentialSetupsForUser(identity);
  return NextResponse.json({ credentialSetups });
}

export async function POST(request: Request) {
  const identity = await getCurrentUserIdentity();
  const payload = await request.json() as CredentialSetupPayload;
  const latestRuntime = await getLatestRuntimeForUser(identity);
  const minionId = String(payload.minionId || latestRuntime?.minionId || '');
  const displayName = String(payload.displayName || 'Owner credential reference');
  const credentialRef = String(payload.credentialRef || '');

  if (!credentialRef.trim()) {
    return NextResponse.json({ error: 'Paste an encrypted credential reference, not a raw key or password.' }, { status: 400 });
  }

  const credentialSetup = await saveCredentialSetupForUser(identity, { minionId, displayName, credentialRef });
  return NextResponse.json({ credentialSetup }, { status: 201 });
}
