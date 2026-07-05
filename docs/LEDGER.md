# Agent OS Cloud Platform Ledger

Status values: todo, doing, blocked, review, done.

Evidence rule: never mark a task done without command output, screenshots, or other concrete proof in the Evidence column or Notes.

| ID | Title | Phase | Depends on | Status | Acceptance criteria | Evidence | Notes |
|---|---|---|---|---|---|---|---|
| P0-001 | Repository scaffold and CI | Phase 0 | none | review | Required folders exist, npm workspace metadata exists, GitHub Actions runs install/lint/test/build | npm install, npm run lint, npm test, npm run build passed on VPS2 on 2026-07-04 | Created in kickoff scaffold. |
| P0-002 | Research corpus import path | Phase 0 | P0-001 | todo | `/research` contains source packet, channel folders, synthesis folders, and ingestion README | Pending | Video ingestion records still need real Gemini analysis calls. |
| P0-003 | ADR baseline approval | Phase 0 | P0-001 | review | ADR-0001 through ADR-0006 exist with options, decisions, consequences, and source packet citations | npm run lint passed on VPS2 on 2026-07-04 | Requires Andrew approval before implementation. |
| P0-004 | QA loop tooling | Phase 0 | P0-001 | review | `docs/QA.md` defines automated, responsive, security, agent persona, CI, and done criteria | npm run lint and npm test passed on VPS2 on 2026-07-04 | Playwright tests become blocking once UI exists. |
| P0-005 | Tenant model schema plan | Phase 0 | P0-003 | todo | Drizzle or Prisma schema models organizations, users, memberships, workspaces, agents, knowledge, messages, audit logs, usage events | Pending | Must include RLS migration plan. |
| P0-006 | Tenant isolation proof test | Phase 0 | P0-005 | todo | Integration test proves tenant A cannot read tenant B data through API and direct DB policy path | Pending | Blocking security feature. |
| P0-007 | Managed auth integration decision | Phase 0 | P0-003 | todo | Clerk/Auth0/WorkOS comparison completed and one provider selected with cost and MFA notes | Pending | Paid or user-data-impacting choice needs approval. |
| P0-008 | Usage metering foundation | Phase 0 | P0-005 | todo | Usage events table and service records token, VM, email, SMS, voice, and storage dimensions | Pending | Needed before paid design partners. |
| P0-009 | Onboarding conversation UX skeleton | Phase 1 | P0-007 | todo | Responsive chat UI asks one decision at a time and supports 5 to 8 adaptive questions | Pending | Test at 375, 768, 1440 widths. |
| P0-010 | Agent spec generator | Phase 1 | P0-009 | todo | Conversation generates structured JSON agent spec with role, prompt, model, tools, guardrails, knowledge sources, approval mode | Pending | Validate with scripted personas. |
| P0-011 | Knowledge source ingestion MVP | Phase 1 | P0-005 | todo | Upload or URL creates documents and chunks with content hash dedupe | Pending | Add input validation and malware scan placeholder. |
| P0-012 | Agent chat runtime MVP | Phase 2 | P0-010, P0-011 | todo | User can chat with one provisioned agent using spec, recent turns, retrieved knowledge, and memory | Pending | Context manifest logged per message. |
| P0-013 | Memory foundation | Phase 2 | P0-012 | todo | Episodic summaries, preference facts, and user-visible memory list exist | Pending | Deletion and correction controls required. |
| P0-014 | ComputerProvider interface | Phase 2 | P0-012 | todo | Provider interface exists with start, stop, snapshot, command, screenshot, and budget hooks | Pending | No paid calls without approval. |
| P0-015 | Web chat channel | Phase 3 | P0-012 | todo | Web chat channel uses normalized inbound/outbound contract and streams responses | Pending | First channel, no external compliance burden. |
| P0-016 | Outbound approval gate | Phase 3 | P0-015 | todo | External channel sends require human approval by default | Pending | Must exist before email/SMS/voice. |
| P0-017 | Responsive release gate | Phase 4 | P0-009, P0-012 | todo | All user pages pass automated or manual checks at 375, 768, and 1440 widths | Pending | Screenshots required. |
| P0-018 | Security hardening gate | Phase 4 | P0-006, P0-016 | todo | Dependency audit, secrets scan, authz route tests, rate limiting, input validation, audit logs are verified | Pending | Must be green before real users. |
| P1-001 | Clerk auth integration | Phase 1 | P0-007 | review | App uses Clerk provider, middleware, signup, signin, and protected onboarding/dashboard routes | `npm run qa` passed 2026-07-04. Runtime uses Clerk when env vars exist and local-demo fallback only when absent. | Approved default: Clerk. |
| P1-002 | Managed Postgres schema | Phase 1 | P0-005 | review | Prisma schema defines users, organizations, memberships, workspaces, audit logs, usage events, and RLS SQL plan | `npm test` passed 2026-07-04 and validated Prisma schema plus RLS SQL plan. | Approved deployment: managed Postgres. |
| P1-003 | Basic onboarding concierge chat | Phase 1 | P1-001 | review | User can answer at least five prompts and receive a generated project/workspace/agent plan | Runtime curl and screenshots passed 2026-07-04. Mobile screenshot: docs/qa-screenshots/onboarding-375.png. | Uses deterministic local planner until OpenAI key is configured. |
| P1-004 | Save onboarding state | Phase 1 | P1-002, P1-003 | review | API route saves onboarding output for authenticated user or local QA demo user | POST /api/onboarding returned 201-style JSON with saved Clearwater plumbing workspace on 2026-07-04. | File-backed local adapter, Prisma schema ready for managed Postgres adapter. |
| P1-005 | Minimal dashboard | Phase 1 | P1-004 | review | Returning user can see saved project/workspace/agent summary in dashboard | Dashboard curl showed saved workspace and desktop screenshot passed QA: docs/qa-screenshots/dashboard-1440.png. | Protected by Clerk middleware when Clerk env vars are configured. |
| P1-006 | Deployment readiness | Phase 1 | P1-005 | blocked | Vercel project has required env vars and latest main deploy passes | `npx vercel whoami` on VPS2 returned: No existing credentials found. | Needs Vercel token/login plus Clerk and managed Postgres environment variables. |
| P1-008 | Source-material product doctrine pass | Phase 1 | P1-005 | review | Source packet synthesis updates PRODUCT, README, onboarding copy, dashboard copy, generated plan structure, visual language notes, and screenshots | `npm run qa` passed 2026-07-04. Runtime curl verified onboarding save and dashboard. Screenshots captured: `docs/qa-screenshots/minionmint-onboarding-375.png`, `docs/qa-screenshots/minionmint-onboarding-768.png`, `docs/qa-screenshots/minionmint-dashboard-1440.png`. | Blocks Phase 2 feature expansion until accepted. |
| P1-007 | Prepare Vercel project for MinionMint.com | Phase 1 | P1-006 | blocked | Vercel project is prepared for MinionMint.com, exact DNS records are captured, Porkbun apex and www records are updated after Vercel provides them, and both https://minionmint.com and https://www.minionmint.com verify externally | Deployment plan added at docs/deployment/minionmint-vercel.md. Blocked before DNS because Vercel credentials are not configured. | Keep DNS pending until Vercel gives exact records. Do not call live until both hostnames verify. |
| P1-009 | Phase 1 hardening approval | Phase 1 | P1-008 | review | Repo has doctrine guardrail, env contracts, Prisma/Postgres adapter boundary, Clerk identity boundary, model-backed concierge boundary, blueprint edit/refine/approve states, operations-board dashboard preview, refreshed screenshots, npm run qa, and CI | `npm run qa` passed locally and on VPS2 2026-07-04. Runtime POST `/api/onboarding` approved a blueprint with local fallback. Dashboard curl verified approval queue, connected tools, next action, and last activity sections. Screenshots captured in `docs/qa-screenshots/`, including `minionmint-hardening-onboarding-controls.png`. | Phase 2 remains paused until this production-real Phase 1 slice is accepted. |

