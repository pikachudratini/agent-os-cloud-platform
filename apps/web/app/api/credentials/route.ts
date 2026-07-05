import { NextResponse } from 'next/server';
import { getCurrentUserIdentity } from '../../lib/current-user';
import { getCredentialSetupsForUser, normalizeCredentialType, saveCredentialSetupForUser } from '../../lib/credential-store';
import { getLatestRuntimeForUser } from '../../lib/minion-runtime';

type CredentialSetupPayload = {
  minionId?: string;
  displayName?: string;
  credentialType?: string;
  credentialValue?: string;
  allowedUse?: string;
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
  const credentialType = normalizeCredentialType(String(payload.credentialType || 'custom_ref'));
  const credentialValue = String(payload.credentialValue || '');
  const allowedUse = String(payload.allowedUse || '');

  if (!credentialValue.trim()) {
    return NextResponse.json({ error: 'Paste a credential reference or value. MinionMint stores a vault reference and returns redacted values only.' }, { status: 400 });
  }

  const credentialSetup = await saveCredentialSetupForUser(identity, { minionId, displayName, credentialType, credentialValue, allowedUse });
  return NextResponse.json({ credentialSetup }, { status: 201 });
}
