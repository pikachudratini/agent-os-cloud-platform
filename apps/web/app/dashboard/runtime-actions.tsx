'use client';

import { useState } from 'react';
import type { RuntimeAction } from '../lib/minion-runtime';

type RuntimeActionsProps = {
  actions: RuntimeAction[];
  workspaceUrl: string | null;
  missingStep: string;
};

const labels: Record<RuntimeAction, string> = {
  prepare_workspace: 'Prepare workspace',
  generate_config: 'Generate Hermes config',
  launch_minion: 'Launch Minion',
  open_workspace: 'Open workspace',
  stop_minion: 'Stop Minion',
};

export function RuntimeActions({ actions, workspaceUrl, missingStep }: RuntimeActionsProps) {
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function prepare() {
    setBusy(true);
    setMessage('Preparing runtime record and Hermes config draft...');
    try {
      const response = await fetch('/api/provisioning', { method: 'POST' });
      const payload = await response.json();
      const step = payload.runtime?.nextMissingImplementationStep || payload.message || missingStep;
      setMessage(`Runtime prepared. Next missing implementation step: ${step}`);
    } catch {
      setMessage('Runtime preparation failed in the browser. Check server logs and try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="runtime-actions">
      {actions.map((action) => {
        if (action === 'prepare_workspace' || action === 'generate_config') {
          return <button key={action} onClick={prepare} disabled={busy}>{labels[action]}</button>;
        }
        if (action === 'open_workspace') {
          return <a key={action} className="button secondary" href={workspaceUrl || '#'} aria-disabled={!workspaceUrl}>{labels[action]}</a>;
        }
        return <button key={action} disabled title={missingStep}>{labels[action]}</button>;
      })}
      <p className="runtime-message">{message || `Next missing implementation step: ${missingStep}`}</p>
    </div>
  );
}
