import { OnboardingChat } from './ui';

export default function OnboardingPage() {
  return (
    <section className="stack">
      <div>
        <span className="badge">Concierge onboarding</span>
        <h1>Tell MinionMint what to build.</h1>
        <p>Answer a few plain-English questions. The concierge will turn your answers into a saved workspace and starter agent plan.</p>
      </div>
      <OnboardingChat />
    </section>
  );
}
