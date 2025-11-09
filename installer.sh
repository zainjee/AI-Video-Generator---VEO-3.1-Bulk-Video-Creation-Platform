#!/bin/bash

################################################################################
# AI Video Generator - Automated VPS Installer
# 
# This script automates the deployment of AI Video Generator on Ubuntu VPS
# 
# Prerequisites:
# - Fresh Ubuntu 22.04 or 24.04 server
# - Root or sudo access
# - Neon database created with connection string ready
# - API keys ready (Cloudinary, OpenAI, Fal.ai)
# 
# Usage:
#   chmod +x installer.sh
#   sudo ./installer.sh
################################################################################

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
GITHUB_REPO="https://github.com/zainjee/AI-Video-Generator---VEO-3.1-Bulk-Video-Creation-Platform"  # CHANGE THIS TO YOUR GITHUB REPO URL
APP_DIR="/home/videoapp/ai-video-generator"
APP_USER="videoapp"
NODE_VERSION="20"
SERVER_IP="151.244.215.61"

################################################################################
# Helper Functions
################################################################################

print_header() {
    echo -e "\n${BLUE}================================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}================================================${NC}\n"
}

print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ $1${NC}"
}

check_root() {
    if [[ $EUID -ne 0 ]]; then
        print_error "This script must be run as root or with sudo"
        exit 1
    fi
}

################################################################################
# Main Installation Steps
################################################################################

print_header "AI Video Generator - VPS Installer"
print_info "Starting installation on Ubuntu server..."
print_info "Server IP: $SERVER_IP"
echo ""

# Check if running as root
check_root

# Step 1: Update system
print_header "Step 1/13: Updating System Packages"
apt update && apt upgrade -y
print_success "System updated successfully"

# Step 2: Install essential tools
print_header "Step 2/13: Installing Essential Tools"
apt install -y curl wget git build-essential software-properties-common
print_success "Essential tools installed"

# Step 3: Install Node.js 20
print_header "Step 3/13: Installing Node.js $NODE_VERSION"
if ! command -v node &> /dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_${NODE_VERSION}.x | bash -
    apt install -y nodejs
    print_success "Node.js $(node --version) installed"
else
    print_warning "Node.js already installed: $(node --version)"
fi

# Step 4: Install FFmpeg
print_header "Step 4/13: Installing FFmpeg"
if ! command -v ffmpeg &> /dev/null; then
    apt install -y ffmpeg
    print_success "FFmpeg installed"
else
    print_warning "FFmpeg already installed"
fi

# Step 5: Install PM2
print_header "Step 5/13: Installing PM2 Process Manager"
if ! command -v pm2 &> /dev/null; then
    npm install -g pm2
    print_success "PM2 installed"
else
    print_warning "PM2 already installed"
fi

# Step 6: Install Nginx
print_header "Step 6/13: Installing Nginx Web Server"
if ! command -v nginx &> /dev/null; then
    apt install -y nginx
    systemctl start nginx
    systemctl enable nginx
    print_success "Nginx installed and started"
else
    print_warning "Nginx already installed"
fi

# Step 7: Create application user
print_header "Step 7/13: Creating Application User"
if ! id "$APP_USER" &>/dev/null; then
    adduser --disabled-password --gecos "" $APP_USER
    usermod -aG sudo $APP_USER
    print_success "User '$APP_USER' created"
else
    print_warning "User '$APP_USER' already exists"
fi

# Step 8: Clone repository
print_header "Step 8/13: Cloning GitHub Repository"
if [ -d "$APP_DIR" ]; then
    print_warning "Directory $APP_DIR already exists. Removing..."
    rm -rf $APP_DIR
fi

su - $APP_USER -c "git clone $GITHUB_REPO $APP_DIR"
print_success "Repository cloned to $APP_DIR"

# Step 9: Install npm dependencies
print_header "Step 9/13: Installing NPM Dependencies"
cd $APP_DIR
su - $APP_USER -c "cd $APP_DIR && npm install"
print_success "Dependencies installed"

# Step 10: Create .env file
print_header "Step 10/13: Configuring Environment Variables"
if [ -f "$APP_DIR/.env" ]; then
    print_warning ".env file already exists, skipping creation"
else
    print_info "Please provide the following information:"
    echo ""
    
    read -p "Neon Database URL: " DATABASE_URL
    read -p "Cloudinary Cloud Name: " CLOUDINARY_CLOUD_NAME
    read -p "Cloudinary API Key: " CLOUDINARY_API_KEY
    read -p "Cloudinary API Secret: " CLOUDINARY_API_SECRET
    read -p "Cloudinary Upload Preset [ml_default]: " CLOUDINARY_UPLOAD_PRESET
    CLOUDINARY_UPLOAD_PRESET=${CLOUDINARY_UPLOAD_PRESET:-ml_default}
    read -p "OpenAI API Key: " OPENAI_API_KEY
    read -p "Fal.ai API Key: " FAL_KEY
    
    # Generate session secret
    SESSION_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
    
    # Create .env file
    cat > $APP_DIR/.env << EOF
