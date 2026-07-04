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

## Top Clarifying Questions For Approval

1. Which managed auth provider should be used first: Clerk, Auth0, WorkOS, or Auth.js backed by a managed identity setup?
2. Should the first deploy target stay on VPS2, use Vercel plus managed Postgres, or use another host?
3. Which model provider should power the concierge onboarding agent during design-partner testing?
4. Should virtual computer proof-of-concept happen in Phase 2, or should it remain deferred until after onboarding and agent chat prove value?
5. What name should the public repo and product use: Cohort, Agent OS Cloud Platform, or another name?

## Session Summary Log

### 2026-07-04 Phase 0 kickoff scaffold

- Created repository scaffold on VPS2 under `/root/agent-os-cloud-platform`.
- Added product north star, ADR-0001 through ADR-0006, QA loop, ledger, workspace metadata, and CI workflow.
- No product feature code was implemented, per kickoff instruction.
- Next task after approval: choose auth provider and implement tenant schema plus RLS proof test.
- Needs input: the five clarifying questions above.
