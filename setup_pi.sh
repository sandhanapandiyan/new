#!/bin/bash

# ==============================================================================
# NVR ULTIMATE INSTALLER & AUTOSTART SETUP
# ==============================================================================
# This script will:
# 1. Install all system dependencies (Node.js, FFmpeg, etc.)
# 2. Install project dependencies and Build everything.
# 3. Configure the Database (Prisma).
# 4. Setup PM2 to run the Backend + go2rtc on Boot.
# 5. Setup Kiosk Mode to run the Frontend on Boot.
# ==============================================================================

set -e # Exit immediately if a command exits with a non-zero status.

CURRENT_USER=$(whoami)
PROJECT_DIR=$(pwd)

echo "################################################################"
echo "  STARTING NVR INSTALLATION FOR USER: $CURRENT_USER"
echo "  LOCATION: $PROJECT_DIR"
echo "################################################################"

# ------------------------------------------------------------------------------
# 1. SYSTEM PREPARATION
# ------------------------------------------------------------------------------
echo ">>> [1/5] Installing System Dependencies..."
sudo apt-get update --allow-releaseinfo-change
sudo apt-get install -y curl wget git unzip ffmpeg chromium libavahi-compat-libdnssd-dev x11-xserver-utils unclutter

# Install Node.js 20 if missing
if ! command -v node &> /dev/null; then
    echo "    Node.js not found. Installing Node 20 LTS..."
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
    sudo apt-get install -y nodejs
else
    echo "    Node.js is already installed."
fi

# Install Global NPM Tools
echo "    Installing global NPM tools..."
sudo npm install -g pm2 typescript ts-node

# ------------------------------------------------------------------------------
# 2. BACKEND SETUP & DATABASE
# ------------------------------------------------------------------------------
echo ">>> [2/5] Setting up Backend..."
cd server

echo "    Installing Server Dependencies..."
npm install

echo "    Configuring Environment..."
# Dynamically create .env file with correct path for THIS system
echo "DATABASE_URL=\"file:$PROJECT_DIR/server/config/nvr.db\"" > .env
echo "PORT=3001" >> .env
echo "NODE_ENV=production" >> .env

echo "    Configuring Database..."
# Ensure config directory exists for SQLite DB (Fixing Permission Denied)
if [ ! -d "config" ]; then
    sudo mkdir -p config
    sudo chown -R $CURRENT_USER:$CURRENT_USER config
    sudo chmod -R 777 config
fi

# Force fresh DB state (safer for automation than migrate dev)
echo "    Syncing Database Schema..."
npx prisma db push --accept-data-loss

echo "    Generating Prisma Client..."
npx prisma generate

# Fix Database Permissions (Crucial for "Unable to open database file")
if [ -d "config" ]; then
    chmod -R 777 config
    echo "    Fixed DB permissions."
fi

echo "    Building Backend..."
npm run build

echo "    Downloading go2rtc Streaming Server..."
if [ ! -f "go2rtc" ]; then
    ARCH=$(dpkg --print-architecture)
    if [[ "$ARCH" == "arm64" ]]; then
        curl -L -o go2rtc https://github.com/AlexxIT/go2rtc/releases/latest/download/go2rtc_linux_arm64
    elif [[ "$ARCH" == "amd64" ]]; then
        curl -L -o go2rtc https://github.com/AlexxIT/go2rtc/releases/latest/download/go2rtc_linux_amd64
    else
        echo "    WARNING: Unknown architecture ($ARCH). Defaulting to arm64 (Pi default)."
        curl -L -o go2rtc https://github.com/AlexxIT/go2rtc/releases/latest/download/go2rtc_linux_arm64
    fi
    chmod +x go2rtc
fi

cd ..

# ------------------------------------------------------------------------------
# 3. FRONTEND SETUP
# ------------------------------------------------------------------------------
echo ">>> [3/5] Setting up Frontend..."
cd client

echo "    Installing Client Dependencies..."
npm install

echo "    Building Client..."
npm run build

cd ..

# ------------------------------------------------------------------------------
# 4. STARTUP CONFIGURATION (BACKEND)
# ------------------------------------------------------------------------------
echo ">>> [4/5] Configuring Backend Autostart (PM2)..."
cd server

# Stop existing instance if running
pm2 delete nvr-backend 2>/dev/null || true

# Start the built backend
pm2 start dist/index.js --name "nvr-backend"

# Freeze the process list for restart
pm2 save

# Generate and Run Startup Script
echo "    Generating Startup Script (Sudo required)..."
sudo env PATH=$PATH:/usr/bin /lib/node_modules/pm2/bin/pm2 startup systemd -u $CURRENT_USER --hp /home/$CURRENT_USER
pm2 save

cd ..

# ------------------------------------------------------------------------------
# 5. KIOSK MODE SETUP (FRONTEND)
# ------------------------------------------------------------------------------
echo ">>> [5/5] Configuring UI Autostart (Kiosk Mode)..."

AUTOSTART_DIR="/home/$CURRENT_USER/.config/autostart"
mkdir -p $AUTOSTART_DIR

# 1. Chromium Kiosk File
cat <<EOF > $AUTOSTART_DIR/nvr-kiosk.desktop
[Desktop Entry]
Type=Application
Name=NVR Kiosk
Exec=chromium --noerrdialogs --disable-infobars --check-for-update-interval=31536000 --kiosk http://localhost:3001
X-GNOME-Autostart-enabled=true
EOF

# 2. Disable Screen Sleep
cat <<EOF > $AUTOSTART_DIR/nvr-display.desktop
[Desktop Entry]
Type=Application
Name=NVR Display Config
Exec=xset s off -dpms
X-GNOME-Autostart-enabled=true
EOF

# 3. Hide Mouse Cursor
cat <<EOF > $AUTOSTART_DIR/nvr-cursor.desktop
[Desktop Entry]
Type=Application
Name=Hide Cursor
Exec=unclutter -idle 0.1 -root
X-GNOME-Autostart-enabled=true
EOF

# Fix Permissions
sudo chown -R $CURRENT_USER:$CURRENT_USER $AUTOSTART_DIR

echo "################################################################"
echo "  INSTALLATION COMPLETE!"
echo "################################################################"
echo "  1. The NVR Server is running and will auto-start on boot."
echo "  2. The Interface will load in fullscreen automatically on boot."
echo "  3. Database is configured and ready."
echo ""
echo ">>> SYSTEM WILL REBOOT IN 5 SECONDS..."
sleep 1
echo "4..."
sleep 1
echo "3..."
sleep 1
echo "2..."
sleep 1
echo "1..."
sleep 1
echo ">>> REBOOTING NOW..."
sudo reboot
