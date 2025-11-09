# 🚀 VPS Deployment Checklist

Quick checklist to ensure successful deployment of your AI Video Generator to VPS.

---

## 📋 Pre-Deployment Checklist

### 1. GitHub Repository
- [ ] Code downloaded from Replit
- [ ] New GitHub repository created
- [ ] **CRITICAL:** Edit `installer.sh` line 31 with your GitHub URL
- [ ] All code uploaded to GitHub
- [ ] `.env` file **NOT** uploaded (check .gitignore)
- [ ] `.env.example` file included
- [ ] Verified on GitHub that `installer.sh` has correct URL

### 2. Neon Database
- [ ] Free account created at https://console.neon.tech
- [ ] New project created: "AI Video Generator"
- [ ] Database created: `videoapp`
- [ ] Connection string copied and saved
- [ ] Format: `postgresql://user:pass@ep-xxx.neon.tech/videoapp?sslmode=require`

### 3. API Keys Ready
- [ ] **Cloudinary**
  - [ ] Cloud name
  - [ ] API key
  - [ ] API secret
  - [ ] Upload preset (usually `ml_default`)
- [ ] **OpenAI**
  - [ ] API key for GPT-5 (starts with `sk-proj-`)
- [ ] **Fal.ai**
  - [ ] API key
- [ ] **Google AI VEO Tokens**
  - [ ] At least 2 API tokens ready (will add via admin panel)

### 4. VPS Server
- [ ] Ubuntu 22.04 or 24.04 server ready
- [ ] IP Address: `151.244.215.61`
- [ ] Root or sudo access confirmed
- [ ] Can SSH: `ssh root@151.244.215.61`
- [ ] Minimum 2GB RAM (4GB recommended)

---

## 🛠️ Installation Steps

### Step 1: Prepare GitHub (5 minutes)

```bash
# 1. Download code from Replit (three dots menu → Download as zip)
# 2. Extract the zip file
# 3. Edit installer.sh line 31 with your GitHub URL
# 4. Create new GitHub repository
# 5. Upload all files to GitHub
```

**Files to include:**
- ✅ `installer.sh` (with YOUR GitHub URL!)
- ✅ `update-domain.sh`
- ✅ `.env.example`
- ✅ `package.json`
- ✅ `server/` folder
- ✅ `client/` folder
- ✅ All documentation files

**Files to EXCLUDE:**
- ❌ `.env` (contains secrets!)
- ❌ `node_modules/`
- ❌ `dist/`
- ❌ `logs/`

### Step 2: SSH to VPS (1 minute)

```bash
ssh root@151.244.215.61
```

### Step 3: Download & Run Installer (2 minutes)

```bash
# Download installer from YOUR GitHub
wget https://raw.githubusercontent.com/YOUR_USERNAME/ai-video-generator/main/installer.sh

# Make executable
chmod +x installer.sh

# Run installer
sudo ./installer.sh
```

### Step 4: Interactive Setup (5 minutes)

Installer will prompt for:
- Neon Database URL
- Cloudinary Cloud Name
- Cloudinary API Key
- Cloudinary API Secret
- Cloudinary Upload Preset
- OpenAI API Key
- Fal.ai API Key

### Step 5: Wait for Installation (10-15 minutes)

The installer will automatically:
1. Update system packages
2. Install Node.js 20
3. Install FFmpeg
4. Install PM2
5. Install Nginx
6. Clone your repository
7. Install dependencies
8. Create .env file
9. Setup database
10. Build application
11. Start with PM2
12. Configure Nginx
13. Setup firewall

---

## ✅ Post-Installation Checklist

### 1. Verify Installation

```bash
# Check if app is running
sudo su - videoapp -c 'pm2 status'
# Should show: ai-video-generator │ online

# View logs
sudo su - videoapp -c 'pm2 logs ai-video-generator --lines 20'
# Should show no errors

# Check Nginx
sudo systemctl status nginx
# Should show: active (running)

# Visit website
# Open browser: http://151.244.215.61
# Should load the homepage
```

### 2. Create Admin Account

- [ ] Go to `http://151.244.215.61`
- [ ] Click "Register"
- [ ] Create account with username `admin`
- [ ] Note the password you used

### 3. Promote to Admin

**Option A: Neon SQL Editor**
1. Go to https://console.neon.tech
2. Select your project
3. Click "SQL Editor"
4. Run this query:
```sql
UPDATE users 
SET role = 'admin', 
    plan = 'empire',
    plan_start_date = NOW(),
    plan_expiry_date = NOW() + INTERVAL '365 days'
WHERE username = 'admin';
```

**Option B: Via SSH (if psql installed)**
```bash
# Get DATABASE_URL from .env
cat /home/videoapp/ai-video-generator/.env | grep DATABASE_URL
# Use the connection string with psql
```

### 4. Add VEO API Tokens

- [ ] Login as admin
- [ ] Go to Admin Panel
- [ ] Click "Add Token"
- [ ] Paste your Google AI VEO API tokens (one per line)
- [ ] Mark them as "Active"
- [ ] Save

### 5. Test Video Generation

- [ ] Go to "VEO 3.1 Video Generator"
- [ ] Enter prompt: "a beautiful sunset over mountains"
- [ ] Select aspect ratio: Landscape
- [ ] Click "Generate Video"
- [ ] Wait ~1 minute
- [ ] Video should complete successfully

### 6. Test All Tools

