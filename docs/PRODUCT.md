# Product North Star

Customer-facing name: **MinionMint**. Repository remains `agent-os-cloud-platform` until validation.

## Product Thesis

MinionMint is a minting desk for useful, bounded AI workers. It turns a messy business need into a clear Minion Blueprint: the worker's job, brain, memory, knowledge sources, operating rails, approval boundaries, first work order, and future channels or computer workspace.

MinionMint should not feel like a generic AI helper builder or chatbot dashboard. The core experience is a guided diagnosis that helps a non-technical user understand what kind of AI worker they actually need, what inputs it needs, what it may do alone, and what must stay under human approval.

One-line promise: **Mint a scoped AI worker with a job, memory, knowledge, and safety rails before you ever touch a prompt.**

## Source-Material Doctrine

This doctrine is synthesized from the 2026-07-03 source packet, preliminary YouTube channel notes for Eric Michaud and Nick Vasiles, Orgo-style computer-use platform notes, and the additional 2026-07-04 Gemini video ingestion files `bpM9D1kQaAs`, `BI-MNjm1tTQ`, and `Y7FVj4njob0`. See `docs/research/minionmint-source-synthesis.md`.

- Eric Michaud source direction: agent operating systems, memory/vault patterns, prompt/system quality, terminal-to-terminal agent coordination, and reliable agent work loops.
- Nick Vasiles source direction: Computer Use Agents for founders and operators, AI employees for small businesses, OpenClaw-style swarms, and monetizable real-world workflows.
- Orgo-style source direction: fast managed computers for AI agents, browser/terminal/files, fleet API, encrypted sessions, rotating credentials, and live screen trust.

MinionMint combines those threads into a user-facing product: diagnose the job, mint the worker, attach knowledge and memory, set safety rails, then later give the worker channels and an on-demand computer.

## Problem MinionMint Solves

Most people do not know how to convert a business problem into a working AI agent system. They can describe the pain, such as missed leads, repetitive follow-up, research, inbox handling, support questions, or client prep, but they do not know how to define the worker's role, memory, knowledge, tools, approval boundaries, cost controls, or future computer-use needs.

Generic chatbot builders make the user configure prompts. MinionMint should make the user feel like the platform is designing the worker with them.

## Who It Is For

Primary early users:

- founders and solo operators who want AI labor without becoming AI infrastructure experts,
- service businesses that want a bounded AI employee for a specific workflow,
- business builders and consultants creating repeatable AI worker setups,
- non-technical users who need defaults, plain-English guidance, and safety rails.

Not for the MVP:

- cold outreach spam systems,
- unrestricted autonomous agents,
- regulated data workflows before compliance controls exist,
- users who only want a generic website chatbot widget.

## What “Minion” Means

A Minion is a small, bounded AI worker minted for a mission. It is not just a chat persona.

A Minion has:

1. **Job**: the outcome it owns.
2. **Brain**: model, role, tone, goals, rules, and escalation behavior.
3. **Memory**: persistent facts, preferences, and summaries.
4. **Knowledge**: approved documents, websites, FAQs, and source material.
5. **Operating rails**: what it can do alone, what needs approval, and what it must never do.
6. **Channels**: chat first, later email, SMS, voice, and inboxes.
7. **Workstation**: future managed computer session for browser, apps, terminal, and files.
8. **Ledger**: audit trail, usage, cost, and human takeover points.

## What Onboarding Must Produce

Onboarding produces a **Minion Blueprint**, not just an agent spec.

The blueprint must include:

- mission statement,
- audience served,
- first workflow to handle,
- required knowledge sources,
- memory/facts to capture,
- approval boundaries,
- channel plan,
- future workstation needs,
- first-week success criteria,
- generated role, tone, tools, and guardrails.

The user should finish onboarding feeling: “I know what this worker is for, what it needs from me, what it will do first, and where the safety rails are.”

## MVP Wedge

1. Sign up and log in.
2. Concierge onboarding asks adaptive questions about the mission, workflow, audience, knowledge, approval rails, and first success signal.
3. The platform generates and saves a Minion Blueprint.
4. The dashboard shows a polished operations card for the minted worker.
5. Responsive web app passes mobile, tablet, and desktop QA.

