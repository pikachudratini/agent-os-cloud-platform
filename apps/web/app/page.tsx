import Link from 'next/link';
import { SignedIn, SignedOut, SignUpButton } from '@clerk/nextjs';

export default function HomePage() {
  return (
    <section className="hero home-hero">
      <div className="card hero-card glow-card">
        <span className="badge accent-badge">Source-informed Phase 1</span>
        <h1>Mint a worker, not another chatbot.</h1>
        <p className="lead">MinionMint turns a messy business need into a Minion Blueprint: mission, memory, knowledge, approval rails, first work order, and the future workstation your AI employee may need.</p>
        <div className="form-row cta-row">
          <SignedOut><SignUpButton mode="modal"><button>Mint my first blueprint</button></SignUpButton></SignedOut>
          <SignedIn><Link href="/onboarding" className="button">Continue minting</Link></SignedIn>
          <Link href="/dashboard" className="button secondary">View operations board</Link>
        </div>
      </div>
      <div className="card stack doctrine-card">
        <span className="badge blue-badge">Minion doctrine</span>
        <h2>Every Minion needs a job, rails, and a first win.</h2>
        <ul className="check-list">
          <li>Diagnose the work before writing prompts.</li>
          <li>Attach approved knowledge and memory rules.</li>
          <li>Set human approval boundaries up front.</li>
          <li>Plan future computer-use only when the workflow proves value.</li>
        </ul>
      </div>
    </section>
  );
}
