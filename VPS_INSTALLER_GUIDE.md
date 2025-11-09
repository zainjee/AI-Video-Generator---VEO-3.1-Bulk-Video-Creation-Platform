# VPS Automated Installer Guide

Complete guide to deploy AI Video Generator on your VPS using the automated installer script.

---

## 🚀 Quick Start (5 Steps)

### Step 1: Upload Code to GitHub

1. **Download all files from Replit**
2. **Create a new GitHub repository**
3. **Upload all files to GitHub**
4. **Copy your repository URL** (e.g., `https://github.com/username/ai-video-generator.git`)

### Step 2: Update Installer Script

Before uploading to GitHub, edit `installer.sh`:

```bash
# Line 31: Change this to your GitHub repository URL
GITHUB_REPO="https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git"
```

### Step 3: Setup Neon Database

1. Go to https://console.neon.tech
2. Create a new project: "AI Video Generator"
3. Create a new database: `videoapp`
4. Copy the connection string (looks like this):
   ```
   postgresql://username:password@ep-xxx.neon.tech/videoapp?sslmode=require
   ```
5. **SAVE THIS** - you'll need it during installation!

### Step 4: SSH to Your VPS

```bash
# Connect to your server
ssh root@151.244.215.61

# Download the installer
wget https://raw.githubusercontent.com/YOUR_USERNAME/YOUR_REPO_NAME/main/installer.sh

# Make it executable
chmod +x installer.sh

# Run the installer
sudo ./installer.sh
```

### Step 5: Follow Interactive Setup

The installer will ask for:
- Neon Database URL
- Cloudinary credentials (cloud name, API key, secret, preset)
- OpenAI API key
- Fal.ai API key

Then it will automatically:
- ✅ Install Node.js 20, FFmpeg, PM2, Nginx
- ✅ Clone your GitHub repository
- ✅ Install dependencies
- ✅ Create `.env` file
- ✅ Setup database schema
- ✅ Build the application
- ✅ Start with PM2
- ✅ Configure Nginx
- ✅ Setup firewall

**Total time: ~10-15 minutes!**

---

## 📋 Prerequisites Checklist

Before running the installer, make sure you have:

- [ ] **VPS Server**
  - Ubuntu 22.04 or 24.04
  - Minimum 2GB RAM (4GB recommended)
  - Root or sudo access
  - IP: 151.244.215.61

- [ ] **Neon Database**
  - Free account created at https://neon.tech
  - Database "videoapp" created
  - Connection string copied

- [ ] **API Keys Ready**
  - Cloudinary: cloud name, API key, API secret, upload preset
  - OpenAI: API key for GPT-5
  - Fal.ai: API key
  - Google AI VEO: At least 2 tokens (added later in admin panel)

- [ ] **GitHub Repository**
  - Code uploaded to GitHub
  - Repository URL updated in `installer.sh` (line 31)

---

## 🛠️ What the Installer Does

### Automated Steps:

1. **Updates system packages** (apt update && upgrade)
2. **Installs Node.js 20** (LTS version)
3. **Installs FFmpeg** (for video processing)
4. **Installs PM2** (process manager)
5. **Installs Nginx** (web server)
6. **Creates app user** (`videoapp`)
7. **Clones GitHub repo** to `/home/videoapp/ai-video-generator`
8. **Installs npm packages** (all dependencies)
9. **Creates `.env` file** (interactive prompts)
10. **Pushes database schema** to Neon (`npm run db:push`)
11. **Builds frontend** (`npm run build`)
12. **Configures PM2** (ecosystem.config.cjs)
13. **Starts application** (PM2 auto-restart enabled)
14. **Configures Nginx** (reverse proxy on port 80)
15. **Sets up firewall** (UFW - ports 22, 80, 443)

---

## 📝 Installation Output Example

```
================================================
AI Video Generator - VPS Installer
================================================

ℹ Starting installation on Ubuntu server...
ℹ Server IP: 151.244.215.61

================================================
Step 1/13: Updating System Packages
================================================

✓ System updated successfully

================================================
Step 2/13: Installing Essential Tools
================================================

✓ Essential tools installed

[... continues through all 13 steps ...]

================================================
Installation Complete! 🎉
================================================

✓ AI Video Generator is now running!

Application Details:
  • URL: http://151.244.215.61
  • PM2 Process: ai-video-generator
  • App Directory: /home/videoapp/ai-video-generator
  • User: videoapp

Useful Commands:
  • View logs: sudo su - videoapp -c 'pm2 logs ai-video-generator'
  • Restart app: sudo su - videoapp -c 'pm2 restart ai-video-generator'
  • Check status: sudo su - videoapp -c 'pm2 status'

Next Steps:
  1. Visit http://151.244.215.61 to test the application
  2. Register an admin account
  3. Add VEO API tokens in Admin Panel
  4. Configure your domain (when ready)
```