Deferred from MVP: phone numbers, email sending, multi-agent fleets, billing, and full virtual computers unless a narrow managed-provider proof is explicitly approved.

## Differentiation From Generic Chatbot Builders

| Generic chatbot builder | MinionMint |
|---|---|
| Starts with prompt and widget settings | Starts with job diagnosis and worker design |
| Produces a chat personality | Produces a Minion Blueprint with mission, memory, rails, knowledge, and channels |
| User must know what to configure | Concierge asks adaptive questions and proposes defaults |
| Usually knowledge-base-only | Treats knowledge, memory, channels, approvals, and computer-use as one operating system |
| Often front-office chat only | Built toward AI employees that can later use computers and communication channels safely |
| Weak safety model | Approval-by-default, tenant isolation, audit logs, cost controls, and scoped permissions |

## Visual Language Notes

MinionMint should feel like a polished minting lab for practical AI workers:

- roomy cards and generous spacing,
- calm dark ink or light surfaces with subtle depth,
- neon yellow and neon blue only as small accents, glows, badges, dividers, and selected states,
- strong blue primary actions with warm yellow highlights,
- dashboard cards that read like worker operating cards, not placeholders,
- mobile header that stacks cleanly instead of cramming nav and auth controls into one tight row.

## User Stories

- As a business owner, I want onboarding to diagnose the worker I need, not ask me to write a prompt.
- As a business owner, I want the platform to tell me what knowledge, rules, and approvals my Minion needs.
- As an operator, I want a dashboard card that shows the Minion's mission, first work order, safety rails, and missing inputs.
- As an administrator, I want every worker bound to a tenant, workspace, approval mode, usage ledger, and audit trail.
- As the platform owner, I want row-level security tests proving one tenant cannot read another tenant's data.

## Iteration Rules

- Do not proceed into Phase 2 feature expansion until source-material synthesis is reflected in product docs and UI copy.
- Work in vertical slices: each phase must end with something a real user could click through, even if narrow.
- After each phase, produce a demo script that can be followed in under 5 minutes to verify the phase.
- Escalate and stop when a decision costs money, touches user data retention, changes the tech stack, or contradicts an accepted ADR.
- Prefer boring, well-documented technology. Novelty requires an ADR.
- When the research corpus and current reality conflict, reality wins. Record the discrepancy in `docs/adr/` as a corpus deviation note.

## Phase Plan

| Phase | Focus | Exit Criteria |
|---|---|---|
| Phase 0 | Product doctrine and foundations | Source packet synthesis, repo, docs, ADRs, CI, QA loop, data model plan, and ledger approved. |
| Phase 1 | Minion Blueprint onboarding | User can complete concierge setup, receive a saved Minion Blueprint, and return to a polished dashboard card. |
| Phase 2 | Agent provisioning and virtual computers | User can provision one agent, attach knowledge, chat, and run a managed-provider computer proof if approved. |
| Phase 3 | Communication channels | Web chat is productionized. Email, SMS, and voice remain gated by compliance and approval mode. |
| Phase 4 | Hardening and responsive QA | Security gates, tenant isolation tests, usage metering, responsive QA, and admin evidence are green. |

## Deployment Domain Plan

Prepare Vercel project naming for MinionMint.com. Keep DNS pending until Vercel gives exact records, then update Porkbun DNS for the apex/root domain and `www`. Verify `https://minionmint.com` and `https://www.minionmint.com` externally before calling the app live.


## Additional Video-Informed Product Implications

The additional Gemini video ingestion reinforced five product requirements:

1. **Proactive workflows over passive chat**: Minions should eventually execute workflows such as lead follow-up, win-back campaigns, inbox triage, research, and client prep, with approvals where risk exists.
2. **Templates and cloning**: users should not start from a blank prompt. MinionMint should support reusable Minion templates and cloneable workspace blueprints.
3. **Vertical delivery**: the strongest commercial wedge is a specific worker for a specific industry or workflow, not a generic all-purpose assistant.
4. **Workspace isolation and observability**: future client/project workspaces need separate data, connected apps, files, inboxes, health checks, watchdogs, and audit trails.
5. **Blueprint as audit artifact**: onboarding should produce something useful outside the app: a diagnosis of the workflow, the proposed worker, required inputs, approval rails, first-week win, and later automation path.
