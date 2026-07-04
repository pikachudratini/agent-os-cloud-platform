# Agent OS Cloud Platform

Customer-facing product name: **MinionMint**. Keep `agent-os-cloud-platform` as the internal repo and scaffold name until the first live deploy is stable.

MinionMint is a minting desk for useful, approval-gated AI Minions. It turns a messy business need into a clear Minion Blueprint: mission, memory, knowledge sources, approval rails, first review task, and planned operating identity surfaces such as inbox, phone, apps, payment rails, knowledge vault, observability, and future workspace.

This is not intended to be a generic chatbot builder. The product starts with diagnosis, not prompt editing. A non-technical user should finish onboarding knowing exactly what their Minion is for, what inputs it needs, what it can do alone, and what requires approval.

## Current status

**Phase 1 complete does not mean MinionMint can provision real Minions yet.**

The current app is a Phase 1 blueprint scaffold and doctrine pass. It can generate, refine, approve, save, and review a Minion Blueprint. It previews planned operating identity surfaces on the dashboard. It does **not** yet create a live workspace, install or launch Hermes inside that workspace, issue phone numbers, create email inboxes, issue payment cards, connect apps, or store user provider credentials through a production credential vault.

MinionMint is provider-neutral. The first provisioning bridge defines how a Minion Blueprint can become a launched Minion workspace. The cloud-computer provider is pluggable. Orgo-style workspaces are the reference pattern, but Orgo is not required unless the user chooses the Orgo adapter.

Current Phase 1 includes:

- Minion Blueprint onboarding and review.
- Clerk auth shell with local fallback.
- Prisma/Postgres schema and local file fallback.
- OpenAI-backed concierge when `OPENAI_API_KEY` is configured, with deterministic fallback otherwise.
- Dashboard preview for phone, email, payment, apps, credentials, knowledge vault, observability, owner takeover, and approval rails.
- Provider-neutral provisioning interface and status API that clearly report whether real provisioning is configured.

Next milestone: **First real Minion provisioning path.** That milestone must connect Google OAuth, secure credential setup, a selected workspace provider, Hermes template generation, per-Minion config, dashboard workspace status, and a launch/open workspace path. Orgo can be one optional fast-path adapter, not the foundation MinionMint depends on.

## How to actually use this

### 1. Local demo mode

Use this mode to verify the UI and blueprint flow only.

Required services:

- No real auth required.
- No database required.
- No model provider required.
- No credentials or workspace provider required.

Behavior:

- Uses local demo identity.
- Uses local fallback storage.
- Can create and review Minion Blueprints.
- Cannot provision a real Minion, real workspace, phone, inbox, payment card, app connector, or observability trail.

Commands:

```bash
npm install
npm run dev --workspace @agent-os/web -- --hostname 0.0.0.0 --port 3000
```

### 2. Production Phase 1 mode

Use this mode to make the blueprint product real for signed-in users.

Required services:

- Clerk configured.
- Google OAuth enabled in Clerk.
- Managed Postgres `DATABASE_URL` configured.
- OpenAI or selected model provider configured if model-backed concierge generation is desired.

Behavior:

- User can sign in.
- User can generate, refine, approve, and save a Minion Blueprint.
- Dashboard shows saved blueprint and planned operating identity surfaces.
- Still cannot provision a real Minion workspace.

Clerk Google OAuth setup:

1. Create a Clerk application.
2. Enable Google as a social connection in the Clerk dashboard.
3. Add the deployed app domain and callback URLs in Clerk.
4. Set `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` and `CLERK_SECRET_KEY` in the deployment environment.
5. Verify sign-in before enabling production traffic.

### 3. Provisioning mode

This is the next product milestone. It is not live-complete in this repo yet.

Required provider-neutral services:

- `MINIONMINT_COMPUTER_PROVIDER=local_stub | self_hosted | orgo | e2b | browserbase | scrapybara | daytona | modal`
- `MINIONMINT_HERMES_TEMPLATE_REF` for the approved Hermes agent template or base image.
- `MINIONMINT_CREDENTIAL_VAULT_PROVIDER` for secure credential storage.
- Optional `MINIONMINT_WORKSPACE_REGION`.
- Optional `MINIONMINT_WORKSPACE_BASE_IMAGE`.

Provider-specific keys are optional and namespaced. They are required only when their adapter is selected:

- `ORGO_API_KEY` only when `MINIONMINT_COMPUTER_PROVIDER=orgo`.
- `E2B_API_KEY` only when `MINIONMINT_COMPUTER_PROVIDER=e2b`.
- `BROWSERBASE_API_KEY` only when `MINIONMINT_COMPUTER_PROVIDER=browserbase`.
- `SCRAPYBARA_API_KEY` only when `MINIONMINT_COMPUTER_PROVIDER=scrapybara`.

Owned and self-hosted paths should define provider requirements instead of pretending an Orgo key is universal:

- VPS or server pool config.
- Container or VM runtime.
- Base image with Hermes installed.
- Per-Minion workspace directory or volume.
- Per-Minion Hermes profile and config.
- Secure credential storage.
- Public access or remote desktop path if needed.
- Process supervisor.
- Logging and observability.
- Owner stop and takeover controls.

Optional identity surface providers:

- `AGENTPHONE_API_KEY`
- `AGENTMAIL_API_KEY`
- `AGENTCARD_API_KEY`
- `COMPOSIO_API_KEY`
- `LATITUDE_API_KEY`

Intended behavior:

- User approves a Minion Blueprint.
- User provides provider credentials through a secure setup flow.
- MinionMint stores encrypted credential references, not raw keys in docs, client code, screenshots, or blueprint text.
- MinionMint creates or prepares a cloud-computer-style workspace through the selected adapter.
- MinionMint generates per-Minion Hermes config from the blueprint.
- Dashboard shows whether phone, email, payment, apps, memory, observability, and workspace are disabled, planned, configured, or connected.
- Dashboard exposes “Open Minion workspace” or “Launch Minion” only after providers are actually configured.

Current provisioning status:

- A provider-neutral interface exists in `apps/web/app/lib/provisioning.ts`.
- `/api/provisioning` reports readiness and returns a clear not-configured response when provider-neutral requirements are missing.
- Live provider calls are intentionally not implemented yet.
- Orgo remains an optional adapter and reference model, not a required dependency.

## Commands

```bash
npm install
npm run lint
npm test
npm run build
npm run qa
```

## Repository layout

- `docs/PRODUCT.md`: product thesis, doctrine, audience, differentiation, visual language, phase plan.
- `docs/DEPLOYMENT.md`: environment tiers and deployment/provisioning status.
- `docs/research/minionmint-source-synthesis.md`: source-packet synthesis and platform thesis.
- `docs/LEDGER.md`: resumable task ledger with acceptance criteria and evidence rules.
- `docs/QA.md`: standing QA loop and release gates.
- `docs/adr/`: architecture decision records.
- `apps/web/`: MinionMint web app.
- `apps/api/`: backend workspace placeholder.
- `packages/shared/`: shared TypeScript workspace placeholder.
- `infra/`: infrastructure placeholder.
- `research/`: research corpus scaffold and source plan.
