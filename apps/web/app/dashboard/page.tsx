import Link from 'next/link';
import { getCurrentUserId } from '../lib/current-user';
import { getLatestWorkspaceForUser } from '../lib/workspace-store';

export default async function DashboardPage() {
  const userId = await getCurrentUserId();
  const workspace = await getLatestWorkspaceForUser(userId);

  return (
    <section className="stack">
      <div>
        <span className="badge">Dashboard</span>
        <h1>Your MinionMint workspace.</h1>
        <p>This page proves a returning user can see the onboarding output saved for their account.</p>
      </div>
      {workspace ? (
        <div className="grid">
          <article className="card"><h2>{workspace.projectName}</h2><p>{workspace.summary}</p></article>
          <article className="card"><h2>{workspace.workspaceName}</h2><p>Workspace status: {workspace.status}</p><p>Approval mode: {workspace.agentSpec.approvalMode}</p></article>
          <article className="card"><h2>{workspace.agentSpec.name}</h2><p>{workspace.agentSpec.role}</p><p>Tone: {workspace.agentSpec.tone}</p></article>
        </div>
      ) : (
        <div className="card stack">
          <h2>No workspace yet</h2>
          <p>Complete onboarding to mint your first starter workspace.</p>
          <Link href="/onboarding" className="button">Start onboarding</Link>
        </div>
      )}
    </section>
  );
}
