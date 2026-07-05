# MinionMint Deployment and Provisioning Modes

This document separates what works today from the provider-neutral provisioning system MinionMint is intended to become.

## Status summary

Phase 1 is a blueprint and local/self-hosted runtime proof product. It has local and Prisma-verified runtime packaging, health checks, and restart/stop lifecycle for a configured self-hosted process, but MinionMint.com is not yet verified for production Hermes Minion operation.

MinionMint owns the product, user accounts, dashboard, Minion configuration, credential setup, provisioning layer, and workspace lifecycle. Cloud-computer providers are adapters behind MinionMint. Cloud-computer-style workspaces are a useful reference pattern, but MinionMint should present its own owned provider layer rather than naming a reference vendor in product setup copy.

Current app can:

- run in local demo mode without external services,
- run in production Phase 1 mode with Clerk, Postgres, and optional OpenAI,
- create, refine, approve, save, and review Minion Blueprints,
- preview planned identity surfaces for phone, email, payment, apps, credentials, workspace, knowledge vault, observability, and owner takeover,
- report provider-neutral provisioning readiness through `/api/provisioning`,
- run a first self-hosted runtime supervisor loop that creates workspace files, writes a `runtime-package.json` contract, launches a configured local process, stores PID/health/log excerpts, performs PID/HTTP/command health checks without shell strings, restarts by stopping the old PID before launching a new one, stops the PID, exposes a local Minion console route, and persists MinionRuntime records through Prisma when `DATABASE_URL` is configured,
- let an owner save credential references through the dashboard, show redacted values only, and persist CredentialSetup records through Prisma when `DATABASE_URL` is configured.

Current app cannot yet:

- create a real workspace through a managed provider adapter,
- prove production domain OAuth and live MinionMint.com deployment,
- prove real long-running Hermes Minion operation on a production host,
- issue a production credential vault encrypted by user-owned setup,
- create a live phone number or SMS/iMessage channel,
- create a live email inbox,
- issue a payment card,
- connect Composio apps,
- store user API keys in a production credential vault,
- open a live Minion workspace from the dashboard.

## Tier 1: Local demo mode

Purpose: prove the UI and blueprint flow.

Required environment:

```bash
# No required external credentials.
MINIONMINT_FORCE_LOCAL_STORE=true # optional
```

Capabilities:

- local demo identity,
- local fallback storage,
- deterministic blueprint generation if OpenAI is absent,
- dashboard preview only.

Limitations:

- no real auth,
- no managed Postgres,
- no real model generation unless OpenAI is configured,
- no provisioning.

## Tier 2: Production Phase 1 mode

Purpose: make the blueprint product usable by signed-in users.

Required environment:

```bash
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=...
CLERK_SECRET_KEY=...
DATABASE_URL=postgresql://...
OPENAI_API_KEY=... # optional but recommended
CONCIERGE_MODEL=gpt-4o-mini # optional
```

Clerk Google OAuth setup:

1. Create or open the Clerk application.
2. In Clerk, enable Google as a social connection.
3. Configure Google OAuth credentials if Clerk asks for custom credentials.
4. Add the production domain and local development domains to Clerk’s allowed origins and redirect URLs.
5. Set `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` and `CLERK_SECRET_KEY` in Vercel or the hosting environment.
6. Deploy and verify a real Google sign-in before inviting users.

Capabilities:

- sign in through Clerk,
- save per-user Minion Blueprint state to managed Postgres,
- generate or refine blueprints with OpenAI when configured,
- review planned operating identity surfaces on the dashboard.

Limitations:

- still no real Minion workspace provisioning.

## Tier 3: Provisioning mode

Purpose: bridge from an approved Minion Blueprint to a real Minion workspace through a selected provider adapter.

Provider-neutral environment:

```bash
MINIONMINT_COMPUTER_PROVIDER=local_stub | self_hosted | e2b | browserbase | scrapybara | daytona | modal
MINIONMINT_HERMES_TEMPLATE_REF=...
MINIONMINT_CREDENTIAL_VAULT_PROVIDER=...
MINIONMINT_WORKSPACE_REGION=... # optional
MINIONMINT_WORKSPACE_BASE_IMAGE=... # optional
```

Provider-specific environment:

