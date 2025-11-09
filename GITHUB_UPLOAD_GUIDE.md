# How to Upload Your Project to GitHub

Quick guide to download your Replit code and upload it to GitHub for VPS deployment.

---

## Method 1: Using Replit Download (Recommended)

### Step 1: Download from Replit

1. **In Replit, click the three dots menu** (top right)
2. **Click "Download as zip"**
3. **Extract the zip file** to your computer
4. **Navigate to the extracted folder**

### Step 2: Create GitHub Repository

1. Go to https://github.com
2. Click **"New repository"** (green button)
3. **Name:** `ai-video-generator` (or your preferred name)
4. **Privacy:** Choose Public or Private
5. **Don't initialize** with README, .gitignore, or license
6. Click **"Create repository"**
7. **Copy the repository URL** (looks like: `https://github.com/username/ai-video-generator.git`)

### Step 3: Upload Code to GitHub

#### Option A: Using GitHub Desktop (Easiest)

1. **Download GitHub Desktop:** https://desktop.github.com
2. **Install and sign in** with your GitHub account
3. Click **"Add existing repository"**
4. Select your **extracted folder**
5. Click **"Publish repository"**
6. Select your repository and click **"Publish"**

#### Option B: Using Git Command Line

```bash
# Navigate to your extracted folder
cd path/to/ai-video-generator

# Initialize git repository
git init

# Add all files
git add .

# Commit files
git commit -m "Initial commit - AI Video Generator"

# Add your GitHub repository as remote
git remote add origin https://github.com/YOUR_USERNAME/ai-video-generator.git

# Push to GitHub
git branch -M main
git push -u origin main
```

### Step 4: Update installer.sh

**IMPORTANT:** Before uploading, you **MUST** update the GitHub URL in `installer.sh`:

1. Open `installer.sh` in a text editor
2. Find line 31:
   ```bash
   GITHUB_REPO="https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git"
   ```
3. Replace with your actual GitHub repository URL:
   ```bash
   GITHUB_REPO="https://github.com/yourusername/ai-video-generator.git"
   ```
4. Save the file
5. Commit and push the change:
   ```bash
   git add installer.sh
   git commit -m "Update GitHub URL in installer"
   git push origin main
   ```

---

## Method 2: Using Git on Replit (Advanced)

### Step 1: Setup Git on Replit

In the Replit Shell:

```bash
# Configure git
git config --global user.name "Your Name"
git config --global user.email "your@email.com"

# Initialize repository
git init
git add .
git commit -m "Initial commit"
```

### Step 2: Create GitHub Repository

