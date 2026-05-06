#!/usr/bin/env bash
# One-time setup for a fresh Hetzner Ubuntu 24.04 box.
# Run as root via SSH. Idempotent — safe to re-run if a step fails.
set -euo pipefail

# ---------- Config -----------------------------------------------------------

DOMAIN="api.forsure.fyi"
APP_NAME="forsure-be"
APP_USER="deploy"
APP_DIR="/srv/${APP_NAME}"
REPO_URL="https://github.com/hungwahenry/forsureBE.git"
DB_NAME="forsure"
DB_USER="forsure"
NODE_MAJOR="22"

# ---------- Helpers ----------------------------------------------------------

log() { printf "\n\033[1;36m▸ %s\033[0m\n" "$*"; }
fail() { printf "\033[1;31m✗ %s\033[0m\n" "$*" >&2; exit 1; }

if [[ $EUID -ne 0 ]]; then
  fail "Run as root."
fi

# ---------- Inputs -----------------------------------------------------------

read -rp "Paste your personal SSH public key (single line) for the deploy user: " DEPLOY_PUBKEY
if [[ -z "${DEPLOY_PUBKEY}" || "${DEPLOY_PUBKEY}" != ssh-* ]]; then
  fail "That doesn't look like an SSH public key."
fi

read -rp "Email for Let's Encrypt notifications (e.g. you@forsure.fyi): " LE_EMAIL
[[ -z "${LE_EMAIL}" ]] && fail "Email required."

# ---------- Base packages ----------------------------------------------------

log "Updating apt"
DEBIAN_FRONTEND=noninteractive apt-get update -qq
DEBIAN_FRONTEND=noninteractive apt-get upgrade -y -qq

log "Installing base packages"
DEBIAN_FRONTEND=noninteractive apt-get install -y -qq \
  curl wget gnupg lsb-release ca-certificates \
  ufw fail2ban unattended-upgrades \
  build-essential git jq

# ---------- Swap (2GB) -------------------------------------------------------

if [[ ! -f /swapfile ]]; then
  log "Creating 2GB swap"
  fallocate -l 2G /swapfile
  chmod 600 /swapfile
  mkswap /swapfile
  swapon /swapfile
  echo '/swapfile none swap sw 0 0' >> /etc/fstab
fi

# ---------- Deploy user ------------------------------------------------------

if ! id -u "${APP_USER}" >/dev/null 2>&1; then
  log "Creating ${APP_USER} user"
  adduser --disabled-password --gecos "" "${APP_USER}"
fi
usermod -aG sudo "${APP_USER}"

mkdir -p "/home/${APP_USER}/.ssh"
chmod 700 "/home/${APP_USER}/.ssh"
if ! grep -qF "${DEPLOY_PUBKEY}" "/home/${APP_USER}/.ssh/authorized_keys" 2>/dev/null; then
  echo "${DEPLOY_PUBKEY}" >> "/home/${APP_USER}/.ssh/authorized_keys"
fi
chmod 600 "/home/${APP_USER}/.ssh/authorized_keys"
chown -R "${APP_USER}:${APP_USER}" "/home/${APP_USER}/.ssh"

# Allow systemctl restart/status without password — required by GitHub Action.
cat > /etc/sudoers.d/forsure-deploy <<EOF
${APP_USER} ALL=(root) NOPASSWD: /usr/bin/systemctl start ${APP_NAME}, /usr/bin/systemctl stop ${APP_NAME}, /usr/bin/systemctl restart ${APP_NAME}, /usr/bin/systemctl status ${APP_NAME}, /usr/bin/systemctl reload caddy, /usr/bin/systemctl restart caddy
EOF
chmod 440 /etc/sudoers.d/forsure-deploy

# ---------- SSH hardening ----------------------------------------------------

log "Hardening SSH (key-only, no root password login)"
sed -i 's/^#\?PasswordAuthentication.*/PasswordAuthentication no/' /etc/ssh/sshd_config
sed -i 's/^#\?PermitRootLogin.*/PermitRootLogin prohibit-password/' /etc/ssh/sshd_config
systemctl restart ssh

# ---------- Firewall ---------------------------------------------------------

log "Configuring ufw"
ufw --force reset >/dev/null
ufw default deny incoming
ufw default allow outgoing
ufw allow 22/tcp comment "ssh"
ufw allow 80/tcp comment "http"
ufw allow 443/tcp comment "https"
ufw --force enable

# ---------- fail2ban ---------------------------------------------------------

systemctl enable --now fail2ban

# ---------- Unattended security updates --------------------------------------

dpkg-reconfigure -fnoninteractive unattended-upgrades

# ---------- PostgreSQL 16 + PostGIS via PGDG ---------------------------------

if ! command -v psql >/dev/null 2>&1; then
  log "Installing PostgreSQL 16 + PostGIS (PGDG)"
  install -d /usr/share/postgresql-common/pgdg
  curl -fsSL https://www.postgresql.org/media/keys/ACCC4CF8.asc \
    -o /usr/share/postgresql-common/pgdg/apt.postgresql.org.asc
  echo "deb [signed-by=/usr/share/postgresql-common/pgdg/apt.postgresql.org.asc] https://apt.postgresql.org/pub/repos/apt $(lsb_release -cs)-pgdg main" \
    > /etc/apt/sources.list.d/pgdg.list
  apt-get update -qq
  DEBIAN_FRONTEND=noninteractive apt-get install -y -qq postgresql-16 postgresql-16-postgis-3
  systemctl enable --now postgresql
