import { OnboardingChat } from './ui';

export default function OnboardingPage() {
  return (
    <section className="stack page-intro">
      <div className="intro-copy">
        <span className="badge accent-badge">Minion minting interview</span>
        <h1>Define the worker before the workflow runs.</h1>
        <p className="lead">The concierge turns your answers into a Minion Blueprint: job, knowledge, memory, approval rails, first work order, and future workstation needs.</p>
      </div>
      <OnboardingChat />
    </section>
  );
}