```bash
E2B_API_KEY=... # only when MINIONMINT_COMPUTER_PROVIDER=e2b
BROWSERBASE_API_KEY=... # only when MINIONMINT_COMPUTER_PROVIDER=browserbase
SCRAPYBARA_API_KEY=... # only when MINIONMINT_COMPUTER_PROVIDER=scrapybara
```

Optional identity surface providers:

```bash
AGENTPHONE_API_KEY=...
AGENTMAIL_API_KEY=...
AGENTCARD_API_KEY=...
COMPOSIO_API_KEY=...
LATITUDE_API_KEY=...
```

Owned or self-hosted provider requirements:

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

Required implementation before this tier is genuinely production-live:

1. Production credential vault provider that turns owner setup into encrypted references managed fully inside MinionMint.
2. Managed provider adapters behind the `ComputerProvider` or `WorkspaceProvider` interface.
3. Production host tenant isolation around the self-hosted supervisor.
4. Audit logs for provisioning attempts, provider errors, launches, health checks, restarts, stops, and owner takeover.

Self-hosted runtime supervisor environment:

```bash
MINIONMINT_COMPUTER_PROVIDER=self_hosted
MINIONMINT_HERMES_TEMPLATE_REF=local-hermes-template
MINIONMINT_CREDENTIAL_VAULT_PROVIDER=local-dev-vault
MINIONMINT_SELF_HOSTED_WORKSPACE_ROOT=/tmp/minionmint-workspaces
MINIONMINT_SELF_HOSTED_EXECUTABLE=node
MINIONMINT_SELF_HOSTED_ARGS_JSON='["-e","setInterval(()=>console.log(\\"minion heartbeat\\"),1000)"]'
MINIONMINT_SELF_HOSTED_HEALTH_EXECUTABLE=node # optional structured health check
MINIONMINT_SELF_HOSTED_HEALTH_ARGS_JSON='["-e","process.exit(0)"]'
MINIONMINT_SELF_HOSTED_MAX_RESTARTS=3
MINIONMINT_ALLOW_SCAFFOLDED_CREDENTIAL_REFS_FOR_DEV=true # local testing only
```

`MINIONMINT_SELF_HOSTED_EXECUTABLE` plus `MINIONMINT_SELF_HOSTED_ARGS_JSON` are passed to `spawn` as structured argv with `shell: false`. Args may include `{profile}`, `{config}`, `{workspace}`, and `{minionId}` placeholders. Health checks use PID liveness by default, or optional HTTP URL / structured command checks. Command health checks use executable plus JSON argv and `shell: false`. Each prepared self-hosted workspace writes a runtime package contract containing Hermes profile path, config path, workspace root, credential refs path, log path, supervisor state path, health check configuration, restart policy, owner takeover notes, approval rails, and credential refs. Scaffolded credential refs are not encrypted credentials and must not be used as production proof.

Current implementation:

- `apps/web/app/lib/provisioning.ts` defines `ComputerProvider`, `WorkspaceProvider`, `HermesTemplateProvider`, `CredentialVaultProvider`, and `MinionRuntimeProvider` contracts.
- Core methods include `checkReadiness`, `prepareWorkspace`, `launchWorkspace`, `stopWorkspace`, `getWorkspaceStatus`, `getAccessUrl`, `attachCredentials`, and `renderHermesConfig`.
- `apps/web/app/api/provisioning/route.ts` exposes readiness, prepare, launch, status, restart, and stop actions.
- Dashboard displays the selected provider and blocks launch when provider-neutral requirements are missing.
- The self-hosted adapter can launch a configured local process, record PID/health/logs, write runtime-package and supervisor-state files, restart by stopping the old PID before launching a new one, persist MinionRuntime records through Prisma/Postgres when `DATABASE_URL` is configured, and open `/minions/[minionId]` as a local console route.
- Managed cloud-computer vendors are documented only as adapter categories, not as required foundations.

## Safety rules

- Never store raw provider keys in docs, client code, screenshots, or blueprint text.
- Do not show “connected” for phone, email, payment, apps, observability, or workspace unless the provider is actually configured and verified.
- Do not expose a clickable “Launch Minion” path unless the backend can really create or open the workspace.
- Every external action must be approval-gated and logged.
