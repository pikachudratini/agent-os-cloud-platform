import { OnboardingChat } from './ui';

export default function OnboardingPage() {
  return (
    <section className="stack page-intro">
      <div className="intro-copy">
        <span className="badge accent-badge">Minion minting interview</span>
        <h1>Define the Minion before the workflow runs.</h1>
        <p className="lead">The concierge turns your answers into a Minion Blueprint: mission, knowledge vault, memory rules, approval rails, first review task, phone and inbox plans, and future workspace needs.</p>
      </div>
      <OnboardingChat />
    </section>
  );
}
