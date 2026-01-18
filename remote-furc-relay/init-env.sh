#!/bin/bash

# ==============================================================================
# RemoteFurc Relay Provisioning Script
# Run this as root on a fresh Ubuntu/Debian install.
# ==============================================================================

set -e

# Configuration with Env Var Overrides
APP_USER="${APP_USER:-relay}"
APP_DIR="${APP_DIR:-/opt/relay}"
DEPLOY_USER="${DEPLOY_USER:-deployer}"
NODE_MAJOR="${NODE_MAJOR:-20}"

# SSL Paths (Overridable)
# If your certs aren't in the standard /etc/ssl locations, override these.
CERT_DIR="${CERT_DIR:-/etc/ssl/certs}"
KEY_DIR="${KEY_DIR:-/etc/ssl/private}"
CERT_NAME="${CERT_NAME:-remote-furc-relay-cf.pem}"
KEY_NAME="${KEY_NAME:-remote-furc-relay-cf.key}"

CERT_PATH="$CERT_DIR/$CERT_NAME"
KEY_PATH="$KEY_DIR/$KEY_NAME"

echo "🚀 Starting the RemoteFurc Relay provisioning era..."

# Prerequisite Check
echo "🔍 Checking for Cloudflare Origin Certificates..."
if [[ ! -f "$CERT_PATH" ]]; then
    echo "❌ Big yikes: Certificate not found at $CERT_PATH"
    echo "Please upload your Cloudflare Origin Certificate before running this script."
    exit 1
fi

if [[ ! -f "$KEY_PATH" ]]; then
    echo "❌ Big yikes: Private key not found at $KEY_PATH"
    echo "Please upload your Cloudflare Private Key before running this script."
    exit 1
fi
echo "✅ Certs found ($CERT_NAME / $KEY_NAME). Proceeding with the slay."

# System Updates
echo "📦 Updating system packages..."
apt-get update && apt-get upgrade -y
apt-get install -y ca-certificates curl gnupg ufw libcap2-bin

# NodeSource Installation
echo "🟢 Installing Node.js ${NODE_MAJOR}.x from NodeSource..."
mkdir -p /etc/apt/keyrings
curl -fsSL https://deb.nodesource.com/gpgkey/nodesource-repo.gpg.key | gpg --dearmor -o /etc/apt/keyrings/nodesource.gpg
echo "deb [signed-by=/etc/apt/keyrings/nodesource.gpg] https://deb.nodesource.com/node_$NODE_MAJOR.x nodistro main" | tee /etc/apt/sources.list.d/nodesource.list
apt-get update
apt-get install -y nodejs

# Global Tools
echo "🛠 Installing PM2..."
npm install -g pm2

# User Isolation
echo "👤 Creating the '$APP_USER' system user..."
if ! id "$APP_USER" &>/dev/null; then
    # We create a system user with no shell for maximum security rizz
    adduser --system --group --no-create-home "$APP_USER"
fi

# Deploy User Setup (The user for SSH/GHA)
echo "🔑 Creating deploy user '$DEPLOY_USER'..."
if ! id "$DEPLOY_USER" &>/dev/null; then
    adduser --disabled-password --gecos "" "$DEPLOY_USER"
    # Create SSH directory for GHA keys
    mkdir -p "/home/$DEPLOY_USER/.ssh"
    touch "/home/$DEPLOY_USER/.ssh/authorized_keys"
    chown -R "$DEPLOY_USER":"$DEPLOY_USER" "/home/$DEPLOY_USER/.ssh"
    chmod 700 "/home/$DEPLOY_USER/.ssh"
    chmod 600 "/home/$DEPLOY_USER/.ssh/authorized_keys"
fi

# Sudoers Rizz (The Hand-off)
# Allows deployer to run PM2 as the app user without password
echo "📜 Configuring sudoers for passwordless PM2 management..."
SUDO_FILE="/etc/sudoers.d/90-blindrelay-deploy"
cat <<EOF > "$SUDO_FILE"
$DEPLOY_USER ALL=(root) NOPASSWD: /usr/bin/chown -R $APP_USER\:$APP_USER $APP_DIR
$DEPLOY_USER ALL=($APP_USER) NOPASSWD: SETENV: /usr/bin/pm2 *
EOF
chmod 440 "$SUDO_FILE"

# SSL Permissions (The Security Main Character)
echo "🔐 Setting snatched permissions for SSL files..."
# Ensure the directories exist and have sane defaults
mkdir -p "$CERT_DIR"
mkdir -p "$KEY_DIR"

# Cert is public-ish (Read for everyone, Write for root)
chown root:root "$CERT_PATH"
chmod 644 "$CERT_PATH"

# Key is the crown jewel - ONLY root and the app user can see it
# We set the group to the app user and allow group read (640)
chown root:"$APP_USER" "$KEY_PATH"
chmod 640 "$KEY_PATH"

# Ensure the private directory itself is locked down
chmod 710 "$KEY_DIR"
chown root:"$APP_USER" "$KEY_DIR"

echo "✅ SSL permissions locked in."

# 7. Directory Setup
echo "📂 Setting up application directory at $APP_DIR..."
mkdir -p "$APP_DIR"
chown -R "$APP_USER":"$APP_USER" "$APP_DIR"
mkdir -p "$APP_DIR/.pm2"
chown "$APP_USER":"$APP_USER" "$APP_DIR/.pm2"
chmod 700 "$APP_DIR/.pm2"

# 8. Port 443 Rizz (setcap)
echo "🔒 Granting Node.js permission to bind to privileged ports..."
NODE_PATH=$(readlink -f $(which node))
setcap 'cap_net_bind_service=+ep' "$NODE_PATH"

# 9. Firewall
echo "🛡 Configuring Firewall (UFW)..."
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable

# 10. Verification
echo "------------------------------------------------"
echo "✅ RemoteFurc Relay Provisioning Complete!"
echo "Node version: $(node -v)"
echo "App User:     $APP_USER"
echo "App Directory: $APP_DIR"
echo "Cert Path:    $CERT_PATH"
echo "Key Path:     $KEY_PATH"
echo "Capabilities: $(getcap "$NODE_PATH")"
echo "------------------------------------------------"