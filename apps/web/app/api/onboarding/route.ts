import { NextResponse } from 'next/server';
import { generateConciergeBlueprint } from '../../lib/concierge';
import { getCurrentUserIdentity } from '../../lib/current-user';
import { approveBlueprint, applyBlueprintEdits, buildOnboardingPlan, type OnboardingPlan } from '../../lib/onboarding';
import { saveWorkspaceForUser } from '../../lib/workspace-store';

type OnboardingAction = 'generate' | 'refine' | 'approve' | 'save';

export async function POST(request: Request) {
  const identity = await getCurrentUserIdentity();
  const body = await request.json();
  const answers = Array.isArray(body.answers) ? body.answers.map(String) : [];
  const action: OnboardingAction = body.action || 'save';
  if (answers.length < 5) {
    return NextResponse.json({ error: 'At least five onboarding answers are required.' }, { status: 400 });
  }

  const currentPlan = body.plan as OnboardingPlan | undefined;
  let plan = currentPlan ?? buildOnboardingPlan(answers);

  if (action === 'generate') {
    plan = await generateConciergeBlueprint({ answers, currentPlan: plan });
    return NextResponse.json({ plan, persistenceMode: 'not_saved' });
  }

  if (action === 'refine') {
    plan = await generateConciergeBlueprint({ answers, currentPlan: plan, refinement: String(body.refinement || '') });
    return NextResponse.json({ plan, persistenceMode: 'not_saved' });
  }

  if (action === 'approve') {
    plan = approveBlueprint(plan);
  } else if (body.edits && typeof body.edits === 'object') {
    plan = applyBlueprintEdits(plan, body.edits, 'blueprint_refined');
  }

  const saved = await saveWorkspaceForUser(identity, plan);
  return NextResponse.json({ workspace: saved }, { status: 201 });
}