---

## 🔐 Post-Installation Steps

### 1. Test the Application

```bash
# Visit in browser
http://151.244.215.61
```

### 2. Create Admin Account

1. Click "Register" on the website
2. Create account with username: `admin`
3. SSH to server and update role in Neon:

```sql
-- Run this in Neon SQL Editor (console.neon.tech)
UPDATE users 
SET role = 'admin', plan = 'empire', 
    plan_start_date = NOW(), 
    plan_expiry_date = NOW() + INTERVAL '365 days'
WHERE username = 'admin';
```

**OR** use the Neon dashboard SQL editor:
1. Go to https://console.neon.tech
2. Select your project
3. Click "SQL Editor"
4. Paste the query above
5. Click "Run"

### 3. Add VEO API Tokens

1. Login as admin
2. Go to Admin Panel
3. Click "Add Token"
4. Paste your Google AI VEO tokens
5. Mark them as "Active"

### 4. Test Video Generation

1. Go to "VEO Generator"
2. Enter prompt: "a beautiful sunset over mountains"
3. Click "Generate Video"
4. Wait ~1 minute for completion

---

## 🌐 Setup Domain & SSL (Optional)

When you're ready to use a domain instead of IP:

### Method 1: Using update-domain.sh Script

```bash
# SSH to server
ssh root@151.244.215.61

# Download domain update script
wget https://raw.githubusercontent.com/YOUR_USERNAME/YOUR_REPO_NAME/main/update-domain.sh

# Make executable
chmod +x update-domain.sh

# Run with your domain
sudo ./update-domain.sh yourdomain.com
```

This will:
- ✅ Update `.env` file with domain
- ✅ Update Nginx configuration
- ✅ Install Certbot
- ✅ Obtain SSL certificate
- ✅ Enable HTTPS redirect
- ✅ Restart application

### Method 2: Manual Setup

```bash
# 1. Point DNS A record to 151.244.215.61
# Wait for DNS propagation (can take 1-24 hours)

# 2. Update .env file
sudo nano /home/videoapp/ai-video-generator/.env
# Change: DOMAIN=yourdomain.com

# 3. Update Nginx config
sudo nano /etc/nginx/sites-available/ai-video-generator
# Change: server_name yourdomain.com www.yourdomain.com;
sudo nginx -t
sudo systemctl reload nginx

# 4. Install Certbot
sudo apt install -y certbot python3-certbot-nginx

# 5. Get SSL certificate
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com

# 6. Restart app
sudo su - videoapp -c 'pm2 restart ai-video-generator'
```

---

## 📊 Useful Commands

### Application Management

```bash
# View live logs
sudo su - videoapp -c 'pm2 logs ai-video-generator'

# View last 100 log lines
sudo su - videoapp -c 'pm2 logs ai-video-generator --lines 100'

# Restart application
sudo su - videoapp -c 'pm2 restart ai-video-generator'

# Stop application
sudo su - videoapp -c 'pm2 stop ai-video-generator'

# Check status
sudo su - videoapp -c 'pm2 status'

# Monitor CPU/memory
sudo su - videoapp -c 'pm2 monit'
```

### Nginx Management

```bash
# Test configuration
sudo nginx -t

# Reload configuration
sudo systemctl reload nginx

# Restart Nginx
sudo systemctl restart nginx

# View error logs
sudo tail -f /var/log/nginx/error.log

# View access logs
sudo tail -f /var/log/nginx/access.log
```

### System Monitoring

```bash
# Check disk space
df -h

# Check memory usage
free -h

# Check CPU usage
top

# Check running processes
ps aux | grep node
```

### Update Application

```bash
# SSH to server
ssh root@151.244.215.61

# Switch to app user
su - videoapp

# Navigate to app directory
cd ai-video-generator

# Pull latest changes from GitHub
git pull origin main

# Install new dependencies (if any)
npm install

# Rebuild frontend
npm run build

# Push schema changes (if any)
npm run db:push

# Restart application
pm2 restart ai-video-generator

# Check logs
pm2 logs ai-video-generator
```

