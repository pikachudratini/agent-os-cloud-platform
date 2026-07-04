'use client';

import { useMemo, useState } from 'react';
import { approveBlueprint, applyBlueprintEdits, buildOnboardingPlan, firstPrompt, nextQuestion, type ChatMessage, type OnboardingPlan } from '../lib/onboarding';

type SaveState = 'idle' | 'generating' | 'refining' | 'approving' | 'saving' | 'saved' | 'error';

export function OnboardingChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([{ role: 'assistant', content: firstPrompt }]);
  const [input, setInput] = useState('');
  const [editText, setEditText] = useState('');
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const userTurns = useMemo(() => messages.filter((message) => message.role === 'user'), [messages]);
  const [serverPlan, setServerPlan] = useState<OnboardingPlan | null>(null);
  const draftPlan = useMemo(() => buildOnboardingPlan(userTurns.map((message) => message.content)), [userTurns]);
  const plan = serverPlan ?? draftPlan;
  const ready = userTurns.length >= 5;
  const answers = userTurns.map((message) => message.content);

  function sendMessage() {
    const trimmed = input.trim();
    if (!trimmed) return;
    const nextMessages: ChatMessage[] = [...messages, { role: 'user', content: trimmed }];
    const assistantReply = nextMessages.filter((message) => message.role === 'user').length >= 5
      ? 'Good. I can now draft a Minion Blueprint. Review the mission, operating identity, approval rails, and future workspace plan before anything is provisioned.'
      : nextQuestion(nextMessages.filter((message) => message.role === 'user').length);
    setMessages([...nextMessages, { role: 'assistant', content: assistantReply }]);
    setServerPlan(null);
    setInput('');
  }

  async function callBlueprint(action: 'generate' | 'refine' | 'approve' | 'save', refinement = '') {
    setSaveState(action === 'generate' ? 'generating' : action === 'refine' ? 'refining' : action === 'approve' ? 'approving' : 'saving');
    const nextPlan = action === 'approve' ? approveBlueprint(plan) : plan;
    const response = await fetch('/api/onboarding', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ action, answers, plan: nextPlan, refinement }),
    });
    if (!response.ok) {
      setSaveState('error');
      return;
    }
    const payload = await response.json();
    if (payload.plan) setServerPlan(payload.plan);
    if (payload.workspace) setServerPlan(payload.workspace);
    setSaveState(action === 'generate' || action === 'refine' ? 'idle' : 'saved');
  }

  function applyManualEdit() {
    const trimmed = editText.trim();
    if (!trimmed) return;
    setServerPlan(applyBlueprintEdits(plan, {
      nextAction: `Owner requested refinement: ${trimmed}`,
      lastActivity: 'Blueprint edited in owner review.',
      approvalQueue: [...plan.approvalQueue, 'Owner must review manual blueprint edit before approval'],
    }, 'blueprint_refined'));
    setEditText('');
  }

  return (
    <div className="hero onboarding-grid">
      <div className="chat glow-card">
        <span className="badge accent-badge">Minting interview</span>
        <h2>Plan the Minion before the prompt.</h2>
        <div className="chat-log" aria-live="polite">
          {messages.map((message, index) => <div key={index} className={`message ${message.role}`}>{message.content}</div>)}
        </div>
        <div className="form-row chat-input-row">
          <input aria-label="Reply to MinionMint concierge" value={input} onChange={(event) => setInput(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') sendMessage(); }} placeholder="Describe the mission, knowledge, identity, apps, approvals, or takeover rules" />
          <button onClick={sendMessage}>Send</button>
        </div>
      </div>
      <aside className="panel stack blueprint-panel">
        <div className="panel-heading">
          <span className="badge blue-badge">Live Minion Blueprint</span>
          <span className="review-pill">{plan.ownerReviewState.replaceAll('_', ' ')}</span>
        </div>
        <h2>{plan.projectName}</h2>
        <p>{plan.summary}</p>
        <div className="blueprint-section"><strong>Mission</strong><p>{plan.mission}</p></div>
        <div className="blueprint-section"><strong>First review task</strong><p>{plan.firstWorkflow}</p></div>
        <div className="blueprint-section"><strong>Operating identity</strong><div className="identity-grid mini"><span>Phone: {plan.phonePlan.status}</span><span>Email: {plan.emailPlan.status}</span><span>Payment: {plan.paymentPlan.status}</span><span>Apps: {plan.connectedAppsPlan.slice(0, 3).join(', ')}</span></div></div>
        <div className="blueprint-section"><strong>Approval rails</strong><ul>{plan.approvalRails.map((rail) => <li key={rail}>{rail}</li>)}</ul></div>
        <div className="blueprint-section"><strong>Knowledge vault</strong><p>{plan.knowledgeVaultPlan}</p></div>
        <div className="blueprint-section"><strong>Owner takeover</strong><p>{plan.ownerTakeoverPlan}</p></div>
        <div className="blueprint-section"><strong>Next action</strong><p>{plan.nextAction}</p></div>
        <div className="blueprint-editor stack">
          <label htmlFor="blueprint-edit"><strong>Owner review note</strong></label>
          <textarea id="blueprint-edit" value={editText} onChange={(event) => setEditText(event.target.value)} placeholder="Revise the mission, identity plans, approval rails, knowledge vault, owner takeover, or first-week win before approval." />
          <div className="form-row action-row">
            <button className="secondary" disabled={!ready} onClick={applyManualEdit}>Apply edit</button>
            <button className="secondary" disabled={!ready || saveState === 'refining'} onClick={() => callBlueprint('refine', editText)}>Refine with concierge</button>
          </div>
        </div>
        <div className="form-row action-row">
          <button disabled={!ready || saveState === 'generating'} onClick={() => callBlueprint('generate')}>{saveState === 'generating' ? 'Generating...' : 'Generate model blueprint'}</button>
          <button className="secondary" disabled={!ready || saveState === 'saving'} onClick={() => callBlueprint('save')}>Save draft</button>
          <button disabled={!ready || saveState === 'approving'} onClick={() => callBlueprint('approve')}>Approve blueprint</button>
        </div>
        {saveState === 'saved' && <p className="success-note">Saved. The operations board now has an owner-reviewed Minion Blueprint.</p>}
        {saveState === 'error' && <p className="error-note">Save failed. Check auth, database, and API logs.</p>}
      </aside>
    </div>
  );
}
