import { NextResponse } from 'next/server';
import { getCurrentUserId } from '../../lib/current-user';
import { buildOnboardingPlan } from '../../lib/onboarding';
import { saveWorkspaceForUser } from '../../lib/workspace-store';

export async function POST(request: Request) {
  const userId = await getCurrentUserId();
  const body = await request.json();
  const answers = Array.isArray(body.answers) ? body.answers.map(String) : [];
  if (answers.length < 5) {
    return NextResponse.json({ error: 'At least five onboarding answers are required.' }, { status: 400 });
  }
  const plan = buildOnboardingPlan(answers);
  const saved = await saveWorkspaceForUser(userId, plan);
  return NextResponse.json({ workspace: saved }, { status: 201 });
}