---

## 🔧 Troubleshooting

### Application Won't Start

```bash
# Check PM2 logs
sudo su - videoapp -c 'pm2 logs ai-video-generator --err --lines 50'

# Check if port 3000 is in use
sudo netstat -tulpn | grep 3000

# Restart PM2
sudo su - videoapp -c 'pm2 restart ai-video-generator'
```

### Database Connection Issues

```bash
# Check .env file
sudo cat /home/videoapp/ai-video-generator/.env | grep DATABASE_URL

# Test Neon connection
cd /home/videoapp/ai-video-generator
sudo su - videoapp -c "cd /home/videoapp/ai-video-generator && node -e \"
import { neon } from '@neondatabase/serverless';
const sql = neon(process.env.DATABASE_URL);
await sql\\\`SELECT 1\\\`;
console.log('✓ Database connected!');
\""
```

### Nginx Issues

```bash
# Test configuration
sudo nginx -t

# Check error logs
sudo tail -f /var/log/nginx/error.log

# Restart Nginx
sudo systemctl restart nginx
```

### Can't Access Website

```bash
# Check if app is running
sudo su - videoapp -c 'pm2 status'

# Check if Nginx is running
sudo systemctl status nginx

# Check firewall
sudo ufw status

# Check if ports are open
sudo netstat -tulpn | grep -E ':(80|443|3000)'
```

---

## 🔄 Reinstalling

If something goes wrong and you want to start fresh:

```bash
# Stop and remove PM2 process
sudo su - videoapp -c 'pm2 delete ai-video-generator'
sudo su - videoapp -c 'pm2 save'

# Remove application directory
sudo rm -rf /home/videoapp/ai-video-generator

# Remove Nginx config
sudo rm /etc/nginx/sites-enabled/ai-video-generator
sudo rm /etc/nginx/sites-available/ai-video-generator
sudo systemctl reload nginx

# Re-run installer
sudo ./installer.sh
```

---

## 📁 File Locations

| File/Directory | Location |
|----------------|----------|
| Application | `/home/videoapp/ai-video-generator` |
| Environment | `/home/videoapp/ai-video-generator/.env` |
| PM2 Logs | `/home/videoapp/ai-video-generator/logs/` |
| Nginx Config | `/etc/nginx/sites-available/ai-video-generator` |
| Nginx Logs | `/var/log/nginx/` |
| SSL Certificates | `/etc/letsencrypt/live/yourdomain.com/` |

---

## 🎯 Success Checklist

After installation, verify:

- [ ] Website loads at `http://151.244.215.61`
- [ ] Can register new account
- [ ] Can login successfully
- [ ] Admin account has admin role
- [ ] Can add VEO API tokens in admin panel
- [ ] Can generate videos successfully
- [ ] All tools work (VEO, Bulk, Text-to-Image, Image-to-Video, Script)
- [ ] PM2 shows app as "online"
- [ ] Nginx is running without errors
- [ ] Firewall is active and configured
- [ ] Database connection is stable

---

## 💡 Performance Tips

### Increase Node.js Memory Limit

Edit `ecosystem.config.cjs`:
```javascript
max_memory_restart: '4G'  // Change from 2G to 4G
```

### Enable Nginx Gzip Compression

```bash
sudo nano /etc/nginx/nginx.conf

# Add inside http block:
gzip on;
gzip_vary on;
gzip_min_length 1024;
gzip_types text/plain text/css application/json application/javascript;
```

### Setup Log Rotation

```bash
# Install PM2 log rotation
sudo su - videoapp -c 'pm2 install pm2-logrotate'
sudo su - videoapp -c 'pm2 set pm2-logrotate:max_size 100M'
sudo su - videoapp -c 'pm2 set pm2-logrotate:retain 7'
```

---

## 📞 Support

If you encounter issues:

1. **Check logs:** `pm2 logs ai-video-generator`
2. **Review troubleshooting section** above
3. **Check Neon database status** at console.neon.tech
4. **Verify API keys** are correct in `.env`
5. **Check firewall settings:** `sudo ufw status`

---

## 🎉 You're Done!

Your AI Video Generator is now running on your VPS!

**Access at:** `http://151.244.215.61`

**Next steps:**
1. Test all features
2. Add VEO API tokens
3. Configure domain and SSL (when ready)
4. Start generating videos! 🎬