- [ ] **VEO Generator**: ✅ Working
- [ ] **Bulk Video Generator**: ✅ Working
- [ ] **Text to Image**: ✅ Working
- [ ] **Image to Video**: ✅ Working
- [ ] **Script Creator**: ✅ Working
- [ ] **Video History**: ✅ Shows generated videos

---

## 🌐 Domain & SSL Setup (Optional)

If you want to use a custom domain:

### Prerequisites
- [ ] Domain name purchased
- [ ] DNS A record points to `151.244.215.61`
- [ ] DNS propagated (wait 1-24 hours)

### Setup

**Option 1: Using Script**
```bash
# SSH to server
ssh root@151.244.215.61

# Download domain script
wget https://raw.githubusercontent.com/YOUR_USERNAME/ai-video-generator/main/update-domain.sh

# Make executable
chmod +x update-domain.sh

# Run with your domain
sudo ./update-domain.sh yourdomain.com
```

**Option 2: Manual Setup**
See `VPS_DEPLOYMENT_NEON.md` Part 10 for manual steps.

### After Domain Setup
- [ ] Website loads at `https://yourdomain.com`
- [ ] SSL certificate shows as valid (padlock icon)
- [ ] HTTP redirects to HTTPS
- [ ] Can login and generate videos

---

## 🔍 Troubleshooting Checklist

### App Won't Start
- [ ] Check PM2 logs: `pm2 logs ai-video-generator`
- [ ] Check .env file: `cat /home/videoapp/ai-video-generator/.env`
- [ ] Verify port 3000 not in use: `sudo netstat -tulpn | grep 3000`
- [ ] Restart: `pm2 restart ai-video-generator`

### Database Connection Issues
- [ ] Verify DATABASE_URL in .env is correct
- [ ] Test connection from Neon dashboard
- [ ] Check if database exists: `videoapp`
- [ ] Verify SSL mode in connection string: `?sslmode=require`

### Can't Access Website
- [ ] App running: `pm2 status`
- [ ] Nginx running: `systemctl status nginx`
- [ ] Firewall configured: `sudo ufw status`
- [ ] Ports open: `sudo netstat -tulpn | grep -E ':(80|443|3000)'`

### Video Generation Fails
- [ ] VEO tokens added in admin panel
- [ ] Tokens marked as "Active"
- [ ] Check logs for error messages
- [ ] Verify Cloudinary credentials in .env
- [ ] Test with simple prompt first

---

## 📊 Success Indicators

Your deployment is successful when:

✅ Website loads at `http://151.244.215.61`  
✅ Can register and login  
✅ Admin account has admin role  
✅ Can add VEO API tokens  
✅ Can generate videos successfully  
✅ All tools working (VEO, Bulk, Text-to-Image, etc.)  
✅ PM2 shows app as "online"  
✅ Nginx running without errors  
✅ Database connection stable  
✅ No errors in logs  

---

## 🎯 Quick Commands Reference

```bash
# View logs
sudo su - videoapp -c 'pm2 logs ai-video-generator'

# Restart app
sudo su - videoapp -c 'pm2 restart ai-video-generator'

# Check status
sudo su - videoapp -c 'pm2 status'

# Update code from GitHub
cd /home/videoapp/ai-video-generator
git pull origin main
npm install
npm run build
pm2 restart ai-video-generator

# View Nginx logs
sudo tail -f /var/log/nginx/error.log

# Test Nginx config
sudo nginx -t
```

---

## 📁 Important File Locations

| What | Where |
|------|-------|
| Application | `/home/videoapp/ai-video-generator` |
| Environment | `/home/videoapp/ai-video-generator/.env` |
| PM2 Logs | `/home/videoapp/ai-video-generator/logs/` |
| Nginx Config | `/etc/nginx/sites-available/ai-video-generator` |
| SSL Certs | `/etc/letsencrypt/live/yourdomain.com/` |

---

## 💰 Expected Costs

| Service | Monthly Cost |
|---------|--------------|
| VPS (2-4GB RAM) | $6-12 |
| Neon Database | **FREE** |
| Domain | $1-2 |
| SSL | **FREE** |
| Cloudinary | **FREE** |
| **Total** | **$7-14/month** |

---

## 📚 Documentation Files

1. **DEPLOYMENT_CHECKLIST.md** (this file) - Step-by-step checklist
2. **VPS_DEPLOYMENT_NEON.md** - Full detailed guide (23 parts, ~60 min)
3. **QUICK_START_VPS.md** - Quick reference (10 steps, ~30 min)
4. **VPS_INSTALLER_GUIDE.md** - Installer script usage
5. **GITHUB_UPLOAD_GUIDE.md** - How to upload to GitHub
6. **DEPLOYMENT_SUMMARY.md** - Architecture & overview
7. **README.md** - Project overview

---

## 🎉 Next Steps After Deployment

1. **Monitor Performance**
   - Check PM2 dashboard: `pm2 monit`
   - Watch logs for errors
   - Monitor disk space: `df -h`

2. **Setup Backups**
   - Neon automatically backs up database
   - Access backups in Neon dashboard

3. **Configure Domain** (when ready)
   - Point DNS to your IP
   - Run `update-domain.sh`
   - Get free SSL certificate

4. **Create User Plans**
   - Add Scale and Empire plan users
   - Set daily video limits
   - Configure plan expiry

5. **Start Generating**
   - Test all features
   - Generate sample videos
   - Share with users!

---

**You're ready to deploy!** 🚀

Follow this checklist step by step, and your AI Video Generator will be live in ~30 minutes!

**Support:** See `VPS_INSTALLER_GUIDE.md` for detailed troubleshooting.
