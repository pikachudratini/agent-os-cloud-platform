'use client';

import { useState } from 'react';
import type { CredentialSetupRecord, CredentialType } from '../lib/credential-store';

type CredentialSetupPanelProps = {
  minionId: string;
  setups: CredentialSetupRecord[];
};

const credentialTypes: { value: CredentialType; label: string }[] = [
  { value: 'api_key', label: 'API key' },
  { value: 'oauth_pending', label: 'OAuth pending' },
  { value: 'password_ref', label: 'Password reference' },
  { value: 'browser_profile_ref', label: 'Browser profile reference' },
  { value: 'custom_ref', label: 'Custom reference' },
];

export function CredentialSetupPanel({ minionId, setups }: CredentialSetupPanelProps) {
  const [displayName, setDisplayName] = useState('Owner-approved app access');
  const [credentialType, setCredentialType] = useState<CredentialType>('api_key');
  const [credentialValue, setCredentialValue] = useState('');
  const [allowedUse, setAllowedUse] = useState('Use only after owner approval for this Minion.');
  const [items, setItems] = useState(setups);
  const [message, setMessage] = useState('Paste a credential reference or value. MinionMint stores a vault reference and shows redacted values only.');
  const [busy, setBusy] = useState(false);

  async function saveReference() {
    setBusy(true);
    setMessage('Saving credential vault reference...');
    try {
      const response = await fetch('/api/credentials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ minionId, displayName, credentialType, credentialValue, allowedUse }),
      });
      const payload = await response.json();
      if (!response.ok) {
        setMessage(payload.error || 'Credential reference was not saved.');
        return;
      }
      setItems((current) => [payload.credentialSetup, ...current.filter((item) => item.id !== payload.credentialSetup.id)]);
      setCredentialValue('');
      setMessage(`Credential setup is ${payload.credentialSetup.readiness}. Saved value is redacted as ${payload.credentialSetup.redactedValue}.`);
    } catch {
      setMessage('Credential reference save failed in the browser. Check server logs and try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <article className="card stack wide-card">
      <h2>Owner credential setup</h2>
      <p>Add approved credential references for this Minion. Raw values are never rendered back to the page, runtime logs, or Hermes config preview.</p>
      <div className="form-row">
        <label htmlFor="credential-display-name">Label</label>
        <input id="credential-display-name" value={displayName} onChange={(event) => setDisplayName(event.target.value)} placeholder="Gmail, OpenAI, Stripe, browser profile, CRM" />
      </div>
      <div className="form-row">
        <label htmlFor="credential-type">Credential type</label>
        <select id="credential-type" value={credentialType} onChange={(event) => setCredentialType(event.target.value as CredentialType)}>
          {credentialTypes.map((type) => <option key={type.value} value={type.value}>{type.label}</option>)}
        </select>
      </div>
      <div className="form-row">
        <label htmlFor="credential-value">Reference or secret value</label>
        <input id="credential-value" value={credentialValue} onChange={(event) => setCredentialValue(event.target.value)} placeholder="vault ref, OAuth placeholder, browser profile ref, or local value" autoComplete="off" />
      </div>
      <div className="form-row">
        <label htmlFor="credential-allowed-use">Allowed use notes</label>
        <textarea id="credential-allowed-use" value={allowedUse} onChange={(event) => setAllowedUse(event.target.value)} placeholder="Describe what this Minion may use the credential for." />
      </div>
      <button type="button" onClick={saveReference} disabled={busy || !credentialValue.trim()}>Save credential reference</button>
      <p className="runtime-message">{message}</p>
      {items.length > 0 ? (
        <ul>
          {items.map((item) => (
            <li key={item.id}>{item.displayName}: {(item.credentialType || 'custom_ref').replaceAll('_', ' ')}, {item.readiness} via {item.vaultProvider || 'no vault provider'}, value {item.redactedValue || '••••'}, refs {item.credentialRefs.join(', ')}</li>
          ))}
        </ul>
      ) : <p>No credential references saved for this Minion yet.</p>}
    </article>
  );
}
