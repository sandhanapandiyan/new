#!/bin/bash

# Exit on error
set -e

echo "Starting NVR Setup for Raspberry Pi..."

# Navigate to project root (assuming script runs from scripts/ dir or root provided)
PROJECT_ROOT=$(pwd)/..
if [ ! -d "$PROJECT_ROOT/server" ]; then
    echo "Error: Could not find project root. Run this script from the 'scripts' directory."
    PROJECT_ROOT=$(pwd) # Try current if above fails, but logical assumption involved
fi

echo "Building Client..."
cd "$PROJECT_ROOT/client"
npm install
npm run build

echo "Building Server..."
cd "$PROJECT_ROOT/server"
npm install
npm run build

echo "Installing Systemd Service..."
sudo cp "$PROJECT_ROOT/scripts/nvr.service" /etc/systemd/system/nvr.service
sudo systemctl daemon-reload
sudo systemctl enable nvr.service
sudo systemctl start nvr.service

echo "Setup Kiosk Autostart..."
mkdir -p /home/pi/.config/lxsession/LXDE-pi
if [ ! -f /home/pi/.config/lxsession/LXDE-pi/autostart ]; then
    cp /etc/xdg/lxsession/LXDE-pi/autostart /home/pi/.config/lxsession/LXDE-pi/autostart
fi

# Append kiosk script if not exists
grep -qxF "@bash $PROJECT_ROOT/scripts/kiosk.sh" /home/pi/.config/lxsession/LXDE-pi/autostart || echo "@bash $PROJECT_ROOT/scripts/kiosk.sh" >> /home/pi/.config/lxsession/LXDE-pi/autostart

echo "Setup Complete! The NVR should start automatically on reboot."
