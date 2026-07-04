import Link from 'next/link';
import { SignedIn, SignedOut, SignUpButton } from '@clerk/nextjs';

const examples = ['Lead Follow-Up Minion', 'Inbox Triage Minion', 'Client Prep Minion', 'Research Minion'];
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
        <span className="badge accent-badge">Minion operating identity</span>
        <h1>Mint useful AI Minions with rails before action.</h1>
        <p className="lead">MinionMint helps you mint AI Minions with their own mission, inbox plan, phone plan, app access, knowledge vault, memory rules, approval rails, and future workspace. Nothing sends, spends, submits, books, or changes externally until you approve the rails.</p>
        <div className="form-row cta-row">
          <PrimaryCta />
          <Link href="/dashboard" className="button secondary">View operations board</Link>
        </div>
      </div>
      <div className="card stack doctrine-card">
        <span className="badge blue-badge">Minting desk</span>
        <h2>Start with a platform-native Minion, not a local demo.</h2>
        <ul className="check-list">
          {examples.map((example) => <li key={example}>{example}</li>)}
          <li>Each Minion gets a mission, knowledge vault, memory rules, approval rails, and planned workspace identity.</li>
        </ul>
      </div>
    </section>
  );
}
