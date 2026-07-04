# MinionMint Source-Material Synthesis

Source date: 2026-07-03 source packet plus channel discovery notes. This synthesis uses the provided source packet and preliminary channel notes. It does not claim full per-video Gemini analysis is complete. The product should keep the full Gemini per-video corpus as a Phase 0 research task before major Phase 2 expansion.

## Source inputs used

- Original project brief captured in the source packet.
- Orgo notes: cloud computers for AI agents, sub-500ms boot, full computer with browser, terminal, files, model-agnostic computer control, encrypted sessions, rotating credentials, fleet management by API.
- Eric Michaud channel notes: AI systems, agent operating systems, Obsidian AI vaults, Codex levels, Hermes Agent usage, agents talking across terminals, prompts and systems that produce high-quality agent work.
- Nick Vasiles channel notes: Computer Use Agents for founders, operators, business builders, AI employees for small businesses, one-person agent businesses, OpenClaw swarms, CUA workflows, and practical monetizable automation.
- Architecture packet Parts 1 through 4, especially the MVP wedge, agent brain and OS design, Orgo-style integrations, tenant isolation, memory/retrieval, communication channels, and cost controls.

## Actual platform thesis

MinionMint is not a generic chatbot builder. It is a minting desk for useful, bounded AI workers. A user should be able to describe a mission in normal language and receive a configured Minion blueprint: job, brain, operating rules, knowledge sources, approval boundaries, communication channels, and future computer workspace.

The core product promise is: turn a messy business need into a safe, ready-to-run AI worker blueprint without making the user become a prompt engineer, automation consultant, or systems architect.

## Problem MinionMint solves

Most people do not know how to translate a business problem into an agent system. They may know they need help answering leads, managing follow-up, handling repetitive research, watching an inbox, or operating a process, but they do not know:

- what role the agent should have,
- what the agent should be allowed to do,
- what knowledge it needs,
- what tools and channels it should get,
- what should require approval,
- how memory should work,
- when a computer-use session is needed,
- how to keep the whole thing safe and isolated.

Generic chatbot builders ask users to configure prompts and knowledge bases. MinionMint should diagnose the job, then mint a scoped worker with an operating plan.

## Who it is for

Primary early audience:

- founders, solo operators, and service businesses that want AI labor but do not want to assemble infrastructure,
- business builders who want one or more AI employees for specific workflows,
- consultants or operators who need repeatable AI worker setups for clients,
- non-technical users who need the platform to ask the right questions and propose sensible defaults.

Anti-fit for the MVP:

- users who want unrestricted autonomous agents,
- cold outreach spammers,
- teams handling regulated data before compliance controls exist,
- users who only want a generic website chatbot.

## What a Minion means

A Minion is a small, bounded AI worker minted for a mission. It is not just a chat persona.

A Minion has:

1. **Job**: the outcome it is responsible for.
2. **Brain**: model, system prompt, tone, goals, rules, and escalation behavior.
3. **Memory**: facts, preferences, summaries, and task history that persist safely.
4. **Knowledge**: approved documents, websites, FAQs, and business context.
5. **Operating rails**: what it can do alone, what needs approval, and what it must never do.
6. **Channels**: chat first, later email, SMS, voice, and inboxes.
7. **Workstation**: future managed computer session for browser, apps, terminal, and files.
8. **Ledger**: audit trail, usage, cost, and human takeover points.

The word “Minion” should feel like a minted worker with a clear job and guardrails, not a toy bot.

## What onboarding should produce

Onboarding should produce a **Minion Blueprint**, not merely an agent spec. The blueprint should include:

- mission statement,
- target user/customer/contact it serves,
- first workflow to automate,
- required knowledge sources,
- memory and facts to capture,
- approval boundaries,
- channel plan,
- future workstation/computer-use needs,
- first-week success criteria,
- generated system role and guardrails,
- dashboard-ready status card.

The user should finish onboarding with the feeling: “I know exactly what this worker is for, what it needs from me, what it will do first, and where the safety rails are.”

## What makes MinionMint different from a generic chatbot builder

| Generic chatbot builder | MinionMint |
|---|---|
| Starts with prompt and widget settings | Starts with job diagnosis and worker design |
| Produces a chat personality | Produces a Minion Blueprint with mission, memory, knowledge, rails, and channels |
| User must know what to configure | Concierge asks adaptive questions and proposes defaults |
| Often knowledge-base-only | Treats knowledge, memory, channels, approvals, and computer-use as one operating system |
| Usually front-office chat | Built toward AI employees that can use computers and communication channels safely |
| Weak safety model | Approval-by-default, tenant isolation, audit logs, cost controls, and scoped permissions |

## Desired onboarding feeling

The user should feel guided, not interrogated. The tone should be calm, competent, slightly playful, and operationally specific. The UI should feel like a minting lab for practical workers: bright accents, clear steps, roomy cards, visible safety rails, and a sense that the platform is turning scattered intent into a deployable worker.

## Product doctrine for the next build pass

1. Onboarding is the product until proven otherwise.
2. The output is a Minion Blueprint, not a generic agent profile.
3. Every Minion needs a job, knowledge, memory, rails, and a first work order.
4. Safety and approval are part of the product experience, not hidden settings.
5. Computer-use is a later power-up, but the blueprint should capture when a workstation will be needed.
6. The dashboard should read like an operations board for minted workers, not a placeholder CRUD list.
7. Visual language should combine trustworthy SaaS polish with small neon yellow and neon blue minting-lab accents.
