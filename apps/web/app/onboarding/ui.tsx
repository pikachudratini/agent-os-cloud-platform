'use client';

import { useMemo, useState } from 'react';
import { buildOnboardingPlan, firstPrompt, nextQuestion, type ChatMessage } from '../lib/onboarding';

type SaveState = 'idle' | 'saving' | 'saved' | 'error';

export function OnboardingChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([{ role: 'assistant', content: firstPrompt }]);
  const [input, setInput] = useState('');
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const userTurns = useMemo(() => messages.filter((message) => message.role === 'user'), [messages]);
  const plan = useMemo(() => buildOnboardingPlan(userTurns.map((message) => message.content)), [userTurns]);
  const ready = userTurns.length >= 5;

  function sendMessage() {
    const trimmed = input.trim();
    if (!trimmed) return;
    const nextMessages: ChatMessage[] = [...messages, { role: 'user', content: trimmed }];
    const assistantReply = nextMessages.filter((message) => message.role === 'user').length >= 5
      ? 'Good. I can now draft a Minion Blueprint. Add more detail if you want, or save this blueprint to the operations board.'
      : nextQuestion(nextMessages.filter((message) => message.role === 'user').length);
    setMessages([...nextMessages, { role: 'assistant', content: assistantReply }]);
    setInput('');
  }

  async function savePlan() {
    setSaveState('saving');
    const response = await fetch('/api/onboarding', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ answers: userTurns.map((message) => message.content), plan }),
    });
    setSaveState(response.ok ? 'saved' : 'error');
  }

  return (
    <div className="hero onboarding-grid">
      <div className="chat glow-card">
        <div className="chat-log" aria-live="polite">
          {messages.map((message, index) => <div key={index} className={`message ${message.role}`}>{message.content}</div>)}
        </div>
        <div className="form-row chat-input-row">
          <input aria-label="Reply to MinionMint concierge" value={input} onChange={(event) => setInput(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') sendMessage(); }} placeholder="Describe the job, inputs, approvals, or guardrails" />
          <button onClick={sendMessage}>Send</button>
        </div>
      </div>
      <aside className="panel stack blueprint-panel">
        <span className="badge blue-badge">Live Minion Blueprint</span>
        <h2>{plan.projectName}</h2>
        <p>{plan.summary}</p>
        <div className="blueprint-section"><strong>Mission</strong><p>{plan.mission}</p></div>
        <div className="blueprint-section"><strong>First work order</strong><p>{plan.firstWorkflow}</p></div>
        <div className="blueprint-section"><strong>Approval rails</strong><ul>{plan.approvalBoundaries.map((rail) => <li key={rail}>{rail}</li>)}</ul></div>
        <div className="blueprint-section"><strong>Knowledge to connect</strong><ul>{plan.knowledgeSources.map((source) => <li key={source}>{source}</li>)}</ul></div>
        <button disabled={!ready || saveState === 'saving'} onClick={savePlan}>{saveState === 'saving' ? 'Saving blueprint...' : 'Save blueprint'}</button>
        {saveState === 'saved' && <p className="success-note">Saved. Your operations board now has a clearer Minion card.</p>}
        {saveState === 'error' && <p>Save failed. Check auth and API logs.</p>}
      </aside>
    </div>
  );
}