fi

# Create DB role + database. Generate password if first run.
DB_PW_FILE="/root/.forsure-db-password"
if [[ ! -f "${DB_PW_FILE}" ]]; then
  log "Generating Postgres password for ${DB_USER}"
  DB_PASSWORD=$(openssl rand -base64 32 | tr -d '/+=' | cut -c1-40)
  echo "${DB_PASSWORD}" > "${DB_PW_FILE}"
  chmod 600 "${DB_PW_FILE}"

  sudo -u postgres psql -v ON_ERROR_STOP=1 <<EOF
DO \$\$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = '${DB_USER}') THEN
    CREATE ROLE ${DB_USER} LOGIN PASSWORD '${DB_PASSWORD}';
  END IF;
END
\$\$;
EOF

  sudo -u postgres psql -v ON_ERROR_STOP=1 -tc \
    "SELECT 1 FROM pg_database WHERE datname = '${DB_NAME}'" | grep -q 1 \
    || sudo -u postgres createdb -O "${DB_USER}" "${DB_NAME}"

  sudo -u postgres psql -d "${DB_NAME}" -v ON_ERROR_STOP=1 -c \
    "CREATE EXTENSION IF NOT EXISTS postgis;"
fi

# ---------- Redis ------------------------------------------------------------

if ! command -v redis-server >/dev/null 2>&1; then
  log "Installing Redis"
  DEBIAN_FRONTEND=noninteractive apt-get install -y -qq redis-server
  # Default config binds to 127.0.0.1; leave as-is. Don't expose to network.
  systemctl enable --now redis-server
fi

# ---------- Node.js 22 (NodeSource) ------------------------------------------

if ! command -v node >/dev/null 2>&1 || [[ "$(node -v | cut -c2-3)" != "${NODE_MAJOR}" ]]; then
  log "Installing Node.js ${NODE_MAJOR}"
  curl -fsSL "https://deb.nodesource.com/setup_${NODE_MAJOR}.x" | bash -
  DEBIAN_FRONTEND=noninteractive apt-get install -y -qq nodejs
fi

# ---------- Caddy ------------------------------------------------------------

if ! command -v caddy >/dev/null 2>&1; then
  log "Installing Caddy"
  curl -fsSL https://dl.cloudsmith.io/public/caddy/stable/gpg.key \
    | gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
  curl -fsSL https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt \
    -o /etc/apt/sources.list.d/caddy-stable.list
  apt-get update -qq
  DEBIAN_FRONTEND=noninteractive apt-get install -y -qq caddy
fi

# ---------- Repo + app dir ---------------------------------------------------

if [[ ! -d "${APP_DIR}/.git" ]]; then
  log "Cloning ${REPO_URL} → ${APP_DIR}"
  install -d -o "${APP_USER}" -g "${APP_USER}" "${APP_DIR}"
  sudo -u "${APP_USER}" git clone "${REPO_URL}" "${APP_DIR}"
fi
chown -R "${APP_USER}:${APP_USER}" "${APP_DIR}"

# ---------- Caddy + systemd unit from repo -----------------------------------

log "Installing Caddyfile"
sed -e "s/{{DOMAIN}}/${DOMAIN}/g" -e "s/{{LE_EMAIL}}/${LE_EMAIL}/g" \
  "${APP_DIR}/deploy/Caddyfile" > /etc/caddy/Caddyfile

log "Installing systemd unit"
cp "${APP_DIR}/deploy/${APP_NAME}.service" "/etc/systemd/system/${APP_NAME}.service"
systemctl daemon-reload
systemctl enable "${APP_NAME}"

# Reload Caddy now so the cert can issue (DNS must already point here).
systemctl reload caddy || systemctl restart caddy

# ---------- .env --------------------------------------------------------------

if [[ ! -f "${APP_DIR}/.env" ]]; then
  log "Creating .env from template — fill it in before starting the service"
  cp "${APP_DIR}/deploy/.env.example" "${APP_DIR}/.env"
  chown "${APP_USER}:${APP_USER}" "${APP_DIR}/.env"
  chmod 600 "${APP_DIR}/.env"

  # Inject the DB connection string with the generated password.
  DB_PASSWORD=$(cat "${DB_PW_FILE}")
  sed -i "s|__DATABASE_URL__|postgresql://${DB_USER}:${DB_PASSWORD}@127.0.0.1:5432/${DB_NAME}|" "${APP_DIR}/.env"
fi

# ---------- Done -------------------------------------------------------------

cat <<EOF

\033[1;32m✓ Server bootstrap complete.\033[0m

Next steps (as ${APP_USER} on this box):

  1. ssh ${APP_USER}@$(curl -fsSL https://api.ipify.org 2>/dev/null || echo "<server-ip>")
  2. Edit ${APP_DIR}/.env and fill in everything except DATABASE_URL (already set)
  3. cd ${APP_DIR}
     npm ci
     npm run build
     npx prisma migrate deploy
  4. sudo systemctl start ${APP_NAME}
  5. curl https://${DOMAIN}/health  # should return {"status":"ok"}

Caddy will auto-issue a TLS cert on first request. If it doesn't:
  • confirm DNS: dig ${DOMAIN} +short
  • check logs: journalctl -u caddy -n 50

EOF
