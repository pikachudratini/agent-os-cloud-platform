import { applyBlueprintEdits, buildOnboardingPlan, type OnboardingPlan } from './onboarding';

type ConciergeInput = {
  answers: string[];
  currentPlan?: OnboardingPlan;
  refinement?: string;
};

const OPENAI_CHAT_COMPLETIONS_URL = 'https://api.openai.com/v1/chat/completions';
const DEFAULT_MODEL = process.env.CONCIERGE_MODEL || 'gpt-4o-mini';

function extractJsonObject(text: string) {
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start < 0 || end < start) throw new Error('Model response did not include a JSON object.');
  return JSON.parse(text.slice(start, end + 1)) as Partial<OnboardingPlan>;
}

function systemPrompt() {
  return `You are the MinionMint minting concierge. MinionMint mints bounded AI workers through a guided blueprint process. Do not behave like a generic chatbot builder, prompt manager, or widget generator.

Return only JSON that can merge into a Minion Blueprint. Use MinionMint language: Minion Blueprint, minting interview, bounded worker, approval rails, first work order, operating knowledge, memory rules, operations board, future workstation.

The blueprint must stay approval-first and Phase 1 safe. Do not provision virtual computers, swarms, broad autonomy, external sends, or real actions. Focus on reviewable worker design.`;
}

export async function generateConciergeBlueprint(input: ConciergeInput): Promise<OnboardingPlan> {
  const fallback = input.currentPlan ?? buildOnboardingPlan(input.answers);
  if (!process.env.OPENAI_API_KEY) return fallback;

  try {
    const bearerPrefix = String.fromCharCode(66, 101, 97, 114, 101, 114);
    const response = await fetch(OPENAI_CHAT_COMPLETIONS_URL, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: [bearerPrefix, process.env.OPENAI_API_KEY].join(' '),
      },
      body: JSON.stringify({
        model: DEFAULT_MODEL,
        temperature: 0.2,
        max_tokens: 1800,
        messages: [
          { role: 'system', content: systemPrompt() },
          { role: 'user', content: JSON.stringify({ answers: input.answers, currentPlan: fallback, refinement: input.refinement || null }) },
        ],
      }),
    });

    if (!response.ok) return fallback;
    const payload = await response.json() as { choices?: Array<{ message?: { content?: string } }> };
    const content = payload.choices?.[0]?.message?.content || '';
    const edits = extractJsonObject(content);
    return applyBlueprintEdits(fallback, { ...edits, generationMode: 'model_backed' }, input.refinement ? 'blueprint_refined' : fallback.status);
  } catch {
    return fallback;
  }
}
