export type ChatMessage = { role: 'assistant' | 'user'; content: string };

export type OnboardingPlan = {
  projectName: string;
  workspaceName: string;
  summary: string;
  status: 'draft';
  knowledgeSources: string[];
  agentSpec: {
    name: string;
    role: string;
    tone: string;
    model: string;
    tools: string[];
    guardrails: string[];
    knowledgeSources: string[];
    approvalMode: 'drafts_require_approval';
  };
};

export const firstPrompt = 'Welcome to MinionMint. What kind of work do you want your first AI helper to handle?';

const prompts = [
  'What business or project is this for?',
  'Who will the helper serve: you, your team, your customers, or leads?',
  'What files, website, FAQs, or notes can teach it your business?',
  'What tone should it use when it talks?',
  'What should it avoid doing without your approval?',
  'What would make the first version useful this week?',
];

export function nextQuestion(userTurnCount: number) {
  return prompts[Math.min(userTurnCount - 1, prompts.length - 1)];
}

function shortTitle(text: string, fallback: string) {
  const cleaned = text.replace(/[^a-zA-Z0-9\s]/g, ' ').trim().split(/\s+/).slice(0, 5).join(' ');
  return cleaned || fallback;
}

export function buildOnboardingPlan(answers: string[]): OnboardingPlan {
  const goal = answers[0] || 'general business support';
  const business = answers[1] || 'New Project';
  const audience = answers[2] || 'the owner and team';
  const knowledge = answers[3] || 'website, FAQs, and uploaded notes';
  const tone = answers[4] || 'warm, brief, and practical';
  const approval = answers[5] || 'external sends, pricing, refunds, and account changes';
  const projectName = `${shortTitle(business, 'New Project')} Minion`;
  const workspaceName = `${shortTitle(business, 'New Project')} Workspace`;

  return {
    projectName,
    workspaceName,
    summary: `A starter AI helper for ${business} focused on ${goal}. It will support ${audience} using ${knowledge}.`,
    status: 'draft',
    knowledgeSources: [knowledge, 'Owner-provided onboarding answers'],
    agentSpec: {
      name: 'Minty',
      role: `AI helper for ${business} focused on ${goal}`,
      tone,
      model: 'gpt-4o-mini',
      tools: ['knowledge_search', 'chat'],
      guardrails: [`Require human approval for ${approval}`, 'Never send external messages without approval', 'Keep tenant data isolated'],
      knowledgeSources: [knowledge],
      approvalMode: 'drafts_require_approval',
    },
  };
}
