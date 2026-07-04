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
  status_check: 'Check status',
};

export function RuntimeActions({ actions, workspaceUrl, missingStep }: RuntimeActionsProps) {
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function runRuntimeAction(action: RuntimeAction) {
    setBusy(true);
    setMessage(`${labels[action]} requested...`);
    try {
      const response = await fetch('/api/provisioning', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      const payload = await response.json();
      const step = payload.runtime?.nextMissingImplementationStep || payload.message || missingStep;
      setMessage(`${labels[action]} updated. Next missing implementation step: ${step}`);
    } catch {
      setMessage('Runtime action failed in the browser. Check server logs and try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="runtime-actions">
      {actions.map((action) => {
        if (action === 'prepare_workspace' || action === 'generate_config' || action === 'status_check' || action === 'launch_minion' || action === 'stop_minion') {
          return <button key={action} onClick={() => runRuntimeAction(action)} disabled={busy}>{labels[action]}</button>;
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
