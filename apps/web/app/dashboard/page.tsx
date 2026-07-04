import Link from 'next/link';
import { getCurrentUserId } from '../lib/current-user';
import { getLatestWorkspaceForUser } from '../lib/workspace-store';

export default async function DashboardPage() {
  const userId = await getCurrentUserId();
  const workspace = await getLatestWorkspaceForUser(userId);
  const memoryToCapture = workspace?.memoryToCapture ?? ['Business facts and preferences', 'Successful workflow steps', 'Corrections from the owner'];
  const approvalBoundaries = workspace?.approvalBoundaries ?? workspace?.agentSpec.guardrails ?? ['Human approval for risky actions'];
  const workstationPlan = workspace?.workstationPlan ?? 'Phase 2 computer-use plan will be defined after the first workflow proves value.';
  const firstWeekWin = workspace?.firstWeekWin ?? 'A useful first workflow is ready to run with clear safety rails.';
  const userFeeling = workspace?.userFeeling ?? 'The owner should feel clear on the worker mission, needed inputs, first work order, and safety rails.';

  return (
    <section className="stack page-intro">
      <div className="intro-copy">
        <span className="badge accent-badge">Operations board</span>
        <h1>Your minted worker blueprint.</h1>
        <p className="lead">This is the pre-flight view: mission, first work order, knowledge, memory, approval rails, and future workstation needs before Phase 2 automation expands.</p>
      </div>
      {workspace ? (
        <div className="dashboard-layout">
          <article className="card worker-card glow-card">
            <span className="badge blue-badge">Minion Blueprint</span>
            <h2>{workspace.projectName}</h2>
            <p>{workspace.summary}</p>
            <div className="status-strip"><span>Status: Blueprint draft</span><span>Approval-first worker</span></div>
          </article>
          <article className="card stack"><h2>Mission and first work order</h2><p><strong>Mission:</strong> {workspace.mission}</p><p><strong>First work order:</strong> {workspace.firstWorkflow}</p><p><strong>First-week win:</strong> {firstWeekWin}</p></article>
          <article className="card stack"><h2>Knowledge and memory</h2><ul>{workspace.knowledgeSources.map((source) => <li key={source}>{source}</li>)}</ul><p><strong>Memory to capture:</strong> {memoryToCapture.join(', ')}</p></article>
          <article className="card stack"><h2>Safety rails</h2><ul>{approvalBoundaries.map((rail) => <li key={rail}>{rail}</li>)}</ul><p>Approval mode: {workspace.agentSpec.approvalMode}</p></article>
          <article className="card stack wide-card"><h2>Future workstation plan</h2><p>{workstationPlan}</p><p className="success-note">User feeling target: {userFeeling}</p></article>
        </div>
      ) : (
        <div className="card stack empty-state glow-card">
          <span className="badge blue-badge">No Minion minted yet</span>
          <h2>Start with the job, not the prompt.</h2>
          <p>Complete onboarding to turn a messy business need into a Minion Blueprint with mission, memory, knowledge, rails, and a first work order.</p>
          <Link href="/onboarding" className="button">Mint first blueprint</Link>
        </div>
      )}
    </section>
  );
}
