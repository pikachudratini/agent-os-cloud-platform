import Link from 'next/link';
import { getCurrentUserIdentity } from '../../lib/current-user';
import { getRuntimeByMinionId } from '../../lib/minion-runtime';

function label(value?: string | null) {
  return value?.replaceAll('_', ' ') || 'not available';
}

export default async function MinionConsolePage({ params }: { params: Promise<{ minionId: string }> }) {
  const { minionId } = await params;
  const identity = await getCurrentUserIdentity();
  const runtime = await getRuntimeByMinionId(identity, decodeURIComponent(minionId));

  if (!runtime) {
    return (
      <section className="stack page-intro">
        <div className="card stack empty-state">
          <span className="badge blue-badge">Minion console</span>
          <h1>Minion runtime not found.</h1>
          <p>No runtime was found for this signed-in owner. Prepare a Minion runtime from the dashboard first.</p>
          <Link href="/dashboard" className="button secondary">Back to dashboard</Link>
        </div>
      </section>
    );
  }

  const supervisor = runtime.processSupervisor;
  return (
    <section className="stack page-intro">
      <div className="intro-copy">
        <span className="badge accent-badge">Minion console</span>
        <h1>{runtime.hermesConfigDraft.minionName}</h1>
        <p className="lead">Runtime status, workspace details, recent logs, and owner takeover instructions for this self-hosted Minion.</p>
      </div>
      <div className="dashboard-layout operations-layout">
        <article className="card stack wide-card">
          <h2>Runtime status</h2>
          <div className="status-strip">
            <span>Workspace: {label(runtime.workspaceStatus)}</span>
            <span>Supervisor: {label(supervisor.status)}</span>
            <span>Health checked: {supervisor.lastHealthCheckAt || 'not checked'}</span>
            <span>Restart count: {supervisor.restartCount ?? 0}</span>
            <span>PID: {supervisor.pid ?? 'not started'}</span>
            <span>Started: {supervisor.startedAt || 'not started'}</span>
            <span>Stopped: {supervisor.stoppedAt || 'not stopped'}</span>
          </div>
          <p><strong>Launch command:</strong> {supervisor.launchCommand || 'not configured'}</p>
          <p><strong>Health check:</strong> {supervisor.healthCheckKind || 'pid'} {supervisor.healthCheckTarget ? `(${supervisor.healthCheckTarget})` : ''}</p>
          <p><strong>Health failure reason:</strong> {supervisor.healthFailureReason || 'none'}</p>
          <p><strong>Restart policy:</strong> {(supervisor.restartPolicy?.enabled ?? true) ? `enabled, max ${supervisor.restartPolicy?.maxRestarts ?? 3}` : 'disabled'}</p>
          <p><strong>Next action:</strong> {runtime.nextMissingImplementationStep}</p>
        </article>

        <article className="card stack wide-card">
          <h2>Workspace files</h2>
          <p><strong>Workspace path:</strong> {runtime.workspaceRoot}</p>
          <p><strong>Hermes profile path:</strong> {runtime.hermesProfilePath}</p>
          <p><strong>Hermes config path:</strong> {runtime.hermesConfigPath}</p>
          <p><strong>Credential vault refs path:</strong> {runtime.credentialVaultPath}</p>
          <p><strong>Runtime log path:</strong> {supervisor.logPath || 'not created yet'}</p>
          <p><strong>Supervisor state path:</strong> {supervisor.supervisorPath || 'not created yet'}</p>
          <p><strong>Runtime package path:</strong> {supervisor.runtimePackagePath || 'not created yet'}</p>
          <p><strong>Credential refs:</strong> {runtime.credentialVaultRefs.join(', ') || 'not saved'}</p>
        </article>

        <article className="card stack wide-card">
          <h2>Owner takeover</h2>
          <p>Owner approval is required before this Minion can send, spend, submit, book, modify, or access sensitive accounts.</p>
          <p>Use the dashboard controls to stop or restart the Minion if status, health, logs, or behavior look wrong. Stop sends a safe termination signal to the stored PID. Restart stops the old PID, verifies it is dead, then launches a new process only when encrypted credential refs and a structured launch plan are present.</p>
          <div className="form-row action-row"><Link href="/dashboard" className="button">Open dashboard controls</Link></div>
        </article>

        <article className="card stack wide-card">
          <h2>Recent runtime logs</h2>
          {supervisor.recentLogLines.length ? (
            <pre className="config-preview">{supervisor.recentLogLines.join('\n')}</pre>
          ) : (
            <p>No runtime log lines have been captured yet.</p>
          )}
        </article>
      </div>
    </section>
  );
}
