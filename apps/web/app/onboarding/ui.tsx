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
    const assistantReply = ready
      ? 'I have enough to mint your starter workspace. Review the plan, then save it to your dashboard.'
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
    <div className="hero">
      <div className="chat">
        <div className="chat-log" aria-live="polite">
          {messages.map((message, index) => <div key={index} className={`message ${message.role}`}>{message.content}</div>)}
        </div>
        <div className="form-row">
          <input aria-label="Reply to concierge" value={input} onChange={(event) => setInput(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') sendMessage(); }} placeholder="Type your answer" />
          <button onClick={sendMessage}>Send</button>
        </div>
      </div>
      <aside className="panel stack">
        <span className="badge">Generated plan preview</span>
        <h2>{plan.projectName}</h2>
        <p>{plan.summary}</p>
        <strong>Starter agent</strong>
        <p>{plan.agentSpec.name}: {plan.agentSpec.role}</p>
        <strong>Recommended first workspace</strong>
        <p>{plan.workspaceName}</p>
        <strong>Suggested knowledge sources</strong>
        <ul>{plan.knowledgeSources.map((source) => <li key={source}>{source}</li>)}</ul>
        <button disabled={!ready || saveState === 'saving'} onClick={savePlan}>{saveState === 'saving' ? 'Saving...' : 'Save to dashboard'}</button>
        {saveState === 'saved' && <p>Saved. Open the dashboard to see your workspace.</p>}
        {saveState === 'error' && <p>Save failed. Check auth and API logs.</p>}
      </aside>
    </div>
  );
}
