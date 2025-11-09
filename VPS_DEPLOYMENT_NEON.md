# AI Video Generator - VPS Deployment Guide (Neon Database)

Complete guide to deploy the AI Video Generator on a fresh Ubuntu server using Neon cloud database.

## Prerequisites

- Fresh Ubuntu 22.04 or 24.04 server
- Domain name (e.g., `aivideogenerator.com`)
- Domain DNS A record pointing to your server IP
- SSH access to your server
- GitHub repository with your code
- Neon database account (free tier available at neon.tech)

---

## Part 1: Server Preparation

### 1.1 Connect to Your Server

```bash
# SSH into your server
ssh root@YOUR_SERVER_IP
```

### 1.2 Update System

```bash
# Update package lists
apt update && apt upgrade -y

# Install essential tools
apt install -y curl wget git build-essential software-properties-common
```

### 1.3 Create Application User (Security Best Practice)

```bash
# Create a dedicated user for the app
adduser videoapp
usermod -aG sudo videoapp

# Switch to the new user
su - videoapp
```

---

## Part 2: Install Required Software

### 2.1 Install Node.js 20

```bash
# Install Node.js 20 LTS
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Verify installation
node --version  # Should show v20.x.x
npm --version   # Should show 10.x.x
```

### 2.2 Install FFmpeg (Required for Video Processing)

```bash
# Install FFmpeg
sudo apt install -y ffmpeg

# Verify installation
ffmpeg -version
```

### 2.3 Install PM2 (Process Manager)

```bash
# Install PM2 globally
sudo npm install -g pm2

# Verify installation
pm2 --version
```

### 2.4 Install Nginx (Web Server)

```bash
# Install Nginx
sudo apt install -y nginx

# Start and enable Nginx
sudo systemctl start nginx
sudo systemctl enable nginx

# Check status
sudo systemctl status nginx
```

---

## Part 3: Setup Neon Database

### 3.1 Create Neon Database

1. Go to https://neon.tech
2. Sign up for a free account
3. Create a new project: "AI Video Generator"
4. Create a new database: `videoapp`
5. Copy the connection string (looks like this):

```
postgresql://username:password@ep-xxx-xxx.region.aws.neon.tech/videoapp?sslmode=require
```

**IMPORTANT:** Save this connection string - you'll need it for environment variables!

### 3.2 Note Your Neon Connection Details

Your Neon connection string contains:
- **Host:** `ep-xxx-xxx.region.aws.neon.tech`
- **Database:** `videoapp`
- **Username:** `username`
- **Password:** `password`
- **Port:** `5432`

---

## Part 4: Clone and Setup Application

### 4.1 Clone Your GitHub Repository

```bash
# Navigate to home directory
cd ~

# Clone your repository (replace with your actual GitHub repo URL)
git clone https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git ai-video-generator

# Navigate into the directory
cd ai-video-generator
```

### 4.2 Install Dependencies

```bash
# Install all npm packages
npm install

# This will install all dependencies from package.json
```

---

## Part 5: Configure Environment Variables

### 5.1 Create Production Environment File

```bash
# Create .env file
nano .env
```

### 5.2 Add Environment Variables

Paste the following configuration (replace with your actual values):

```env
# Node Environment
NODE_ENV=production

# Neon Database Connection (WebSocket for serverless)
DATABASE_URL=postgresql://username:password@ep-xxx-xxx.region.aws.neon.tech/videoapp?sslmode=require

# Session Secret (generate a random string)
SESSION_SECRET=your-super-secret-random-string-here-change-this

# Cloudinary Configuration
CLOUDINARY_CLOUD_NAME=your-cloudinary-cloud-name
CLOUDINARY_API_KEY=your-cloudinary-api-key
CLOUDINARY_API_SECRET=your-cloudinary-api-secret
CLOUDINARY_UPLOAD_PRESET=your-unsigned-upload-preset

# OpenAI Configuration (for Script Generator)
OPENAI_API_KEY=sk-proj-your-openai-api-key-here

# Fal.ai Configuration (for Video Merging)
FAL_KEY=your-fal-ai-api-key

# Server Configuration
PORT=3000
HOST=0.0.0.0

# Domain Configuration (important for production)
DOMAIN=yourdomain.com
REPLIT_DOMAINS=yourdomain.com

# VPS Environment Flag
IS_VPS=true
```

