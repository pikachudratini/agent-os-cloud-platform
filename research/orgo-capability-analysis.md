# Orgo Capability Analysis → MinionMint Feature Parity

## Source
- Orgo full API docs: https://docs.orgo.ai/llms-full.txt
- Video: https://youtu.be/LvsQR7Vc4fQ (podcast "Grok 4.5 is a bigger deal than Fable 5" with Nick Vasilescu, Orgo co-founder)
- Video transcript: YouTube blocked from datacenter IP; could not ingest via Gemini (no key) or yt-dlp (IP blocked)

## Orgo Core Value Proposition
"Instant cloud computers your AI agent can see, control, and operate. A full Linux or Windows desktop, ready in under a second, through an API."

## Orgo Capabilities — Exhaustive List

### 1. Cloud Computer Provisioning
- **Create computer**: POST /computers — creates a VM with configurable RAM (4-64 GB), CPU (1-16 cores), disk size, resolution
- **Boot time**: Under 500ms
- **OS**: Linux (Windows in beta)
- **Status lifecycle**: creating → starting → running → stopping → stopped → restarting → deleting → error
- **Auto-stop**: Configurable inactivity timeout

### 2. Computer Management
- **Clone**: POST /computers/{id}/clone — copies disk state
- **Resize**: PATCH /computers/{id}/resize — live-resize CPU, RAM, disk, bandwidth while running
- **Move**: PATCH /computers/{id}/move — move between workspaces
- **Start/Stop/Restart**: Full lifecycle control
- **Delete**: DELETE /computers/{id}

### 3. Computer Actions (Computer-Use API)
- **Screenshot**: GET /computers/{id}/screenshot — base64 PNG
- **Click**: POST /computers/{id}/click — x, y, button (left/right), double-click
- **Drag**: POST /computers/{id}/drag — start/end coordinates, button, duration
- **Type text**: POST /computers/{id}/type — type arbitrary text
- **Press key**: POST /computers/{id}/key — Enter, Tab, Escape, ctrl+c, cmd+a, etc.
- **Scroll**: POST /computers/{id}/scroll — direction, amount
- **Wait**: POST /computers/{id}/wait — pause 0-60 seconds
- **Bash**: POST /computers/{id}/bash — execute shell commands, returns stdout/stderr/exit_code
- **Exec (Python)**: POST /computers/{id}/exec — execute Python code with timeout

### 4. Model Integration (Computer-Use Agent Loop)
- **OpenAI-compatible endpoint**: POST /v1/chat/completions with computer_id field
- **Supported models**: Claude Opus 4.7/4.6, Claude Sonnet 4.6, Claude Haiku 4.5
- **Streaming**: stream: true for token streaming
- **Thread continuity**: thread_id for conversation continuation
- **Multi-provider**: Can use OpenAI, Google, Nous Research via per-action endpoints
- **Agent installation**: Can install Hermes Agent, OpenClaw, or any CLI agent inside the desktop

### 5. Desktop Access
- **VNC**: Full VNC access via WebSocket
- **Web desktop**: noVNC web client at connection_url
- **VNC password**: Rotates on restart, fetched via API
- **Terminal**: WebSocket terminal access
- **Audio**: WebSocket audio stream
- **Events**: WebSocket event stream

### 6. File Management
- **Upload**: POST /files/upload — upload files to computer desktop
- **Files land at**: /root/Desktop/<filename>

### 7. Workspace Management
- **Workspaces**: Group related computers (production, staging, projects)
- **Create/List/Get/Delete**: Full workspace CRUD
- **Workspace-scoped API keys**: For CI and third-party integrations

### 8. Agent Migration
- **State transfer**: Tarball-based migration of agent state between machines
- **Supported agents**: Hermes Agent, OpenClaw
- **Transfer methods**: SCP from DigitalOcean, flyctl from Fly.io, SCP from Hetzner, any VPS with SSH
- **What carries over**: API keys, skills, memory, chat sessions, bot tokens, hooks, cron entries
- **What doesn't carry**: WhatsApp sessions, iMessage bridges, systemd units, system crontab, OS packages

### 9. Network Access
- **Proxy**: Authenticated proxy at /api/desktops/{instance_id}/proxy/<path>
- **No public per-VM hostname**: All access through Orgo API proxy
- **Outbound/socket mode**: For gateways (Slack Socket Mode, Telegram long-polling)

