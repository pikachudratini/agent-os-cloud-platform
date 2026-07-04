import Link from 'next/link';
import { getProvisioningReadiness } from '../lib/provisioning';

const setupRows = [
  ['Local demo mode', 'No real auth, database, model, credentials, or workspace provider required. Proves only the UI and Minion Blueprint flow.'],
  ['Production Phase 1 mode', 'Clerk with Google OAuth, managed Postgres, and OpenAI or a selected model provider. Users can sign in, generate, refine, approve, and save a Minion Blueprint.'],
  ['Provisioning mode', 'A computer or workspace provider is selected, a Hermes template or base image is configured, a credential vault is configured, and provider-specific credentials are present only for the selected adapter.'],
];

export default function SetupPage() {
  const readiness = getProvisioningReadiness();
  return (
    <section className="stack page-intro">
      <div className="intro-copy">
        <span className="badge accent-badge">Use MinionMint</span>
        <h1>Blueprint now. Provider-neutral provisioning next.</h1>
        <p className="lead">MinionMint is an owned platform with a pluggable computer provider layer. Orgo-style workspaces are a useful reference pattern, but Orgo is optional and only required when the Orgo adapter is selected.</p>
      </div>
      <div className="dashboard-layout operations-layout">
        <article className="card stack wide-card">
          <h2>Current mode: {readiness.mode.replaceAll('_', ' ')}</h2>
          <p><strong>Computer provider:</strong> {readiness.providerLabel}</p>
          <p><strong>Can provision a real Minion now:</strong> {readiness.canProvisionRealMinion ? 'Readiness settings are present. Live adapter launch calls still need final implementation.' : 'No. Live provisioning is disabled until a provider, Hermes template, and credential vault are configured.'}</p>
          <p><strong>Blocked by:</strong> {readiness.missingReadinessItems.length ? readiness.missingReadinessItems.join(', ') : 'No provider-neutral readiness items are missing.'}</p>
          <Link href="/dashboard" className="button secondary">Back to operations board</Link>
        </article>
        {setupRows.map(([title, body]) => <article className="card stack" key={title}><h2>{title}</h2><p>{body}</p></article>)}
        <article className="card stack wide-card">
          <h2>Provider-neutral provisioning environment</h2>
          <ul>
            <li><strong>MINIONMINT_COMPUTER_PROVIDER:</strong> local_stub, self_hosted, orgo, e2b, browserbase, scrapybara, daytona, or modal.</li>
            <li><strong>MINIONMINT_HERMES_TEMPLATE_REF:</strong> approved Hermes agent template or base image reference.</li>
            <li><strong>MINIONMINT_CREDENTIAL_VAULT_PROVIDER:</strong> vault provider used to store user-owned provider keys securely.</li>
            <li><strong>MINIONMINT_WORKSPACE_REGION:</strong> optional preferred workspace region.</li>
            <li><strong>MINIONMINT_WORKSPACE_BASE_IMAGE:</strong> optional provider-neutral base image reference.</li>
          </ul>
        </article>
        <article className="card stack wide-card">
          <h2>Adapter-specific credentials</h2>
          <ul>
            <li><strong>ORGO_API_KEY:</strong> required only when MINIONMINT_COMPUTER_PROVIDER is orgo.</li>
            <li><strong>E2B_API_KEY:</strong> required only when MINIONMINT_COMPUTER_PROVIDER is e2b.</li>
            <li><strong>BROWSERBASE_API_KEY:</strong> required only when MINIONMINT_COMPUTER_PROVIDER is browserbase.</li>
            <li><strong>SCRAPYBARA_API_KEY:</strong> required only when MINIONMINT_COMPUTER_PROVIDER is scrapybara.</li>
            <li><strong>Optional surfaces:</strong> AGENTPHONE_API_KEY, AGENTMAIL_API_KEY, AGENTCARD_API_KEY, COMPOSIO_API_KEY, LATITUDE_API_KEY.</li>
          </ul>
          <p>Do not paste provider keys into docs, client code, screenshots, or blueprint text. The setup flow should store encrypted credential references only.</p>
        </article>
      </div>
    </section>
  );
}