**Press `CTRL + X`, then `Y`, then `ENTER` to save.**

### 5.3 Generate Strong Session Secret

```bash
# Generate a random session secret
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Copy the output and replace SESSION_SECRET in .env
```

---

## Part 6: Database Setup

### 6.1 Push Database Schema to Neon

```bash
# This will create all required tables in your Neon database
npm run db:push
```

**Expected output:**
```
✓ Applying migration...
✓ Your database is now in sync with your schema
```

### 6.2 Verify Database Connection

```bash
# Test database connection
node -e "
import { drizzle } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless';
const sql = neon(process.env.DATABASE_URL);
const db = drizzle(sql);
console.log('✓ Database connection successful!');
"
```

---

## Part 7: Build Application

### 7.1 Build Frontend

```bash
# Build the React frontend
npm run build

# This creates optimized production files in dist/
```

**Expected output:**
```
vite v5.x.x building for production...
✓ xxx modules transformed.
dist/index.html                   x.xx kB
dist/assets/index-xxxxx.js       xxx.xx kB
✓ built in x.xxs
```

---

## Part 8: Configure PM2 (Process Manager)

### 8.1 Create PM2 Ecosystem File

```bash
# Create PM2 configuration
nano ecosystem.config.cjs
```

### 8.2 Add PM2 Configuration

```javascript
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
```

**Press `CTRL + X`, then `Y`, then `ENTER` to save.**

### 8.3 Create Logs Directory

```bash
# Create directory for PM2 logs
mkdir -p logs
```

### 8.4 Start Application with PM2

```bash
# Start the application
pm2 start ecosystem.config.cjs

# Check status
pm2 status

# View logs
pm2 logs ai-video-generator --lines 50

# Save PM2 process list
pm2 save

# Setup PM2 to start on system boot
pm2 startup
# Copy and run the command that PM2 outputs
```

---

## Part 9: Configure Nginx Reverse Proxy

### 9.1 Create Nginx Configuration

```bash
# Create Nginx site configuration
sudo nano /etc/nginx/sites-available/ai-video-generator
```

### 9.2 Add Nginx Configuration

```nginx
# Redirect HTTP to HTTPS
server {
    listen 80;
    listen [::]:80;
    server_name yourdomain.com www.yourdomain.com;

    # Temporary configuration for Let's Encrypt verification
    location /.well-known/acme-challenge/ {
        root /var/www/html;
    }

    # Redirect all other traffic to HTTPS (we'll add this after SSL setup)
    # return 301 https://$server_name$request_uri;
}

# Main application server (will be HTTPS after SSL setup)
server {
    listen 80;
    listen [::]:80;
    server_name yourdomain.com www.yourdomain.com;

    # Client body size (for video uploads)
    client_max_body_size 500M;

    # Timeouts for long-running requests
    proxy_connect_timeout 600s;
    proxy_send_timeout 600s;
    proxy_read_timeout 600s;
    send_timeout 600s;

    # Proxy headers
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;

    # Main application
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_cache_bypass $http_upgrade;
    }

    # Server-Sent Events (SSE) for bulk video generation
    location /api/bulk-generate {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Connection '';
        proxy_buffering off;
        proxy_cache off;
        chunked_transfer_encoding on;
    }
}
```

**Replace `yourdomain.com` with your actual domain!**

**Press `CTRL + X`, then `Y`, then `ENTER` to save.**

### 9.3 Enable Nginx Site

```bash
# Create symbolic link to enable site
sudo ln -s /etc/nginx/sites-available/ai-video-generator /etc/nginx/sites-enabled/

# Remove default site (optional)
sudo rm /etc/nginx/sites-enabled/default

# Test Nginx configuration
sudo nginx -t

# Reload Nginx
sudo systemctl reload nginx
```

