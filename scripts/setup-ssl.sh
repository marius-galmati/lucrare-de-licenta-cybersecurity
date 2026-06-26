#!/bin/bash
# =============================================================================
# CyberXscore — SSL Certificate Setup
# =============================================================================
# Run this script ON THE SERVER after docker-compose up (db, api, web).
# Nginx must NOT be running yet (port 80 must be free for standalone mode).
# Requires: certbot installed on the host (not in Docker).
#
# Step 1 — Install certbot if not present:
#   sudo apt update
#   sudo apt install certbot
#
# Step 2 — Stop nginx if running (needs port 80 free):
#   docker-compose stop nginx 2>/dev/null || true
#
# Step 3 — Obtain certificate:
#   sudo certbot certonly --standalone \
#     -d mvp.cyberxscore.com \
#     --email admin@example.com \
#     --agree-tos --non-interactive
#
# Step 4 — Certs will be at:
#   /etc/letsencrypt/live/mvp.cyberxscore.com/fullchain.pem
#   /etc/letsencrypt/live/mvp.cyberxscore.com/privkey.pem
#
# Step 5 — Start nginx:
#   docker-compose up -d nginx
#
# Step 6 — Auto-renewal (add to root crontab: sudo crontab -e):
#   0 3 * * * certbot renew --quiet --pre-hook "docker-compose -f /opt/cyberxscore/docker-compose.yml stop nginx" --post-hook "docker-compose -f /opt/cyberxscore/docker-compose.yml up -d nginx"
#
# =============================================================================

echo "=== CyberXscore SSL Setup ==="
echo ""
echo "Follow the steps in the comments at the top of this script."
echo "Run from the server as root or with sudo."
echo ""
echo "Quick start:"
echo "  1. sudo apt install certbot"
echo "  2. docker-compose stop nginx"
echo "  3. sudo certbot certonly --standalone -d mvp.cyberxscore.com --email admin@example.com --agree-tos --non-interactive"
echo "  4. docker-compose up -d nginx"
echo "  5. Add crontab for auto-renewal (see script comments)"
