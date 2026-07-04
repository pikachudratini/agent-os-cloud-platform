import { existsSync, readFileSync } from 'node:fs';
const required = ['docs/PRODUCT.md','docs/LEDGER.md','docs/QA.md','docs/adr/ADR-0001-tech-stack-and-monorepo.md','docs/adr/ADR-0002-multi-tenancy-and-data-isolation.md','docs/adr/ADR-0003-auth-and-security-baseline.md','docs/adr/ADR-0004-agent-runtime-and-virtual-computer-strategy.md','docs/adr/ADR-0005-memory-and-knowledge-architecture.md','docs/adr/ADR-0006-communication-channel-integration.md','research/README.md','apps/web/package.json','apps/api/package.json','packages/shared/package.json','.github/workflows/ci.yml','docs/adr/ADR-0007-phase-1-approved-defaults.md','docs/deployment/minionmint-vercel.md','vercel.json'];
const missing = required.filter((file) => !existsSync(file));
if (missing.length) { console.error('Missing required files:'); for (const file of missing) console.error(`- ${file}`); process.exit(1); }
for (const file of required.filter((f) => f.endsWith('.md'))) { if (!readFileSync(file, 'utf8').trim()) { console.error(`${file} is empty`); process.exit(1); } }
console.log(`Validated ${required.length} required scaffold files.`);
