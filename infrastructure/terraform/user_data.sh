#!/bin/bash
# Cloud-init bootstrap: Docker, Node 20, PM2, Nginx, webhook prerequisites
set -euxo pipefail
export DEBIAN_FRONTEND=noninteractive

apt-get update -y
apt-get install -y ca-certificates curl git nginx ufw

# ---- Docker ----
install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
chmod a+r /etc/apt/keyrings/docker.asc
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo $VERSION_CODENAME) stable" > /etc/apt/sources.list.d/docker.list
apt-get update -y
apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
usermod -aG docker ubuntu

# ---- Node.js 20 + PM2 (fallback runtime without Docker) ----
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt-get install -y nodejs
npm install -g pm2

# ---- Firewall ----
ufw allow OpenSSH
ufw allow 'Nginx Full'
ufw allow 9000/tcp
ufw --force enable

# ---- App directory ----
mkdir -p /home/ubuntu/apps
chown -R ubuntu:ubuntu /home/ubuntu/apps

echo "Bootstrap complete" > /home/ubuntu/bootstrap-done.txt
