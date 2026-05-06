#!/usr/bin/env bash
# Manual deploy. Run as the deploy user on the server.
# Mirrors what .github/workflows/deploy.yml does.
set -euo pipefail

cd /srv/forsure-be

echo "▸ Pulling latest"
git fetch --quiet origin main
git reset --hard origin/main

echo "▸ Installing deps (postinstall runs prisma generate)"
npm ci

echo "▸ Building"
npm run build

echo "▸ Running migrations"
npx prisma migrate deploy

echo "▸ Restarting service"
sudo systemctl restart forsure-be

sleep 2

echo "▸ Health check"
if ! curl -fsS http://127.0.0.1:3000/health >/dev/null; then
  echo "✗ health check failed — check journalctl -u forsure-be"
  exit 1
fi

echo
echo "✓ deployed"
