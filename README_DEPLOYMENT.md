# 🚀 AI Video Generator - VPS Deployment Package

**Automated installer for Ubuntu VPS deployment with Neon cloud database**

---

## 📦 What's Included

This repository contains everything you need to deploy the AI Video Generator to your Ubuntu VPS:

### 🛠️ Installation Scripts
- **`installer.sh`** - Automated VPS installer (one-command deployment!)
- **`update-domain.sh`** - Domain & SSL configuration script
- **`.env.example`** - Environment variables template

### 📚 Documentation
- **`DEPLOYMENT_CHECKLIST.md`** - Step-by-step deployment checklist ⭐ START HERE
- **`VPS_DEPLOYMENT_NEON.md`** - Full detailed guide (23 parts, ~60 min)
- **`QUICK_START_VPS.md`** - Quick reference (10 steps, ~30 min)
- **`VPS_INSTALLER_GUIDE.md`** - Installer usage and troubleshooting
- **`GITHUB_UPLOAD_GUIDE.md`** - How to upload this code to GitHub
- **`DEPLOYMENT_SUMMARY.md`** - Architecture overview

### 💻 Application Code
- **`server/`** - Node.js/Express backend
- **`client/`** - React/TypeScript frontend
- **`shared/`** - Shared schemas (Drizzle ORM)
- **`package.json`** - Dependencies and scripts

---

## ⚡ Quick Start (30 Minutes)

### Step 1: Upload to GitHub (5 min)

1. **Download this code** from Replit (three dots → Download as zip)
2. **Create GitHub repository:** https://github.com/new
3. **IMPORTANT:** Edit `installer.sh` line 31:
   ```bash
   GITHUB_REPO="https://github.com/YOUR_USERNAME/YOUR_REPO.git"
   ```
4. **Upload all files** to GitHub (see `GITHUB_UPLOAD_GUIDE.md`)

### Step 2: Setup Neon Database (5 min)

1. Create free account: https://console.neon.tech
2. Create project: "AI Video Generator"
3. Create database: `videoapp`
4. Copy connection string:
   ```
   postgresql://user:pass@ep-xxx.neon.tech/videoapp?sslmode=require
   ```

### Step 3: Deploy to VPS (20 min)

```bash
# SSH to your server
ssh root@151.244.215.61

# Download installer
wget https://raw.githubusercontent.com/YOUR_USERNAME/YOUR_REPO/main/installer.sh

# Make executable
chmod +x installer.sh

# Run it!
sudo ./installer.sh
```

The installer will:
- ✅ Install Node.js 20, FFmpeg, PM2, Nginx
- ✅ Clone your GitHub repository
- ✅ Install dependencies
- ✅ Create `.env` file (interactive prompts)
- ✅ Setup database
- ✅ Build application
- ✅ Start with PM2
- ✅ Configure Nginx
- ✅ Setup firewall

**Done! Your app is live at:** `http://151.244.215.61` 🎉

---

## 📋 Prerequisites

Before you start:

- [ ] **VPS Server** (Ubuntu 22.04/24.04, 2-4GB RAM)
  - IP: `151.244.215.61`
  - Root/sudo access
  
- [ ] **Neon Database**
  - Free account at https://neon.tech
  - Database "videoapp" created
  - Connection string ready

- [ ] **API Keys**
  - Cloudinary (cloud name, API key, secret, preset)
  - OpenAI (GPT-5 API key)
  - Fal.ai (API key)
  - Google AI VEO (2+ tokens, add later in admin panel)

- [ ] **GitHub Repository**
  - Code uploaded
  - `installer.sh` updated with YOUR GitHub URL

---

## 🎯 Which Guide to Use?

| Your Experience | Recommended Guide | Time |
|-----------------|-------------------|------|
| **Never used VPS** | `DEPLOYMENT_CHECKLIST.md` | ~30 min |
| **Some Linux knowledge** | `VPS_DEPLOYMENT_NEON.md` | ~60 min |
| **Linux expert** | `QUICK_START_VPS.md` | ~20 min |

**Not sure?** Start with `DEPLOYMENT_CHECKLIST.md` - it's a step-by-step checklist! ✅

---

## 🏗️ Architecture

### Simple & Modern Stack
```
User → Domain (HTTPS)
    → Nginx (reverse proxy + SSL)
        → PM2 (process manager)
            → Node.js App (port 3000)
                → Neon Database (cloud PostgreSQL)
                → Cloudinary (video storage)
```

**No Docker, No Complexity!** Just PM2 + Nginx + Neon = Fast & Simple 🚀

### Why Neon Database?

- ✅ **Cloud-hosted** (nothing to install!)
- ✅ **Automatic backups** (every 24 hours)
- ✅ **Free tier** (0.5GB storage)
- ✅ **Auto-scaling** (handles traffic spikes)
- ✅ **Same database** for Replit AND VPS!

---

## 💰 Monthly Costs

| Service | Cost |
|---------|------|
| VPS (2-4GB) | $6-12 |
| Neon Database | **FREE** |
| Domain | $1-2 |
| SSL | **FREE** |
| Cloudinary | **FREE** |
| **Total** | **$7-14/month** |

