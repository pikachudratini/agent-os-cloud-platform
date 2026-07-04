import Link from 'next/link';
import { SignedIn, SignedOut, SignUpButton } from '@clerk/nextjs';

export default function HomePage() {
  return (
    <section className="hero">
      <div className="card">
        <span className="badge">Phase 1 MVP</span>
        <h1>Mint your first AI minion in minutes.</h1>
        <p>MinionMint turns a plain-English onboarding conversation into a saved workspace plan and starter agent spec.</p>
        <div className="form-row">
          <SignedOut><SignUpButton mode="modal"><button>Start with Clerk signup</button></SignUpButton></SignedOut>
          <SignedIn><Link href="/onboarding" className="button">Continue onboarding</Link></SignedIn>
          <Link href="/dashboard" className="button secondary">View dashboard</Link>
        </div>
      </div>
      <div className="card stack">
        <h2>What Phase 1 proves</h2>
        <ul>
          <li>Authenticated users can complete the concierge flow.</li>
          <li>The generated project and workspace plan is saved.</li>
          <li>Returning users can see the plan in their dashboard.</li>
          <li>The code path is ready for managed Postgres and Clerk production credentials.</li>
        </ul>
      </div>
    </section>
  );
}
