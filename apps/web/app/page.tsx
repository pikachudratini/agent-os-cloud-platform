import Link from 'next/link';
import { SignedIn, SignedOut, SignUpButton } from '@clerk/nextjs';

const examples = ['Inbox Triage Minion', 'Lead Follow-Up Minion', 'Research Minion', 'Client Prep Minion', 'Operations Minion'];
const productLoop = [
  'choose a mission',
  'complete the minting interview',
  'review the Minion Blueprint',
  'connect approved tools and credentials',
  'launch the Minion workspace',
  'supervise work and approvals',
];
const dummyPublishableKey = 'pk_test_ZHVtbXkuY2xlcmsuYWNjb3VudHMuZGV2JA';
const hasRealClerk = Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY && process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY !== dummyPublishableKey);

function PrimaryCta() {
  if (!hasRealClerk) return <Link href="/onboarding" className="button">Mint my first Minion</Link>;
  return (
    <>
      <SignedOut><SignUpButton mode="modal"><button>Mint my first Minion</button></SignUpButton></SignedOut>
      <SignedIn><Link href="/onboarding" className="button">Continue minting</Link></SignedIn>
    </>
  );
}

export default function HomePage() {
  return (
    <section className="hero home-hero">
      <div className="card hero-card glow-card">
        <span className="badge accent-badge">MinionMint product loop</span>
        <h1>Mint Minions that do real work in controlled workspaces.</h1>
        <p className="lead">Give each Minion a mission, operating knowledge, memory rules, approval rails, app access, credential references, communication identity, payment policy, and a workspace plan before it acts.</p>
        <div className="form-row cta-row">
          <PrimaryCta />
          <Link href="/dashboard" className="button secondary">View operations board</Link>
        </div>
      </div>
      <div className="card stack doctrine-card">
        <span className="badge blue-badge">Minion examples</span>
        <h2>Start with useful Minions, not infrastructure status.</h2>
        <ul className="check-list">
          {examples.map((example) => <li key={example}>{example}</li>)}
        </ul>
        <h2>Product loop</h2>
        <ol className="check-list">
          {productLoop.map((step) => <li key={step}>{step}</li>)}
        </ol>
      </div>
    </section>
  );
}
