#!/bin/bash
# Run ON the EC2 instance after Terraform provisions it (as ubuntu user).
# Clones both repos, configures env files, Nginx, webhook service, and boots everything.
set -euo pipefail

FRONT_REPO="${1:?Usage: ./setup-server.sh <frontend-git-url> <backend-git-url> <elastic-ip>}"
BACK_REPO="${2:?backend git url required}"
EIP="${3:?elastic ip required}"

cd ~/apps
[ -d pulse-frontend ] || git clone "$FRONT_REPO" pulse-frontend
[ -d pulse-backend ]  || git clone "$BACK_REPO"  pulse-backend

echo ">>> 1. Backend env — copy .env.example to .env and fill in Firebase + Postgres secrets"
cp -n pulse-backend/.env pulse-backend/.env || true
echo "    edit: nano ~/apps/pulse-backend/.env   (then re-run this script)"

echo ">>> 2. Starting backend (PostgreSQL + API in Docker)"
cd ~/apps/pulse-backend && docker compose -f docker-compose.prod.yml up -d --build

echo ">>> 3. Building frontend image"
cd ~/apps/pulse-frontend
docker build -t pulse-web --build-arg NEXT_PUBLIC_API_URL="http://$EIP/api" .
docker rm -f pulse-web 2>/dev/null || true
docker run -d --name pulse-web --restart always -p 127.0.0.1:3000:3000 pulse-web

echo ">>> 4. Nginx reverse proxy"
sudo cp ~/apps/infrastructure/nginx/pulse.conf /etc/nginx/sites-available/pulse.conf 2>/dev/null || true
sudo ln -sf /etc/nginx/sites-available/pulse.conf /etc/nginx/sites-enabled/pulse.conf
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t && sudo systemctl reload nginx

echo ">>> 5. Webhook auto-deploy service"
sudo cp ~/apps/infrastructure/webhook/pulse-webhook.service /etc/systemd/system/ 2>/dev/null || true
echo "    edit the secret: sudo nano /etc/systemd/system/pulse-webhook.service"
sudo systemctl daemon-reload
sudo systemctl enable --now pulse-webhook || true

echo ""
echo "✅ Done. Frontend: http://$EIP   API: http://$EIP/api"
echo "   Add a GitHub webhook on BOTH repos -> http://$EIP/hooks/deploy (content type: application/json, secret = WEBHOOK_SECRET)"