---

## Part 10: Configure SSL Certificate (HTTPS)

### 10.1 Install Certbot

```bash
# Install Certbot for Let's Encrypt SSL
sudo apt install -y certbot python3-certbot-nginx
```

### 10.2 Obtain SSL Certificate

```bash
# Get SSL certificate (replace with your domain and email)
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com --email your@email.com --agree-tos --no-eff-email
```

**Follow the prompts:**
- Agree to terms of service: `Y`
- Redirect HTTP to HTTPS: `2` (recommended)

### 10.3 Auto-Renewal Setup

```bash
# Test auto-renewal
sudo certbot renew --dry-run

# Certbot automatically sets up a cron job for renewal
```

### 10.4 Final Nginx Configuration (Post-SSL)

Certbot automatically updates your Nginx config with SSL. Verify:

```bash
# Check the updated configuration
sudo nano /etc/nginx/sites-available/ai-video-generator
```

You should see SSL configuration added by Certbot.

---

## Part 11: Configure Firewall

### 11.1 Setup UFW Firewall

```bash
# Enable firewall
sudo ufw enable

# Allow SSH (IMPORTANT - don't lock yourself out!)
sudo ufw allow 22/tcp

# Allow HTTP and HTTPS
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Check firewall status
sudo ufw status
```

---

## Part 12: Admin User Setup

### 12.1 Create Admin Account

Since you're using Neon database, you need to create an admin user. Here's how:

**Option A: Via Node.js Script**

```bash
# Create admin user script
nano create-admin.js
```

Paste this code:

```javascript
import { drizzle } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless';
import bcrypt from 'bcrypt';
import { users } from './shared/schema.ts';

const sql = neon(process.env.DATABASE_URL);
const db = drizzle(sql);

async function createAdmin() {
  const hashedPassword = await bcrypt.hash('Admin@123', 10);
  
  await db.insert(users).values({
    username: 'admin',
    email: 'admin@yourdomain.com',
    password: hashedPassword,
    role: 'admin',
    plan: 'empire',
    planStartDate: new Date().toISOString(),
    planExpiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(), // 1 year
    dailyVideoCount: 0
  });
  
  console.log('✓ Admin user created!');
  console.log('Username: admin');
  console.log('Password: Admin@123');
  console.log('IMPORTANT: Change this password after first login!');
}

createAdmin().catch(console.error);
```

Run it:

```bash
node --loader tsx create-admin.js

# Delete the script after use
rm create-admin.js
```

**Option B: Register via Web Interface**

1. Visit `https://yourdomain.com`
2. Click "Register"
3. Create account: `admin` / `Admin@123`
4. Then manually update role in Neon dashboard SQL editor:

```sql
UPDATE users SET role = 'admin', plan = 'empire' WHERE username = 'admin';
```

---

## Part 13: Post-Deployment Verification

### 13.1 Check Application Status

```bash
# Check PM2 status
pm2 status

# View application logs
pm2 logs ai-video-generator --lines 100

# Check Nginx status
sudo systemctl status nginx

# Check if app is listening on port 3000
sudo netstat -tulpn | grep 3000
```

### 13.2 Test Your Website

1. **Visit your domain:** `https://yourdomain.com`
2. **Check SSL:** Look for the padlock icon in browser
3. **Login as admin:** Use credentials created above
4. **Add VEO API Tokens:**
   - Go to Admin Panel
   - Add your Google AI VEO API tokens
   - Mark them as "Active"
5. **Test video generation:**
   - Try VEO Generator
   - Try Text to Image
   - Try Bulk Generator

---

## Part 14: Useful PM2 Commands

```bash
# View logs
pm2 logs ai-video-generator

# Restart application
pm2 restart ai-video-generator

# Stop application
pm2 stop ai-video-generator

# Delete from PM2
pm2 delete ai-video-generator

# Monitor CPU and memory
pm2 monit

# View detailed info
pm2 info ai-video-generator
```

---

## Part 15: Update/Redeploy Application

When you need to update your code:

