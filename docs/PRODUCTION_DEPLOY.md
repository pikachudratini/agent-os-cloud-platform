# MinionMint Production Deployment Guide

## Prerequisites

- A Vercel account (free tier works)
- A Neon Postgres database (free tier works)
- A Clerk account for authentication (free tier works)
- An SSH-accessible Linux machine for Minion provisioning (VPS, dedicated server, or residential computer)
- Optional: A residential proxy or WireGuard VPN for Facebook-safe browsing

## Step 1: Clone and Install

```bash
git clone https://github.com/pikachudratini/agent-os-cloud-platform.git
cd agent-os-cloud-platform
npm install
```

## Step 2: Create Environment File

Copy `.env.example` to `.env` and fill in the values:

```bash
cp .env.example .env
```

### Required Variables

| Variable | Description | Example |
|---|---|---|
| `DATABASE_URL` | Neon Postgres connection string | `postgresql://user:pass@ep-xxx.neon.tech/dbname?sslmode=require` |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk publishable key | `pk_test_...` |
| `CLERK_SECRET_KEY` | Clerk secret key | `sk_test_...` |
| `MINIONMINT_SSH_HOST` | SSH host for Minion provisioning | `192.168.1.100` or `host.example.com` |
| `MINIONMINT_SSH_USERNAME` | SSH username | `root` or `minion` |
| `MINIONMINT_SSH_PRIVATE_KEY_PATH` | Path to SSH private key | `/path/to/id_ed25519` |
| `MINIONMINT_SSH_PORT` | SSH port (default 22) | `22` |

### Optional: Residential Network

| Variable | Description | Example |
|---|---|---|
| `MINIONMINT_NETWORK_TYPE` | Network mode | `socks5_proxy` or `wireguard_vpn` or `direct` |
| `MINIONMINT_SOCKS5_HOST` | Residential proxy host | `residential.proxy.com` |
| `MINIONMINT_SOCKS5_PORT` | Residential proxy port | `1080` |
| `MINIONMINT_SOCKS5_USERNAME` | Proxy username | `user` |
| `MINIONMINT_SOCKS5_PASSWORD` | Proxy password | `pass` |
| `MINIONMINT_SOCKS5_PROXY_TYPE` | Proxy classification | `residential` |
| `MINIONMINT_DISABLE_WEBRTC` | Disable WebRTC to prevent leaks | `true` |
| `MINIONMINT_VPN_KILL_SWITCH` | Block traffic if VPN disconnects | `true` |

### Optional: Hermes Installer

| Variable | Description | Default |
|---|---|---|
| `MINIONMINT_HERMES_INSTALL_URL` | Custom Hermes install script URL | `https://raw.githubusercontent.com/NousResearch/hermes-agent/main/scripts/install.sh` |
| `MINIONMINT_HERMES_TEMPLATE_REF` | Base template or image | unset |
| `MINIONMINT_CREDENTIAL_VAULT_PROVIDER` | Vault provider | `scaffolded-local-refs` |

## Step 3: Set Up Database

```bash
# Create a Neon database at https://neon.tech
# Add the connection string to .env as DATABASE_URL

# Run Prisma migrations
npx prisma db push
```

## Step 4: Set Up Authentication

1. Create a Clerk application at https://clerk.com
2. Add your domain to allowed origins
3. Copy the publishable key and secret key to `.env`
4. Configure sign-in/sign-up routes (already set at `/sign-in` and `/sign-up`)

## Step 5: Configure SSH Provider

MinionMint provisions Minions on remote machines via SSH. You need at least one SSH-accessible machine.

### Single Host (Simplest)

Set these environment variables:
```
MINIONMINT_SSH_HOST=your-server-ip
MINIONMINT_SSH_USERNAME=root
MINIONMINT_SSH_PRIVATE_KEY_PATH=/path/to/key
MINIONMINT_SSH_PORT=22
```

### Multiple Hosts (Advanced)

Set `MINIONMINT_SSH_HOSTS_JSON` to a JSON array:
```json
[
  {
    "hostId": "contabo-1",
    "host": "192.168.1.100",
    "port": 22,
    "username": "root",
    "privateKeyPath": "/keys/contabo-1.key",
    "authMode": "key"
  },
  {
    "hostId": "residential-1",
    "host": "10.0.0.50",
    "port": 22,
    "username": "minion",
    "password": "secret",
    "authMode": "password"
  }
]
```

### Requirements on the Remote Machine

The SSH-accessible machine must have:
- Linux or Windows
- Python 3.8+
- A desktop environment (for browser-based Minions): `apt install xfce4 x11vnc`
- `tmux` for process management: `apt install tmux`
- For computer-use actions: `apt install xdotool scrot`

