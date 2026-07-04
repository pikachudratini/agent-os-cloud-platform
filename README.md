# Agent OS Cloud Platform

Customer-facing product name: **MinionMint**. Keep `agent-os-cloud-platform` as the internal repo and scaffold name until the first live deploy is stable.

MinionMint is a minting desk for useful, approval-gated AI Minions. It turns a messy business need into a clear Minion Blueprint: mission, memory, knowledge sources, approval rails, first review task, and planned operating identity surfaces such as inbox, phone, apps, payment rails, knowledge vault, observability, and future workspace.

This is not intended to be a generic chatbot builder. The product starts with diagnosis, not prompt editing. A non-technical user should finish onboarding knowing exactly what their Minion is for, what inputs it needs, what it can do alone, and what requires approval.

## Current status

**Phase 1 complete does not mean MinionMint can provision real Minions yet.**

The current app is a Phase 1 blueprint scaffold and doctrine pass. It can generate, refine, approve, save, and review a Minion Blueprint. It previews planned operating identity surfaces on the dashboard. It does **not** yet create a live Orgo computer, install or launch Hermes inside that workspace, issue phone numbers, create email inboxes, issue payment cards, connect apps, or store user provider credentials through a production credential vault.

Current Phase 1 includes:

- Minion Blueprint onboarding and review.
- Clerk auth shell with local fallback.
- Prisma/Postgres schema and local file fallback.
- OpenAI-backed concierge when `OPENAI_API_KEY` is configured, with deterministic fallback otherwise.
- Dashboard preview for phone, email, payment, apps, credentials, knowledge vault, observability, owner takeover, and approval rails.
- Provisioning provider interface and status API that clearly report whether real provisioning is configured.

Next milestone: **First real Minion provisioning path.** That milestone must connect Google OAuth, secure credential setup, Orgo workspace creation or provider stub, Hermes template generation, per-Minion config, dashboard workspace status, and a launch/open workspace path.

## How to actually use this

### 1. Local demo mode

Use this mode to verify the UI and blueprint flow only.

Required services:

- No Clerk required.
- No Postgres required.
- No OpenAI required.
- No Orgo or Hermes provisioning required.

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
- `OPENAI_API_KEY` configured if model-backed concierge generation is desired.

Behavior:

- User can sign in.
- User can generate, refine, approve, and save a Minion Blueprint.
- Dashboard shows saved blueprint and planned operating identity surfaces.
- Still cannot provision a real Orgo/Hermes Minion.

Clerk Google OAuth setup:

1. Create a Clerk application.
2. Enable Google as a social connection in the Clerk dashboard.
3. Add the deployed app domain and callback URLs in Clerk.
4. Set `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` and `CLERK_SECRET_KEY` in the deployment environment.
5. Verify sign-in before enabling production traffic.

### 3. Provisioning mode

This is the next product milestone. It is not live-complete in this repo yet.

Required services:

- `ORGO_API_KEY` for Orgo-style cloud computer provisioning.
- `HERMES_TEMPLATE_REF` for the approved Hermes agent template or image.
- `CREDENTIAL_VAULT_PROVIDER` for secure credential storage.
- Optional `AGENTPHONE_API_KEY`, `AGENTMAIL_API_KEY`, `AGENTCARD_API_KEY`, `COMPOSIO_API_KEY`, and `LATITUDE_API_KEY`.

Intended behavior:

- User approves a Minion Blueprint.
- User provides provider credentials through a secure setup flow.
- MinionMint stores encrypted credential references, not raw keys in docs, client code, screenshots, or blueprint text.
- MinionMint creates or prepares an Orgo-style workspace.
- MinionMint generates per-Minion Hermes config from the blueprint.
- Dashboard shows whether phone, email, payment, apps, memory, observability, and workspace are disabled, planned, configured, or connected.
- Dashboard exposes “Open Minion workspace” or “Launch Minion” only after providers are actually configured.

Current provisioning status:

- A provider interface exists in `apps/web/app/lib/provisioning.ts`.
- `/api/provisioning` reports readiness and returns a clear not-configured response when required providers are missing.
- Live Orgo/Hermes API calls are intentionally not implemented yet.

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