```bash
# Navigate to app directory
cd ~/ai-video-generator

# Pull latest changes from GitHub
git pull origin main

# Install any new dependencies
npm install

# Rebuild frontend
npm run build

# Push any database schema changes
npm run db:push

# Restart application
pm2 restart ai-video-generator

# Check logs
pm2 logs ai-video-generator --lines 50
```

---

## Part 16: Monitoring and Maintenance

### 16.1 Setup Log Rotation

```bash
# Install PM2 log rotation module
pm2 install pm2-logrotate

# Configure log rotation (keep 7 days of logs)
pm2 set pm2-logrotate:max_size 100M
pm2 set pm2-logrotate:retain 7
pm2 set pm2-logrotate:compress true
```

### 16.2 Monitor System Resources

```bash
# Check disk space
df -h

# Check memory usage
free -h

# Check CPU usage
top

# Check PM2 memory usage
pm2 monit
```

### 16.3 Database Backups (Neon automatically backs up)

Neon provides:
- **Automatic backups:** Every 24 hours
- **Point-in-time restore:** Up to 7 days (free tier)
- **No manual backup needed!** ✓

Access backups in Neon dashboard → Your Project → Backups

---

## Part 17: Troubleshooting

### Application Won't Start

```bash
# Check PM2 logs
pm2 logs ai-video-generator

# Check if port 3000 is already in use
sudo netstat -tulpn | grep 3000

# Kill process on port 3000 if needed
sudo kill -9 $(sudo lsof -t -i:3000)

# Restart PM2
pm2 restart ai-video-generator
```

### Database Connection Issues

```bash
# Test Neon database connection
node -e "
import { neon } from '@neondatabase/serverless';
const sql = neon(process.env.DATABASE_URL);
await sql\`SELECT 1\`;
console.log('✓ Database connected!');
"

# Check .env file has correct DATABASE_URL
cat .env | grep DATABASE_URL
```

### Nginx Issues

```bash
# Test Nginx configuration
sudo nginx -t

# Check Nginx error logs
sudo tail -f /var/log/nginx/error.log

# Restart Nginx
sudo systemctl restart nginx
```

### SSL Certificate Issues

```bash
# Renew SSL certificate manually
sudo certbot renew

# Check certificate expiry
sudo certbot certificates
```

### Video Generation Fails

1. **Check API tokens in Admin Panel:**
   - Valid Google AI VEO tokens
   - Tokens marked as "Active"
   - No tokens in cooldown

2. **Check logs:**
   ```bash
   pm2 logs ai-video-generator | grep -i error
   ```

3. **Check Cloudinary configuration:**
   - Verify CLOUDINARY_* env variables
   - Check upload preset is unsigned

---

## Part 18: Security Best Practices

### 18.1 Change Default Passwords

```bash
# Change admin password after first login
# Do this in the web interface: Profile → Change Password
```

### 18.2 Keep System Updated

```bash
# Update system packages monthly
sudo apt update && sudo apt upgrade -y

# Update npm packages
cd ~/ai-video-generator
npm update

# Check for security vulnerabilities
npm audit
npm audit fix
```

### 18.3 Secure SSH Access

```bash
# Disable root login (edit SSH config)
sudo nano /etc/ssh/sshd_config

# Change these lines:
# PermitRootLogin no
# PasswordAuthentication no  # Only if you're using SSH keys

# Restart SSH
sudo systemctl restart sshd
```

---

## Part 19: Performance Optimization

### 19.1 Enable Nginx Gzip Compression

```bash
# Edit Nginx config
sudo nano /etc/nginx/nginx.conf
```

Add inside `http` block:

```nginx
# Gzip compression
gzip on;
gzip_vary on;
gzip_min_length 1024;
gzip_types text/plain text/css text/xml text/javascript application/x-javascript application/xml+rss application/json application/javascript;
```

```bash
# Reload Nginx
sudo systemctl reload nginx
```

### 19.2 Configure Node.js Memory Limits

If you're processing many videos, increase Node.js memory:

```bash
# Edit PM2 ecosystem config
nano ecosystem.config.cjs
```

