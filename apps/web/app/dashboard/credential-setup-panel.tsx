'use client';

import { useState } from 'react';
import type { CredentialSetupRecord } from '../lib/credential-store';

type CredentialSetupPanelProps = {
  minionId: string;
  setups: CredentialSetupRecord[];
};

export function CredentialSetupPanel({ minionId, setups }: CredentialSetupPanelProps) {
  const [displayName, setDisplayName] = useState('Owner-approved app access');
  const [credentialRef, setCredentialRef] = useState('');
  const [items, setItems] = useState(setups);
  const [message, setMessage] = useState('Paste encrypted credential references only. Raw keys never belong in this page.');
  const [busy, setBusy] = useState(false);

  async function saveReference() {
    setBusy(true);
    setMessage('Saving credential reference...');
    try {
      const response = await fetch('/api/credentials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ minionId, displayName, credentialRef }),
      });
      const payload = await response.json();
      if (!response.ok) {
        setMessage(payload.error || 'Credential reference was not saved.');
        return;
      }
      setItems((current) => [payload.credentialSetup, ...current.filter((item) => item.id !== payload.credentialSetup.id)]);
      setCredentialRef('');
      setMessage(`Credential setup is ${payload.credentialSetup.readiness}. Launch reads this readiness before starting a Minion.`);
    } catch {
      setMessage('Credential reference save failed in the browser. Check server logs and try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <article className="card stack wide-card">
      <h2>Owner credential setup</h2>
      <p>Save vault references for this Minion. This form does not ask for raw keys, passwords, tokens, or provider secrets.</p>
      <div className="form-row">
        <label htmlFor="credential-display-name">Reference label</label>
        <input id="credential-display-name" value={displayName} onChange={(event) => setDisplayName(event.target.value)} placeholder="Gmail OAuth vault reference" />
      </div>
      <div className="form-row">
        <label htmlFor="credential-reference">Encrypted vault reference</label>
        <input id="credential-reference" value={credentialRef} onChange={(event) => setCredentialRef(event.target.value)} placeholder="vault://encrypted/minion/app-access" autoComplete="off" />
      </div>
      <button type="button" onClick={saveReference} disabled={busy || !credentialRef.trim()}>Save credential reference</button>
      <p className="runtime-message">{message}</p>
      {items.length > 0 ? (
        <ul>
          {items.map((item) => (
            <li key={item.id}>{item.displayName}: {item.readiness} via {item.vaultProvider || 'no vault provider'} ({item.credentialRefs.length} reference{item.credentialRefs.length === 1 ? '' : 's'})</li>
          ))}
        </ul>
      ) : <p>No credential references saved for this Minion yet.</p>}
    </article>
  );
}
