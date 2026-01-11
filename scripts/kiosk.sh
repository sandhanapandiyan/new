#!/bin/bash

# Disable power saving (screen blanking)
xset s off
xset -dpms
xset s noblank

# Hide mouse cursor if not moved
unclutter -idle 0.5 -root &

# Launch Chromium in Kiosk Mode
# --kiosk: Fullscreen/Kiosk mode
# --noerrdialogs: Suppress error dialogs
# --disable-infobars: Remove "Chrome is being controlled by automated software"
# --check-for-update-interval=31536000: Disable updates
chromium-browser --kiosk --noerrdialogs --disable-infobars --check-for-update-interval=31536000 http://localhost:3001
