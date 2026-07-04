import Link from 'next/link';
import { getCurrentUserIdentity } from '../lib/current-user';
import { getLatestWorkspaceForUser } from '../lib/workspace-store';

function statusLabel(value?: string) {
  return value?.replaceAll('_', ' ') ?? 'planned';
}

export default async function DashboardPage() {
  const identity = await getCurrentUserIdentity();
  const workspace = await getLatestWorkspaceForUser(identity);
  const plan = workspace;
  const status = plan?.status.replaceAll('_', ' ') ?? 'no blueprint';
  const ownerReviewState = plan?.ownerReviewState.replaceAll('_', ' ') ?? 'not started';
  const fallbackApps = ['Gmail', 'Slack', 'Calendar', 'Notion', 'CRM'];

  return (
    <section className="stack page-intro">
      <div className="intro-copy">
        <span className="badge accent-badge">Minion operations board</span>
        <h1>Mint, review, and manage Minions.</h1>
        <p className="lead">This Phase 1 board previews the Minion operating identity: mission, approval queue, planned phone and inbox, controlled payment status, app access, knowledge vault, observability, and owner takeover before any external action is enabled.</p>
      </div>
      {plan ? (
        <div className="dashboard-layout operations-layout">
          <article className="card minion-command-card glow-card wide-card">
            <div className="panel-heading">
              <span className="badge blue-badge">Minion Blueprint</span>
              <span className="review-pill">{ownerReviewState}</span>
            </div>
            <h2>{plan.projectName}</h2>
            <p>{plan.summary}</p>
            <div className="status-strip"><span>Status: {status}</span><span>Storage: {plan.persistenceMode}</span><span>Last: {plan.lastActivity}</span></div>
          </article>
          <article className="card stack"><h2>Mission control</h2><p><strong>Mission:</strong> {plan.mission}</p><p><strong>First review task:</strong> {plan.firstWorkflow}</p><p><strong>First-week win:</strong> {plan.firstWeekWin}</p></article>
          <article className="card stack"><h2>Communication identity</h2><p><strong>Phone:</strong> {statusLabel(plan.phonePlan?.status)}. {plan.phonePlan?.summary}</p><p><strong>Email:</strong> {statusLabel(plan.emailPlan?.status)}. {plan.emailPlan?.summary}</p><p>{plan.communicationIdentity}</p></article>
          <article className="card stack"><h2>Payment and spend rails</h2><p><strong>Payment card:</strong> {statusLabel(plan.paymentPlan?.status)}. {plan.paymentPlan?.summary}</p><ul>{(plan.spendingLimits ?? ['Payment disabled by default', 'Owner approval required before every spend']).map((limit) => <li key={limit}>{limit}</li>)}</ul></article>
          <article className="card stack"><h2>Apps and credentials</h2><ul>{(plan.connectedAppsPlan ?? fallbackApps).map((app) => <li key={app}>{app}</li>)}</ul><p><strong>Credentials:</strong> {plan.credentialPlan}</p></article>
          <article className="card stack"><h2>Knowledge vault and memory</h2><p>{plan.knowledgeVaultPlan}</p><p><strong>Memory rules:</strong> {(plan.memoryToCapture ?? []).join(', ')}</p></article>
          <article className="card stack"><h2>Approvals</h2><ul>{(plan.approvalRails ?? plan.approvalQueue).map((rail) => <li key={rail}>{rail}</li>)}</ul><p>Required before send, spend, submit, book, modify, or sensitive account access.</p></article>
          <article className="card stack"><h2>Workspace and takeover</h2><p>{plan.workstationPlan}</p><p><strong>Owner takeover:</strong> {plan.ownerTakeoverPlan}</p></article>
          <article className="card stack"><h2>Observability</h2><p>{plan.observabilityPlan}</p><p><strong>Generation:</strong> {plan.generationMode.replaceAll('_', ' ')}</p></article>
          <article className="card stack wide-card"><h2>Next action</h2><p>{plan.nextAction}</p><Link href="/onboarding" className="button secondary">Refine blueprint</Link></article>
        </div>
      ) : (
        <div className="card stack empty-state glow-card">
          <span className="badge blue-badge">No Minion minted yet</span>
          <h2>Start with a mission, not a prompt.</h2>
          <p>Complete the minting interview to create a Minion Blueprint with operating identity, knowledge vault, memory rules, approval rails, and a future workspace plan.</p>
          <Link href="/onboarding" className="button">Mint first Minion</Link>
        </div>
      )}
    </section>
  );
}
