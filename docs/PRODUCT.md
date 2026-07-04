# Product North Star

A secure, browser-based, multi-tenant platform. A new user signs up and is greeted by an onboarding agent that has a friendly conversation to learn their goal, role, and what knowledge sources they can provide, offering sensible defaults so non-technical users are never overwhelmed. The platform then provisions a customized AI agent with its own memory, knowledge base, virtual computer environment, and communication channels, which the user can manage from desktop, tablet, or mobile browser.

## MVP Wedge

1. Sign up and log in.
2. Concierge onboarding agent asks 5 to 8 adaptive questions.
3. Platform generates an agent spec from the conversation.
4. User gets one working agent with chat, persistent memory, and one knowledge base from an upload or URL.
5. Web app passes mobile, tablet, and desktop QA.

Deferred from MVP: phone numbers, email sending, multi-agent fleets, billing, and full virtual computers unless a narrow managed-provider proof is explicitly approved.

## User Stories

- As a business owner, I want simple onboarding questions so I do not need to understand prompts, vectors, or infrastructure.
- As a business owner, I want sensible defaults one decision at a time so I can finish setup quickly.
- As an administrator, I want organizations, workspaces, memberships, and roles so access is controlled cleanly.
- As an administrator, I want audit logs and usage meters so agent actions and costs are visible.
- As an operator, I want to review what context and knowledge the agent used so I can debug bad answers.
- As an operator, I want outbound messages to require approval before agents can send externally.
- As the platform owner, I want row-level security tests proving one tenant cannot read another tenant's data.
- As the platform owner, I want provider abstraction layers so LLM, email, telephony, and virtual computer vendors can be swapped.

## Iteration Rules

- Work in vertical slices: each phase must end with something a real user could click through, even if narrow.
- After each phase, produce a demo script that can be followed in under 5 minutes to verify the phase.
- Escalate and stop when a decision costs money, touches user data retention, changes the tech stack, or contradicts an accepted ADR.
- Prefer boring, well-documented technology. Novelty requires an ADR.
- When the research corpus and current reality conflict, reality wins. Record the discrepancy in `docs/adr/` as a corpus deviation note.

## Phase Plan

| Phase | Focus | Exit Criteria |
|---|---|---|
| Phase 0 | Foundations | Repo, docs, ADRs, CI, QA loop, data model plan, and ledger approved. |
| Phase 1 | Onboarding agent | User can complete concierge setup and receive an agent spec draft. |
| Phase 2 | Agent provisioning and virtual computers | User can provision one agent, attach knowledge, chat, and run a managed-provider computer proof if approved. |
| Phase 3 | Communication channels | Web chat is productionized. Email, SMS, and voice remain gated by compliance and approval mode. |
| Phase 4 | Hardening and responsive QA | Security gates, tenant isolation tests, usage metering, responsive QA, and admin evidence are green. |