## Step 6: Deploy to Vercel

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Follow the prompts:
# - Link to existing project? No (first time)
# - Project name: minionmint
# - Framework: Next.js (auto-detected)
# - Build command: npm run build
# - Output directory: apps/web/.next
```

### Vercel Environment Variables

In the Vercel dashboard, go to Settings → Environment Variables and add all variables from your `.env` file.

**Important:** SSH private key paths don't work on Vercel's serverless functions. Instead, set `MINIONMINT_SSH_PRIVATE_KEY` to the actual key content (not a path):

```
MINIONMINT_SSH_PRIVATE_KEY=-----BEGIN OPENSSH PRIVATE KEY-----
...
-----END OPENSSH PRIVATE KEY-----
```

## Step 7: Set Up Residential Proxy (Optional but Recommended for Facebook)

### Option A: Dedicated Static Residential Proxy

1. Purchase from ResidentialVPS.com, SolaDrive, or IPBurger
2. Get SOCKS5 proxy credentials: host, port, username, password
3. Set environment variables:
   ```
   MINIONMINT_NETWORK_TYPE=socks5_proxy
   MINIONMINT_SOCKS5_HOST=proxy.residentialvps.com
   MINIONMINT_SOCKS5_PORT=1080
   MINIONMINT_SOCKS5_USERNAME=your-user
   MINIONMINT_SOCKS5_PASSWORD=your-pass
   MINIONMINT_SOCKS5_PROXY_TYPE=residential
   MINIONMINT_DISABLE_WEBRTC=true
   ```

### Option B: WireGuard VPN Tunnel

1. Set up WireGuard on the remote machine
2. Set environment variables:
   ```
   MINIONMINT_NETWORK_TYPE=wireguard_vpn
   MINIONMINT_VPN_KILL_SWITCH=true
   ```

### Option C: Direct (Datacenter IP)

For Email Game Changers and ordinary browsing:
```
MINIONMINT_NETWORK_TYPE=direct
```

## Step 8: Verify Deployment

1. Visit your Vercel URL
2. Sign in with Clerk
3. Go to `/setup` and verify readiness checks pass
4. Go to `/dashboard` and select a computer type
5. Click "Prepare Workspace" to test SSH connectivity
6. Click "Launch Minion" to start a Hermes process

## Step 9: Set Up a Custom Domain

1. In Vercel dashboard: Settings → Domains
2. Add `minionmint.com` (or your preferred domain)
3. Update DNS records as instructed
4. Update Clerk allowed origins to include the custom domain

## Troubleshooting

### SSH Connection Fails

- Verify the remote machine is reachable: `ssh user@host`
- Check firewall rules allow port 22
- For Vercel deployments, use `MINIONMINT_SSH_PRIVATE_KEY` (key content) not `MINIONMINT_SSH_PRIVATE_KEY_PATH` (file path)
- Verify the key has correct permissions: `chmod 600 ~/.ssh/id_ed25519`

### Hermes Install Fails on Remote Machine

- Check internet connectivity on the remote machine
- Verify Python 3.8+ is installed: `python3 --version`
- Check available disk space: `df -h`
- Try manual install: `curl -fsSL https://raw.githubusercontent.com/NousResearch/hermes-agent/main/scripts/install.sh | bash`

### Browser Profile Not Working

- Install a desktop environment on the remote machine: `apt install xfce4`
- Install Chrome or Firefox: `apt install firefox`
- Set DISPLAY environment variable: `export DISPLAY=:0`
- For headless operation: `apt install xvfb`

### Residential Proxy Leaks

- Verify WebRTC is disabled: check `browser://flags/#disable-webrtc`
- Run a leak test at https://browserleaks.com/ip
- Ensure DNS is routed through the proxy
- Verify QUIC/HTTP3 is disabled in browser settings

## Architecture

```
User (browser)
  ↓ HTTPS
Vercel (Next.js app)
  ↓ SSH (via ssh2)
Remote Machine (Linux/Windows)
  ├── Hermes Agent (in tmux)
  ├── Browser profile (with optional proxy)
  └── Workspace files
```

## Security Considerations

- Use workspace-scoped API keys for CI and third-party integrations
- Store SSH private keys as Vercel environment variables, not in code
- Use encrypted credential vault for sensitive data
- Enable approval rails for sends, spends, and changes
- Regularly rotate VNC passwords and SSH keys
- Monitor access logs on the remote machine

## Support

- Documentation: https://docs.minionmint.com (when live)
- GitHub: https://github.com/pikachudratini/agent-os-cloud-platform
- Hermes Agent docs: https://hermes-agent.nousresearch.com/docs