NODE_ENV=production
DATABASE_URL=$DATABASE_URL
SESSION_SECRET=$SESSION_SECRET
CLOUDINARY_CLOUD_NAME=$CLOUDINARY_CLOUD_NAME
CLOUDINARY_API_KEY=$CLOUDINARY_API_KEY
CLOUDINARY_API_SECRET=$CLOUDINARY_API_SECRET
CLOUDINARY_UPLOAD_PRESET=$CLOUDINARY_UPLOAD_PRESET
OPENAI_API_KEY=$OPENAI_API_KEY
FAL_KEY=$FAL_KEY
PORT=3000
HOST=0.0.0.0
DOMAIN=$SERVER_IP
REPLIT_DOMAINS=$SERVER_IP
IS_VPS=true
EOF
    
    chown $APP_USER:$APP_USER $APP_DIR/.env
    print_success ".env file created"
fi

# Step 11: Setup database and build
print_header "Step 11/13: Setting Up Database & Building Application"
su - $APP_USER -c "cd $APP_DIR && npm run db:push"
print_success "Database schema created in Neon"

su - $APP_USER -c "cd $APP_DIR && npm run build"
print_success "Application built successfully"

# Step 12: Configure PM2
print_header "Step 12/13: Configuring PM2 Process Manager"
cat > $APP_DIR/ecosystem.config.cjs << 'EOF'
module.exports = {
  apps: [{
    name: 'ai-video-generator',
    script: 'server/index.ts',
    interpreter: 'node',
    interpreter_args: '--loader tsx',
    instances: 1,
    exec_mode: 'fork',
    autorestart: true,
    watch: false,
    max_memory_restart: '2G',
    env: {
      NODE_ENV: 'production',
      PORT: 3000,
      HOST: '0.0.0.0'
    },
    error_file: './logs/pm2-error.log',
    out_file: './logs/pm2-out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,
    time: true
  }]
};
EOF

chown $APP_USER:$APP_USER $APP_DIR/ecosystem.config.cjs

# Create logs directory
su - $APP_USER -c "mkdir -p $APP_DIR/logs"

# Start application with PM2
su - $APP_USER -c "cd $APP_DIR && pm2 start ecosystem.config.cjs"
su - $APP_USER -c "pm2 save"

# Setup PM2 startup
env PATH=$PATH:/usr/bin pm2 startup systemd -u $APP_USER --hp /home/$APP_USER
print_success "PM2 configured and application started"

# Step 13: Configure Nginx
print_header "Step 13/13: Configuring Nginx Reverse Proxy"
cat > /etc/nginx/sites-available/ai-video-generator << EOF
server {
    listen 80;
    listen [::]:80;
    server_name $SERVER_IP;

    client_max_body_size 500M;

    proxy_connect_timeout 600s;
    proxy_send_timeout 600s;
    proxy_read_timeout 600s;
    send_timeout 600s;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }

    location /api/bulk-generate {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Connection '';
        proxy_buffering off;
        proxy_cache off;
        chunked_transfer_encoding on;
    }
}
EOF

# Enable site
ln -sf /etc/nginx/sites-available/ai-video-generator /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

# Test and reload Nginx
nginx -t
systemctl reload nginx
print_success "Nginx configured successfully"

# Setup firewall
print_header "Configuring Firewall (UFW)"
ufw --force enable
ufw allow 22/tcp    # SSH
ufw allow 80/tcp    # HTTP
ufw allow 443/tcp   # HTTPS
print_success "Firewall configured"

# Final success message
print_header "Installation Complete! 🎉"
echo ""
print_success "AI Video Generator is now running!"
echo ""
print_info "Application Details:"
echo "  • URL: http://$SERVER_IP"
echo "  • PM2 Process: ai-video-generator"
echo "  • App Directory: $APP_DIR"
echo "  • User: $APP_USER"
echo ""
print_info "Useful Commands:"
echo "  • View logs: sudo su - $APP_USER -c 'pm2 logs ai-video-generator'"
echo "  • Restart app: sudo su - $APP_USER -c 'pm2 restart ai-video-generator'"
echo "  • Check status: sudo su - $APP_USER -c 'pm2 status'"
echo "  • Nginx status: systemctl status nginx"
echo ""
print_warning "Next Steps:"
echo "  1. Visit http://$SERVER_IP to test the application"
echo "  2. Register an admin account at http://$SERVER_IP"
echo "  3. Update admin role in Neon database:"
echo "     UPDATE users SET role = 'admin', plan = 'empire' WHERE username = 'admin';"
echo "  4. Add VEO API tokens in Admin Panel"
echo "  5. Configure your domain (when ready):"
echo "     - Point DNS A record to $SERVER_IP"
echo "     - Update DOMAIN in $APP_DIR/.env"
echo "     - Run: sudo certbot --nginx -d yourdomain.com"
echo "     - Restart: sudo su - $APP_USER -c 'pm2 restart ai-video-generator'"
echo ""
print_success "Happy video generating! 🎬"
echo ""