### 10. Use Cases (from docs)
1. Drive a computer with a model provider (computer-use automation)
2. Install an agent inside the computer (persistent runtime)
3. Run developer CLIs (Claude Code, Codex) on always-on machines

## MinionMint Feature Parity Matrix

| Orgo Capability | MinionMint Status | Gap | Priority |
|---|---|---|---|
| Create cloud computer | ✅ RemoteSshComputerProvider.prepareWorkspace() | Needs real SSH connection test | P0 |
| Sub-500ms boot | ❌ Not applicable (SSH to existing machine) | Different model: MinionMint uses existing machines, not VMs | — |
| Configurable RAM/CPU/disk | ❌ Not yet | Can be added via SSH provider (check/specify machine specs) | P2 |
| Screenshot | ❌ Not yet | Can be added via SSH + xdotool/scrot | P1 |
| Click/Drag/Type/Key/Scroll | ❌ Not yet | Can be added via SSH + xdotool/xdotool | P1 |
| Bash execution | ✅ execRemote() in remote-ssh-provider.ts | Works | — |
| Python exec | ❌ Not yet | Can be added via SSH + python3 | P1 |
| Model integration (computer-use loop) | ❌ Not yet | Needs /v1/chat/completions endpoint with computer_id | P1 |
| VNC access | ❌ Not yet | Can be added via noVNC + websockify on remote machine | P1 |
| Web desktop (noVNC) | ❌ Not yet | Can be added via noVNC web client | P1 |
| File upload | ❌ Not yet | Can be added via SFTP (ssh2 supports SFTP) | P1 |
| Workspace management | ✅ Prisma schema has workspace support | Needs UI integration | P2 |
| Clone computer | ❌ Not yet | Can be added via disk snapshot/clone | P2 |
| Live resize | ❌ Not yet | Not applicable for SSH model (would need VM provider) | P3 |
| Agent migration | ❌ Not yet | Can be added via tarball + SFTP | P2 |
| Auto-stop on inactivity | ❌ Not yet | Can be added via cron + idle detection | P2 |
| Multiple OS support | ✅ SSH works with Linux and Windows | Already supported | — |
| Persistent browser profile | ✅ deployBrowserProfile() in hermes-installer.ts | Works | — |
| Residential network support | ✅ NetworkProvider with SOCKS5/WireGuard | Works | — |
| Approval rails | ✅ Blueprint has approvalRails | MinionMint advantage | — |
| Credential vault | ✅ CredentialStore with encryption | MinionMint advantage | — |
| Mission/blueprint system | ✅ Full minting interview and blueprint | MinionMint advantage | — |
| Owner takeover controls | ✅ Stop/restart via API | Works | — |

## Where MinionMint Can Exceed Orgo

1. **Mission-driven Minion creation**: Orgo gives you a computer; MinionMint gives you a Minion with a mission, knowledge vault, approval rails, and memory rules
2. **Approval gates**: Orgo has no built-in approval rails. MinionMint blocks sends/spends/submits/changes
3. **Credential vault**: Orgo leaves credentials in plain files. MinionMint has encrypted vault refs
4. **Residential network support**: Orgo uses datacenter IPs only. MinionMint supports residential proxies and VPN tunnels
5. **Browser profile deployment**: MinionMint deploys persistent browser profiles with proxy support
6. **Product flow**: Orgo is an API for developers. MinionMint is a product for creating Minions that do work
7. **Provider-neutral**: MinionMint works with any SSH-accessible machine, not just Orgo's cloud

## What MinionMint Still Needs (Prioritized)

### P0 — Critical for Minimum Viable Product
1. Real SSH connection test to a remote machine
2. Hermes installation on remote machine
3. tmux-based process launch and management
4. Dashboard showing Minion status and actions

### P1 — Computer-Use Feature Parity
5. Screenshot via SSH (scrot/xdotool)
6. Click/type/key/scroll via SSH (xdotool)
7. VNC/noVNC web desktop on remote machine
8. File upload via SFTP
9. Python execution via SSH

### P2 — Enhanced Management
10. Workspace management UI
11. Agent migration (tarball + SFTP)
12. Auto-stop on inactivity
13. Machine spec checking and selection

### P3 — Advanced
14. Computer-use model loop endpoint (/v1/chat/completions with computer_id)
15. Live resize (VM provider only)
16. Clone computer (disk snapshot)