1. Go to https://github.com
2. Create new repository (don't initialize it)
3. Copy the repository URL

### Step 3: Push to GitHub

```bash
# Add GitHub as remote
git remote add origin https://github.com/YOUR_USERNAME/ai-video-generator.git

# Push code
git branch -M main
git push -u origin main
```

You'll need to authenticate with a **GitHub Personal Access Token**:
1. Go to https://github.com/settings/tokens
2. Generate new token (classic)
3. Give it `repo` permissions
4. Copy the token
5. Use it as your password when pushing

---

## What to Upload

Make sure these files are included:

### Required Files ✅
- `installer.sh` - Automated installer script
- `update-domain.sh` - Domain & SSL setup script
- `.env.example` - Environment variables template
- `package.json` - Dependencies
- `server/` - Backend code
- `client/` - Frontend code
- `shared/` - Shared schemas
- `ecosystem.config.cjs` - PM2 configuration (if it exists)
- `drizzle.config.ts` - Database configuration
- `vite.config.ts` - Vite configuration
- `tailwind.config.ts` - Tailwind configuration
- `tsconfig.json` - TypeScript configuration

### Documentation Files ✅
- `README.md` - Project overview
- `VPS_DEPLOYMENT_NEON.md` - Full deployment guide
- `QUICK_START_VPS.md` - Quick reference
- `VPS_INSTALLER_GUIDE.md` - Installer usage guide
- `DEPLOYMENT_SUMMARY.md` - Deployment overview
- `replit.md` - Architecture documentation

### Files to EXCLUDE ❌
- `.env` - Contains your secrets! Never upload this!
- `node_modules/` - Will be reinstalled on VPS
- `dist/` - Will be rebuilt on VPS
- `.replit` - Replit-specific config
- `replit.nix` - Replit-specific config
- `.cache/` - Temporary cache files
- `logs/` - Log files

### Create .gitignore

If you don't have a `.gitignore` file, create one:

```gitignore
# Environment variables
.env

# Dependencies
node_modules/

# Build output
dist/
build/

# Logs
logs/
*.log

# Cache
.cache/
.temp/

# Replit specific
.replit
replit.nix

# OS files
.DS_Store
Thumbs.db
```

---

## Verify Your Upload

After uploading, verify these files exist on GitHub:

1. Go to your repository on GitHub
2. Check these files are present:
   - ✅ `installer.sh`
   - ✅ `update-domain.sh`
   - ✅ `.env.example`
   - ✅ `package.json`
   - ✅ `server/` folder
   - ✅ `client/` folder
3. **IMPORTANT:** Open `installer.sh` on GitHub and verify:
   - Line 31 has YOUR GitHub URL (not the placeholder)

---

## Update Installer.sh GitHub URL

**This is CRITICAL!** The installer needs your actual GitHub URL.

### Before (DON'T USE THIS):
```bash
GITHUB_REPO="https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git"
```

### After (USE YOUR ACTUAL URL):
```bash
GITHUB_REPO="https://github.com/johndoe/ai-video-generator.git"
```

### How to Update:

**Option 1: Edit on GitHub**
1. Go to your repository on GitHub
2. Click on `installer.sh`
3. Click the pencil icon (Edit)
4. Change line 31 to your GitHub URL
5. Scroll down and click "Commit changes"

**Option 2: Edit Locally and Push**
1. Open `installer.sh` in your text editor
2. Update line 31 with your GitHub URL
3. Save the file
4. Commit and push:
   ```bash
   git add installer.sh
   git commit -m "Update GitHub URL"
   git push origin main
   ```

---

## After Upload - Deploy to VPS

Once your code is on GitHub with the correct URL:

### Step 1: SSH to Your VPS

```bash
ssh root@151.244.215.61
```

### Step 2: Download and Run Installer

```bash
# Download the installer directly from your GitHub
wget https://raw.githubusercontent.com/YOUR_USERNAME/ai-video-generator/main/installer.sh

# Make it executable
chmod +x installer.sh

# Run it
sudo ./installer.sh
```

### Step 3: Follow Interactive Prompts

The installer will ask for:
- Neon database URL
- Cloudinary credentials
- OpenAI API key
- Fal.ai API key

Then it will automatically install everything!

---

## Common Issues

### Issue: Can't push to GitHub (authentication failed)

**Solution:** Use a Personal Access Token instead of password
1. Go to https://github.com/settings/tokens
2. Generate new token (classic)
3. Select `repo` scope
4. Copy the token
5. Use it as your password when pushing

### Issue: .env file uploaded to GitHub

**Solution:** Remove it immediately!
```bash
# Remove from git history
git rm .env
git commit -m "Remove .env file"
git push origin main

# Add to .gitignore
echo ".env" >> .gitignore
git add .gitignore
git commit -m "Add .env to gitignore"
git push origin main
```

Then **rotate all your API keys** since they're now public!

### Issue: Files too large to upload

**Solution:** Make sure `node_modules/` and `dist/` are in `.gitignore`
```bash
# Remove from git
git rm -r --cached node_modules dist
git commit -m "Remove node_modules and dist"
git push origin main
```

---

## Next Steps

After successfully uploading to GitHub:

1. ✅ Verify all files are on GitHub
2. ✅ Check `installer.sh` has correct GitHub URL
3. ✅ Setup Neon database (if not done)
4. ✅ Gather all API keys
5. ✅ SSH to your VPS (151.244.215.61)
6. ✅ Run the installer script
7. ✅ Test your application
8. ✅ Configure domain and SSL (optional)

---

## Quick Checklist

Before deploying:

- [ ] Code uploaded to GitHub
- [ ] `.env` file NOT uploaded (check!)
- [ ] `installer.sh` has correct GitHub URL (line 31)
- [ ] `.env.example` file is present
- [ ] All shell scripts are included
- [ ] Documentation files included
- [ ] Neon database ready
- [ ] API keys ready (Cloudinary, OpenAI, Fal.ai)
- [ ] VPS access confirmed (ssh root@151.244.215.61)

---

**Ready to deploy!** 🚀

See `VPS_INSTALLER_GUIDE.md` for deployment instructions.
