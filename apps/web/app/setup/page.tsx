import Link from 'next/link';
import { getProvisioningReadiness } from '../lib/provisioning';

const setupRows = [
  ['Local demo mode', 'No Clerk, Postgres, OpenAI, Orgo, or Hermes credentials. Proves only the UI and blueprint flow.'],
  ['Production Phase 1 mode', 'Clerk with Google OAuth, managed Postgres, and OpenAI. Users can sign in, generate, refine, approve, and save a Minion Blueprint.'],
  ['Provisioning mode', 'Orgo, Hermes template, and credential vault configured. Optional AgentPhone, AgentMail, AgentCard, Composio, and Latitude can move surfaces from planned to configured.'],
];

export default function SetupPage() {
  const readiness = getProvisioningReadiness();
  return (
    <section className="stack page-intro">
      <div className="intro-copy">
        <span className="badge accent-badge">Use MinionMint</span>
        <h1>Blueprint now. Real provisioning next.</h1>
        <p className="lead">This app currently supports the blueprint and dashboard path. A real Orgo/Hermes Minion is only possible after provisioning mode is configured and the provider interface is connected to live APIs.</p>
      </div>
      <div className="dashboard-layout operations-layout">
        <article className="card stack wide-card">
          <h2>Current mode: {readiness.mode.replaceAll('_', ' ')}</h2>
          <p><strong>Can provision a real Minion now:</strong> {readiness.canProvisionRealMinion ? 'Yes, provider settings are present. Live API calls still need final implementation.' : 'No. This build cannot create a real Orgo/Hermes Minion yet.'}</p>
          <p><strong>Blocked by:</strong> {readiness.missingRequiredEnv.length ? readiness.missingRequiredEnv.join(', ') : 'No required provisioning environment variables missing.'}</p>
          <Link href="/dashboard" className="button secondary">Back to operations board</Link>
        </article>
        {setupRows.map(([title, body]) => <article className="card stack" key={title}><h2>{title}</h2><p>{body}</p></article>)}
        <article className="card stack wide-card">
          <h2>Required provisioning environment</h2>
          <ul>
            <li><strong>ORGO_API_KEY:</strong> Orgo cloud computer provider credential.</li>
            <li><strong>HERMES_TEMPLATE_REF:</strong> approved Hermes agent template or image reference.</li>
            <li><strong>CREDENTIAL_VAULT_PROVIDER:</strong> vault provider used to store user-owned provider keys securely.</li>
            <li><strong>Optional:</strong> AGENTPHONE_API_KEY, AGENTMAIL_API_KEY, AGENTCARD_API_KEY, COMPOSIO_API_KEY, LATITUDE_API_KEY.</li>
          </ul>
          <p>Do not paste provider keys into docs, client code, screenshots, or blueprint text. The setup flow should store encrypted credential references only.</p>
        </article>
      </div>
    </section>
  );
}