## Top Clarifying Questions For Approval

Answered 2026-07-04: Clerk, Vercel plus managed Postgres, GPT-4o-mini or GPT-4.1-mini, virtual computer proof in Phase 2, customer-facing name MinionMint while keeping repo name.

## Session Summary Log

### 2026-07-04 Phase 0 kickoff scaffold

- Created repository scaffold on VPS2 under `/root/agent-os-cloud-platform`.
- Added product north star, ADR-0001 through ADR-0006, QA loop, ledger, workspace metadata, and CI workflow.
- No product feature code was implemented, per kickoff instruction.
- Next task after approval: choose auth provider and implement tenant schema plus RLS proof test.
- Needs input: the five clarifying questions above.

### 2026-07-04 Phase 1 approved defaults

- Approved defaults recorded in ADR-0007.
- Implemented first slice: Clerk auth shell, onboarding concierge, persistence API, dashboard, Prisma Postgres schema, and RLS SQL plan.
- Next task after verification: configure real Clerk, Vercel, and managed Postgres environment variables, then replace local file-backed persistence with the Prisma adapter.
- Phase 2 virtual computer proof remains deferred until Phase 1 acceptance is proven.
- Deployment may remain blocked until Vercel credentials and production env vars are available.

### 2026-07-04 Phase 1 runtime verification

