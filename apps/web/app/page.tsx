import Link from 'next/link';
import { SignedIn, SignedOut, SignUpButton } from '@clerk/nextjs';

const examples = [
  { name: 'Inbox Triage Minion', mission: 'Sort, label, and draft replies for inbound email', icon: '📧' },
  { name: 'Lead Follow-Up Minion', mission: 'Contact and nurture leads until they book a call', icon: '🎯' },
  { name: 'Research Minion', mission: 'Gather, synthesize, and summarize information on any topic', icon: '🔍' },
  { name: 'Client Prep Minion', mission: 'Prepare briefs, agendas, and context before meetings', icon: '📋' },
  { name: 'Operations Minion', mission: 'Monitor systems, run reports, and flag anomalies', icon: '⚙️' },
];
const productLoop = [
  { step: 'Choose a mission', detail: 'Define what the Minion should accomplish' },
  { step: 'complete the minting interview', detail: 'Identity, knowledge, memory, approvals, tools' },
  { step: 'Review the Minion Blueprint', detail: 'Approve or refine before any work starts' },
  { step: 'Select computer type', detail: 'Linux coding, browser desktop, Windows, or residential' },
  { step: 'Connect tools and credentials', detail: 'Encrypted vault, not plain files' },
  { step: 'launch the Minion workspace', detail: 'Hermes Agent starts in a controlled environment' },
  { step: 'supervise work and approvals', detail: 'Owner takeover at any time' },
];

const computerTypes = [
  { type: 'Linux Coding', desc: 'For coding, research, and automation', icon: '🐧' },
  { type: 'Linux Browser', desc: 'Visible Chrome for Email Game Changers', icon: '🌐' },
  { type: 'Windows Desktop', desc: 'For Windows-specific apps and RDP', icon: '🪟' },
  { type: 'Residential Browser', desc: 'For Facebook and blocked media', icon: '🏠' },
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
        <span className="badge accent-badge">MinionMint</span>
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
          {examples.map((example) => (
            <li key={example.name}>
              <span style={{ marginRight: '0.5rem' }}>{example.icon}</span>
              <strong>{example.name}</strong> — {example.mission}
            </li>
          ))}
        </ul>
      </div>

      <div className="card stack doctrine-card">
        <span className="badge blue-badge">Choose a computer type</span>
        <h2>Each Minion gets the right computer for its mission.</h2>
        <ul className="check-list">
          {computerTypes.map((ct) => (
            <li key={ct.type}>
              <span style={{ marginRight: '0.5rem' }}>{ct.icon}</span>
              <strong>{ct.type}</strong> — {ct.desc}
            </li>
          ))}
        </ul>
      </div>

      <div className="card stack doctrine-card">
        <span className="badge accent-badge">Product loop</span>
        <h2>From mission to running Minion.</h2>
        <ol className="check-list">
          {productLoop.map((item, index) => (
            <li key={item.step}>
              <strong>{index + 1}. {item.step}</strong> — {item.detail}
            </li>
          ))}
        </ol>
      </div>

      <div className="card stack doctrine-card">
        <span className="badge accent-badge">Why MinionMint over a raw cloud computer</span>
        <h2>Minions come with guardrails.</h2>
        <ul className="check-list">
          <li><strong>Approval rails</strong> — blocks sends, spends, and submissions until approved</li>
          <li><strong>Encrypted credential vault</strong> — not plain files on disk</li>
          <li><strong>Residential network support</strong> — for Facebook and blocked media</li>
          <li><strong>Persistent browser profiles</strong> — with proxy and leak protection</li>
          <li><strong>Provider-neutral</strong> — works with any SSH machine, not just one cloud</li>
          <li><strong>Owner takeover</strong> — stop, inspect, or override at any time</li>
        </ul>
      </div>
    </section>
  );
}