---

## 🔐 Post-Deployment

After installation:

### 1. Test Application
```bash
# Visit in browser
http://151.244.215.61
```

### 2. Create Admin Account
1. Click "Register"
2. Username: `admin`
3. Update role in Neon SQL Editor:
```sql
UPDATE users 
SET role = 'admin', plan = 'empire'
WHERE username = 'admin';
```

### 3. Add VEO API Tokens
1. Login as admin
2. Admin Panel → Add Tokens
3. Paste Google AI VEO tokens
4. Mark as "Active"

### 4. Test Video Generation
- VEO Generator → Enter prompt → Generate!

---

## 🌐 Add Domain & SSL (Later)

When ready for custom domain:

```bash
# Download domain setup script
wget https://raw.githubusercontent.com/YOUR_USERNAME/YOUR_REPO/main/update-domain.sh

# Make executable
chmod +x update-domain.sh

# Run with your domain
sudo ./update-domain.sh yourdomain.com
```

This automatically:
- Updates environment variables
- Configures Nginx for domain
- Obtains free SSL certificate (Let's Encrypt)
- Enables HTTPS redirect

**Your site will be live at:** `https://yourdomain.com` 🌐

---

## 📊 Performance Boost

Your VPS will be **40% faster** than Replit!

| Environment | Workers | Submissions | 100 Videos In |
|-------------|---------|-------------|---------------|
| Replit | 11 | 3 | ~16-18 min |
| **VPS** | **20** | **8** | **~10-12 min** |

---

## 🛠️ Useful Commands

```bash
# View logs
sudo su - videoapp -c 'pm2 logs ai-video-generator'

# Restart app
sudo su - videoapp -c 'pm2 restart ai-video-generator'

# Check status
sudo su - videoapp -c 'pm2 status'

# Update from GitHub
cd /home/videoapp/ai-video-generator
git pull origin main
npm install && npm run build
pm2 restart ai-video-generator
```

---

## 🔧 Troubleshooting

### App Won't Start
```bash
pm2 logs ai-video-generator --lines 100
```

### Database Connection Error
- Check DATABASE_URL in `.env`
- Test connection at https://console.neon.tech

### Can't Access Website
- Check firewall: `sudo ufw status`
- Check Nginx: `sudo systemctl status nginx`
- Check PM2: `pm2 status`

**See `VPS_INSTALLER_GUIDE.md` for detailed troubleshooting!**

---

## 📁 File Structure

```
ai-video-generator/
├── installer.sh              ← Automated VPS installer
├── update-domain.sh          ← Domain & SSL setup
├── .env.example              ← Environment template
├── DEPLOYMENT_CHECKLIST.md   ← Start here! ⭐
├── server/                   ← Backend (Node.js)
├── client/                   ← Frontend (React)
├── shared/                   ← Schemas (Drizzle ORM)
└── package.json              ← Dependencies
```

---

## ✅ Success Checklist

Your deployment is successful when:

- ✅ Website loads at `http://151.244.215.61`
- ✅ Can register and login
- ✅ Admin account has admin role
- ✅ Can add VEO API tokens
- ✅ Can generate videos successfully
- ✅ All tools work (VEO, Bulk, Text-to-Image, Image-to-Video, Script)
- ✅ PM2 shows app as "online"
- ✅ Nginx running without errors

---

## 🎬 Features

Once deployed, users can:

- **Generate Videos** with VEO 3.1 AI (Disney Pixar style!)
- **Bulk Generation** (up to 100 videos at once)
- **Text to Image** with Google AI Imagen 3.5
- **Image to Video** transformation
- **AI Script Generator** with OpenAI GPT-5
- **Video History** with merge capabilities
- **User Plans** (Free, Scale, Empire)
- **Admin Panel** for management

---

## 🚀 Ready to Deploy?

1. **Read:** `DEPLOYMENT_CHECKLIST.md` (step-by-step)
2. **Setup:** Neon database + GitHub
3. **Run:** `installer.sh` on your VPS
4. **Test:** Generate your first video!
5. **Enjoy:** Professional AI video platform! 🎉

---

## 📞 Need Help?

- **Installation issues?** See `VPS_INSTALLER_GUIDE.md`
- **GitHub upload?** See `GITHUB_UPLOAD_GUIDE.md`
- **Detailed setup?** See `VPS_DEPLOYMENT_NEON.md`
- **Quick reference?** See `QUICK_START_VPS.md`

---

## 🎉 What's Next?

After successful deployment:

1. ✅ Test all features
2. ✅ Add VEO API tokens
3. ✅ Create user plans
4. ✅ Configure domain and SSL (optional)
5. ✅ Start generating amazing videos!

**Your AI Video Generator is ready for production!** 🎬

---

**Server IP:** `151.244.215.61`  
**Deployment Time:** ~30 minutes  
**Monthly Cost:** $7-14  
**Database:** Neon PostgreSQL (cloud)  

**Questions?** Check the guides above! Every step is documented. 📚