Change `max_memory_restart: '4G'` (if your server has enough RAM)

```bash
# Restart PM2
pm2 restart ai-video-generator
```

---

## Part 20: Environment Variables Reference

Here's a complete list of required environment variables:

| Variable | Description | Example |
|----------|-------------|---------|
| `NODE_ENV` | Environment | `production` |
| `DATABASE_URL` | Neon PostgreSQL connection | `postgresql://user:pass@host/db?sslmode=require` |
| `SESSION_SECRET` | Session encryption key | `random-64-char-string` |
| `CLOUDINARY_CLOUD_NAME` | Cloudinary cloud name | `your-cloud-name` |
| `CLOUDINARY_API_KEY` | Cloudinary API key | `123456789012345` |
| `CLOUDINARY_API_SECRET` | Cloudinary API secret | `abcdef1234567890` |
| `CLOUDINARY_UPLOAD_PRESET` | Unsigned upload preset | `ml_default` |
| `OPENAI_API_KEY` | OpenAI API key | `sk-proj-...` |
| `FAL_KEY` | Fal.ai API key | `your-fal-key` |
| `PORT` | Application port | `3000` |
| `HOST` | Bind host | `0.0.0.0` |
| `DOMAIN` | Your domain | `yourdomain.com` |
| `IS_VPS` | VPS environment flag | `true` |

---

## Part 21: Cost Estimates

### Monthly Costs (Estimated)

- **VPS Server:** $5-20/month (DigitalOcean, Vultr, Linode)
- **Neon Database:** $0/month (free tier, up to 0.5GB)
- **Domain Name:** $10-15/year
- **SSL Certificate:** $0/year (Let's Encrypt)
- **Cloudinary:** $0/month (free tier, 25GB)

**Total:** ~$5-20/month for basic setup

---

## Part 22: Production Checklist

Before going live, verify:

- [ ] Neon database created and connected
- [ ] All environment variables configured in `.env`
- [ ] Database schema pushed (`npm run db:push`)
- [ ] Frontend built (`npm run build`)
- [ ] PM2 running application
- [ ] Nginx configured and running
- [ ] SSL certificate installed (HTTPS working)
- [ ] Firewall configured (UFW)
- [ ] Admin account created
- [ ] VEO API tokens added and active
- [ ] Test video generation works
- [ ] Test all tools (VEO, Bulk, Text-to-Image, Image-to-Video, Script)
- [ ] Monitor logs for errors
- [ ] Setup log rotation
- [ ] Change default admin password
- [ ] Setup daily video limits for users

---

## Part 23: Support and Resources

### Neon Database
- Dashboard: https://console.neon.tech
- Documentation: https://neon.tech/docs
- Support: support@neon.tech

### Application Health Checks
- Health endpoint: `https://yourdomain.com/api/health`
- Stats endpoint: `https://yourdomain.com/api/stats` (admin only)

### Logs Location
- PM2 logs: `~/ai-video-generator/logs/`
- Nginx access: `/var/log/nginx/access.log`
- Nginx error: `/var/log/nginx/error.log`

---

## Quick Reference Commands

```bash
# Check application status
pm2 status

# View logs
pm2 logs ai-video-generator

# Restart application
pm2 restart ai-video-generator

# Check Nginx status
sudo systemctl status nginx

# Reload Nginx config
sudo systemctl reload nginx

# View database connection
echo $DATABASE_URL

# Update application
cd ~/ai-video-generator && git pull && npm install && npm run build && pm2 restart ai-video-generator
```

---

## Success Indicators

Your deployment is successful when:

✅ Website loads at `https://yourdomain.com`  
✅ SSL certificate shows as valid (padlock icon)  
✅ Can login as admin  
✅ Can add VEO API tokens in admin panel  
✅ Can generate videos successfully  
✅ All tools work (VEO, Bulk, Text-to-Image, Image-to-Video, Script)  
✅ PM2 shows application as "online"  
✅ Nginx is running without errors  
✅ Database connection is stable  

---

**You're done! Your AI Video Generator is now live on your VPS with Neon database!** 🚀
