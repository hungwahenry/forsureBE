# Deploying forsure backend

Single-instance Hetzner Ubuntu 24.04 deploy. Bare-metal, no Docker.

## Stack on the box
- PostgreSQL 16 + PostGIS 3 (PGDG)
- Redis 7
- Node 22 (NodeSource)
- Caddy (auto-TLS via Let's Encrypt)
- systemd unit `forsure-be`

## First-time setup

### 1. DNS
Point `api.forsure.fyi` → server IP. **DNS-only / gray cloud** while issuing
the cert; flip to proxied later if you want Cloudflare in front.

```
dig api.forsure.fyi +short   # confirm before proceeding
```

### 2. Run the bootstrap
SSH in as root, paste the script in, run it. (The repo is public, so this
script can be downloaded directly.)

```bash
curl -fsSL https://raw.githubusercontent.com/hungwahenry/forsureBE/main/deploy/bootstrap.sh -o bootstrap.sh
chmod +x bootstrap.sh
./bootstrap.sh
```

It prompts for your SSH public key (for the `deploy` user) and a Let's
Encrypt email. Everything else is automated.

### 3. Fill in the .env
The script clones the repo and creates `/srv/forsure-be/.env` from the
template, with `DATABASE_URL` already set. Everything else needs values:

```bash
ssh deploy@<server-ip>
nano /srv/forsure-be/.env
```

Fields that need real values:
- `JWT_ACCESS_SECRET` — `openssl rand -base64 64 | tr -d '\n'`
- `RESEND_API_KEY`
- `RESEND_FROM_EMAIL` (verified sender on forsure.fyi)
- `S3_*` — Cloudflare R2 credentials
- `GOOGLE_PLACES_API_KEY`
- `EXPO_ACCESS_TOKEN` — https://expo.dev/accounts/<you>/settings/access-tokens

### 4. First build + migrate + start
```bash
cd /srv/forsure-be
npm ci
npm run build
npx prisma migrate deploy
sudo systemctl start forsure-be

# Watch it come up
sudo journalctl -u forsure-be -f

# Once healthy
curl https://api.forsure.fyi/health
```

### 5. Wire CI/CD
On your laptop, generate a deploy keypair just for the GitHub Action:

```bash
ssh-keygen -t ed25519 -C "github-action-deploy" -f ~/.ssh/forsure_deploy -N ""
```

Add the public key to the server's deploy user:
```bash
ssh-copy-id -i ~/.ssh/forsure_deploy.pub deploy@<server-ip>
```

In GitHub repo settings → Secrets and variables → Actions, add:
- `SERVER_HOST` — server IP or `api.forsure.fyi`
- `DEPLOY_SSH_KEY` — contents of `~/.ssh/forsure_deploy` (private key)

Push to main → `.github/workflows/deploy.yml` runs → server pulls + rebuilds
+ migrates + restarts. Health check at the end fails the workflow if the new
version doesn't come up.

## Day-to-day operations

### Logs
```bash
sudo journalctl -u forsure-be -f             # app
sudo journalctl -u caddy -f                  # tls / proxy
sudo tail -f /var/log/caddy/access.log       # request log
```

### Restart
```bash
sudo systemctl restart forsure-be
```

### Manual deploy (without CI)
```bash
ssh deploy@<server-ip>
cd /srv/forsure-be
git pull --ff-only origin main
npm ci
npm run build
npx prisma migrate deploy
sudo systemctl restart forsure-be
```

### Postgres
```bash
sudo -u postgres psql -d forsure
```

### Database backup
```bash
# manual snapshot
sudo -u postgres pg_dump -Fc forsure > "/tmp/forsure-$(date +%F).dump"
```
TODO: schedule daily via cron + push to R2 or a Storage Box.

## Rollback
```bash
ssh deploy@<server-ip>
cd /srv/forsure-be
git log --oneline -10
git reset --hard <good-sha>
npm ci && npm run build
sudo systemctl restart forsure-be
```
Migrations don't auto-roll-back — handle by hand if a migration is the cause.