- `npm run qa` passed on VPS2.
- Local runtime verified landing, onboarding, POST `/api/onboarding`, and dashboard via curl on port 3100.
- Responsive screenshots captured at 375, 768, and 1440 widths in `docs/qa-screenshots/`.
- Vercel deployment and MinionMint.com DNS are blocked until Vercel credentials, Clerk keys, managed Postgres URL, and DNS records are available.
- `npm audit --audit-level=moderate` reports a moderate PostCSS advisory through Next with no fix available at the installed version; track before production launch.

### 2026-07-04 Phase 1 source doctrine and UI tightening

- Ingested provided source packet and preliminary channel notes into `docs/research/minionmint-source-synthesis.md`.
- Updated product doctrine so MinionMint is a Minion Blueprint minting desk, not a generic chatbot builder.
- Updated README, PRODUCT, onboarding copy, dashboard copy, generated plan structure, visual language, and product marketing context.
- Revised UI spacing and brand accents with subtle neon yellow and neon blue highlights.
- Verification completed: `npm run qa`, runtime save/dashboard curl checks, and updated mobile, tablet, and desktop screenshots.

### 2026-07-04 Doctrine approved and Phase 1 hardening started

- Approval document accepted MinionMint as a minting desk for bounded AI workers and approved the product doctrine as the working foundation.
- Added persistent `AGENTS.md` guardrail so future sessions do not drift toward generic chatbot builder assumptions.
- Added environment contracts for Clerk, managed Postgres, OpenAI concierge generation, and local fallback forcing.
- Added Prisma/Postgres persistence boundary behind the existing onboarding and dashboard flow while keeping local fallback for development.
- Added model-backed concierge service boundary with deterministic fallback.
- Added blueprint edit, refine, approve, and save states before provisioning.
- Expanded dashboard toward an operations-board preview with status, mission, first work order, knowledge, memory, approval queue, connected tools, next action, last activity, first-week win, and owner review state.

### 2026-07-04 First self-hosted runtime supervisor slice

- Added a self-hosted runtime supervisor module using structured `spawn` argv, not shell command strings.
- Added per-Minion workspace, Hermes config, credential-ref, supervisor-state, and runtime-log files.
- Added launch, status, and stop actions that operate on the real stored PID.
- Added `/minions/[minionId]` as the local Minion console route with status, paths, logs, and owner takeover instructions.
- Production credential-vault UI remains a next slice.

### 2026-07-04 Prisma runtime persistence slice

- Added a runtime store abstraction that keeps local fallback for dev and uses Prisma/Postgres when `DATABASE_URL` is configured.
- Added MinionRuntime persistence fields for minion ID, blueprint name, workspace/config paths, supervisor/log paths, process supervisor JSON, and available actions.
- Added a migration for full MinionRuntime persistence fields and org-scoped unique lookup by Minion ID.
- Dashboard and Minion console runtime reads now go through the runtime store boundary.

### 2026-07-05 Owner credential setup slice

- Added the smallest owner credential setup loop for saving generated vault references through the dashboard without raw credential value fields.
- Added CredentialSetup Prisma schema and local fallback storage for dev, including credential type, allowed-use notes, redacted display values, optional local ciphertext, and value fingerprints.
- Runtime launch now reads owner credential setup readiness and keeps scaffolded refs blocked unless the explicit local-dev override is set.
