# Agent OS Cloud Platform

Customer-facing product name: **MinionMint**. Keep `agent-os-cloud-platform` as the internal repo and scaffold name until the first live deploy is stable.

MinionMint is a minting desk for useful, bounded AI workers. It turns a messy business need into a clear Minion Blueprint: mission, memory, knowledge sources, approval rails, first work order, and the future channels or workstation the worker will need.

This is not intended to be a generic chatbot builder. The product starts with diagnosis, not prompt editing. A non-technical user should finish onboarding knowing exactly what their Minion is for, what inputs it needs, what it can do alone, and what requires approval.

## Current status

Phase 1 contains the MinionMint product-doctrine pass, Clerk auth shell, onboarding concierge, saved Minion Blueprint API, dashboard card, Prisma managed Postgres schema, RLS SQL plan, Vercel config, and responsive QA screenshots.

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
- `docs/research/minionmint-source-synthesis.md`: source-packet synthesis and platform thesis.
- `docs/LEDGER.md`: resumable task ledger with acceptance criteria and evidence rules.
- `docs/QA.md`: standing QA loop and release gates.
- `docs/adr/`: architecture decision records.
- `apps/web/`: MinionMint web app.
- `apps/api/`: backend workspace placeholder.
- `packages/shared/`: shared TypeScript workspace placeholder.
- `infra/`: infrastructure placeholder.
- `research/`: research corpus scaffold and source plan.
