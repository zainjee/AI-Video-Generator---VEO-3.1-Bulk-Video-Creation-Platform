#!/bin/bash

################################################################################
# Domain & SSL Setup Script
# 
# Run this script AFTER initial installation to configure your domain and SSL
# 
# Usage:
#   chmod +x update-domain.sh
#   sudo ./update-domain.sh yourdomain.com
################################################################################

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

print_header() {
    echo -e "\n${BLUE}================================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}================================================${NC}\n"
}

print_success() { echo -e "${GREEN}✓ $1${NC}"; }
print_error() { echo -e "${RED}✗ $1${NC}"; }
print_info() { echo -e "${BLUE}ℹ $1${NC}"; }

# Check if domain provided
if [ -z "$1" ]; then
    print_error "Domain name required!"
    echo "Usage: sudo ./update-domain.sh yourdomain.com"
    exit 1
fi

DOMAIN=$1
APP_DIR="/home/videoapp/ai-video-generator"
APP_USER="videoapp"

# Check if running as root
if [[ $EUID -ne 0 ]]; then
    print_error "This script must be run as root or with sudo"
    exit 1
fi

print_header "Configuring Domain: $DOMAIN"

# Step 1: Update .env file
print_info "Updating environment variables..."
sed -i "s/DOMAIN=.*/DOMAIN=$DOMAIN/" $APP_DIR/.env
sed -i "s/REPLIT_DOMAINS=.*/REPLIT_DOMAINS=$DOMAIN/" $APP_DIR/.env
print_success "Environment variables updated"

# Step 2: Update Nginx configuration
print_info "Updating Nginx configuration..."
sed -i "s/server_name .*/server_name $DOMAIN www.$DOMAIN;/" /etc/nginx/sites-available/ai-video-generator
nginx -t && systemctl reload nginx
print_success "Nginx configuration updated"

# Step 3: Install Certbot
print_info "Installing Certbot for SSL certificate..."
apt install -y certbot python3-certbot-nginx
print_success "Certbot installed"

# Step 4: Get SSL certificate
print_header "Obtaining SSL Certificate"
read -p "Enter your email address: " EMAIL
certbot --nginx -d $DOMAIN -d www.$DOMAIN --email $EMAIL --agree-tos --redirect --non-interactive
print_success "SSL certificate obtained!"

# Step 5: Restart application
print_info "Restarting application..."
su - $APP_USER -c "cd $APP_DIR && pm2 restart ai-video-generator"
print_success "Application restarted"

print_header "Domain & SSL Setup Complete! 🎉"
echo ""
print_success "Your site is now available at: https://$DOMAIN"
echo ""
print_info "SSL certificate will auto-renew. Test renewal with:"
echo "  sudo certbot renew --dry-run"
echo ""
