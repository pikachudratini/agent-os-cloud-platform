import { readFileSync } from 'node:fs';
const ledger = readFileSync('docs/LEDGER.md', 'utf8');
const requiredHeaders = ['ID','Title','Phase','Depends on','Status','Acceptance criteria','Evidence','Notes'];
for (const header of requiredHeaders) { if (!ledger.includes(header)) { console.error(`Ledger is missing required header: ${header}`); process.exit(1); } }
const taskIds = [...ledger.matchAll(/\|\s*(P0-\d{3})\s*\|/g)].map((m) => m[1]);
if (taskIds.length < 10) { console.error(`Expected at least 10 MVP ledger tasks, found ${taskIds.length}.`); process.exit(1); }
const statuses = ['todo','doing','blocked','review','done'];
for (const line of ledger.split('\n').filter((line) => /^\|\s*P0-/.test(line))) { const cols = line.split('|').map((c) => c.trim()); const status = cols[5]; if (!statuses.includes(status)) { console.error(`Invalid status in ledger line: ${line}`); process.exit(1); } if (!cols[6] || cols[6].length < 10) { console.error(`Acceptance criteria too thin in ledger line: ${line}`); process.exit(1); } }
console.log(`Validated ${taskIds.length} ledger tasks.`);
