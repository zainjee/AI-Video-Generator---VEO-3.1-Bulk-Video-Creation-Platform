# 🌐 Upload to GitHub Using Web Interface

**Step-by-step guide to upload your project to GitHub using only your web browser!**

No Git commands, no technical setup - just drag and drop! 🎯

---

## 📋 Before You Start

### ⚠️ CRITICAL: Edit installer.sh First!

**Before uploading anything, you MUST update `installer.sh` line 31:**

1. **Download your code** from Replit (three dots → Download as zip)
2. **Extract the zip** to your computer
3. **Open `installer.sh`** in a text editor (Notepad, TextEdit, VS Code, etc.)
4. **Find line 31:**
   ```bash
   GITHUB_REPO="https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git"
   ```
5. **You'll update this AFTER creating your repo** (Step 2 below)

---

## 🚀 Step-by-Step Web Upload

### Step 1: Download Code from Replit (2 minutes)

1. **Open your Replit project**
2. **Click the three dots menu** (⋮) in the top-right corner
3. **Click "Download as zip"**
4. **Save the zip file** to your computer
5. **Extract the zip file** to a folder
6. **You now have all your code!** 

### Step 2: Create GitHub Repository (3 minutes)

1. **Go to GitHub:** https://github.com
2. **Sign in** to your account (or create one if needed)
3. **Click the "+" icon** in top-right corner
4. **Click "New repository"**

   ![Screenshot placeholder: New repository button]

5. **Fill in the details:**

   **Repository name:**
   ```
   ai-video-generator
   ```

   **Description:** (Copy and paste this)
   ```
   Professional AI-powered video generation platform featuring Google VEO 3.1 for Disney Pixar-style 3D animations. Generate single videos or bulk process up to 100 prompts at once. Includes text-to-image (Google Imagen 3.5), image-to-video, AI script generation (OpenAI GPT-5), and video merging. One-command VPS deployment with automated installer.
   ```

   **Public or Private:**
   - ✅ **Public** - Anyone can see (recommended for portfolio)
   - ⬜ **Private** - Only you can see

   **IMPORTANT - Leave these UNCHECKED:**
   - ⬜ Add a README file (we already have one)
   - ⬜ Add .gitignore (we already have one)
   - ⬜ Choose a license (optional, can add later)

6. **Click "Create repository"**

7. **Copy your repository URL** - It looks like:
   ```
   https://github.com/YOUR_USERNAME/ai-video-generator
   ```
   **SAVE THIS URL!** You'll need it for the next step.

### Step 3: Update installer.sh with YOUR GitHub URL (2 minutes)

**NOW update installer.sh with your actual GitHub URL:**

1. **Open `installer.sh`** in text editor (from the folder you extracted)
2. **Find line 31:**
   ```bash
   GITHUB_REPO="https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git"
   ```
3. **Replace with YOUR URL** (add `.git` at the end):
   ```bash
   GITHUB_REPO="https://github.com/YOUR_USERNAME/ai-video-generator.git"
   ```
   
   **Example:** If your GitHub username is "johndoe":
   ```bash
   GITHUB_REPO="https://github.com/johndoe/ai-video-generator.git"
   ```

4. **Save the file**

**This step is CRITICAL!** The installer won't work without your correct GitHub URL.

### Step 4: Upload Files via Web Interface (5 minutes)

Now let's upload your code to GitHub!

#### Method A: Drag and Drop (Easiest!) 🎯

1. **Go to your repository** on GitHub (from Step 2)
2. **You'll see "Quick setup"** page with upload options
3. **Click "uploading an existing file"** link at the bottom

   ![Screenshot placeholder: Upload link]

4. **Drag ALL files and folders** from your extracted folder into the upload area

   **Drag these items:**
   - `client/` folder
   - `server/` folder
   - `shared/` folder
   - `installer.sh` (UPDATED with your GitHub URL!)
   - `update-domain.sh`
   - `.env.example`
   - `package.json`
   - `tsconfig.json`
   - `vite.config.ts`
   - `tailwind.config.ts`
   - `drizzle.config.ts`
   - All documentation files (*.md)
   - `.gitignore`

   **DO NOT drag:**
   - ❌ `.env` (contains secrets!)
   - ❌ `node_modules/` folder
   - ❌ `dist/` folder
   - ❌ `logs/` folder
   - ❌ `.replit` file
   - ❌ `replit.nix` file

5. **Wait for upload** to complete (progress bar will show)

6. **Scroll down** to "Commit changes" section

7. **Add commit message:**
   ```
   Initial commit - AI Video Generator with VEO 3.1
   ```

8. **Click "Commit changes"**

9. **Done!** Your code is now on GitHub! 🎉

#### Method B: Upload Multiple Times (If drag-drop doesn't work)

If you can't drag folders, upload in batches:

1. **First upload: Configuration files**
   - Click "Add file" → "Upload files"
   - Drag: `package.json`, `tsconfig.json`, `vite.config.ts`, `tailwind.config.ts`, `drizzle.config.ts`
   - Commit with message: "Add configuration files"

2. **Second upload: Scripts**
   - Click "Add file" → "Upload files"
   - Drag: `installer.sh`, `update-domain.sh`, `.env.example`, `.gitignore`
   - Commit with message: "Add deployment scripts"

3. **Third upload: Documentation**
   - Click "Add file" → "Upload files"
   - Drag: All `.md` files
   - Commit with message: "Add documentation"

4. **Fourth upload: Server folder**
   - Click "Add file" → "Upload files"
   - Drag the entire `server/` folder
   - Commit with message: "Add server code"

5. **Fifth upload: Client folder**
   - Click "Add file" → "Upload files"
   - Drag the entire `client/` folder
   - Commit with message: "Add client code"

6. **Sixth upload: Shared folder**
   - Click "Add file" → "Upload files"
   - Drag the entire `shared/` folder
   - Commit with message: "Add shared schemas"

### Step 5: Verify Upload (2 minutes)

**Check that everything uploaded correctly:**

1. **Go to your repository** main page
2. **You should see:**
   - ✅ `client/` folder
   - ✅ `server/` folder
   - ✅ `shared/` folder
   - ✅ `installer.sh`
   - ✅ `update-domain.sh`
   - ✅ `.env.example`
   - ✅ `package.json`
   - ✅ Documentation files (*.md)

3. **CRITICAL CHECK:** Click on `installer.sh`
   - **Look at line 31**
   - **Verify it has YOUR GitHub URL** (not the placeholder!)
   - Should look like: `GITHUB_REPO="https://github.com/YOUR_USERNAME/ai-video-generator.git"`

4. **Check .env is NOT there:**
   - Search for `.env` in your repository
   - If you see it, **DELETE IT IMMEDIATELY!**
   - Click on `.env` → Click trash icon → Confirm deletion

### Step 6: Add Topics/Tags (Optional - 1 minute)

Make your repository discoverable:

1. **Click the gear icon** next to "About" (right side of your repo page)
2. **Add topics:**
   ```
   ai-video-generator
   video-generation
   google-ai
   react-typescript
   nodejs-express
   postgresql
   automated-deployment
   ```
3. **Click "Save changes"**

---

## ✅ Success! Your Code is on GitHub

Your repository is now live at:
```
https://github.com/YOUR_USERNAME/ai-video-generator
```

---

## 🔧 Need to Edit installer.sh Again?

If you forgot to update installer.sh or made a mistake:

1. **Go to your repository** on GitHub
2. **Click on `installer.sh`**
3. **Click the pencil icon** (✏️) to edit
4. **Update line 31** with your GitHub URL
5. **Scroll down** and click "Commit changes"

---

## 📝 Add README.md (Optional - 2 minutes)

You already have `README_DEPLOYMENT.md` in your files. To make it your main README:

1. **Go to your repository** on GitHub
2. **Click on `README_DEPLOYMENT.md`**
3. **Click the pencil icon** (✏️) to edit
4. **Don't change anything!**
5. **Click the three dots** (⋯) in the top-right of editor
6. **Click "Rename file"**
7. **Change name to:** `README.md`
8. **Commit changes**

Your repository now has a beautiful README! 📚

---

## 🚀 Next Steps: Deploy to VPS

Now that your code is on GitHub, deploy it!

### What You Need:

1. **VPS Server**
   - IP: `151.244.215.61`
   - Root access

2. **Neon Database**
   - Create at: https://console.neon.tech
   - Get connection string

3. **API Keys**
   - Cloudinary (cloud name, API key, secret, preset)
   - OpenAI (GPT-5 key)
   - Fal.ai (API key)
   - Google VEO (tokens - add later)

### Deploy!

**SSH to your server:**
```bash
ssh root@151.244.215.61
```

**Download and run installer:**
```bash
# Download from YOUR GitHub
wget https://raw.githubusercontent.com/YOUR_USERNAME/ai-video-generator/main/installer.sh

# Make executable
chmod +x installer.sh

# Run it!
sudo ./installer.sh
```

**Follow the prompts** and your app will be live in ~20 minutes!

---

## ❓ Troubleshooting

### Can't upload folders?

**Solution:** Upload files in batches (see Method B above)

### Uploaded .env by mistake?

**Solution:** Delete it immediately!
1. Click on `.env` in your repository
2. Click trash icon
3. Confirm deletion
4. **Rotate all your API keys!** (they're now public)

### installer.sh still has placeholder URL?

**Solution:** Edit it on GitHub
1. Click on `installer.sh`
2. Click pencil icon
3. Update line 31
4. Commit changes

### Upload limit error?

**Solution:** Make sure you're NOT uploading:
- ❌ `node_modules/` (too large!)
- ❌ `dist/` folder
- ❌ `logs/` folder

These folders are auto-generated and shouldn't be in GitHub.

### Can't see .gitignore file?

GitHub hides files starting with `.` by default. It's there! Check by:
1. Click "Add file" → "Create new file"
2. Type `.test` in filename
3. Cancel - you'll see `.gitignore` is listed

---

## 📋 Upload Checklist

Before deploying to VPS:

- [ ] Code downloaded from Replit
- [ ] Repository created on GitHub
- [ ] **installer.sh line 31 updated with YOUR GitHub URL** ⚠️
- [ ] All files uploaded to GitHub
- [ ] `.env` file NOT uploaded
- [ ] Verified installer.sh on GitHub has correct URL
- [ ] README.md exists (optional)
- [ ] Topics/tags added (optional)
- [ ] Neon database ready
- [ ] API keys ready
- [ ] VPS access confirmed

---

## 🎉 You're Ready to Deploy!

Your code is safely on GitHub with the correct configuration.

**Next:** See `DEPLOYMENT_CHECKLIST.md` for step-by-step VPS deployment!

---

## 📚 More Resources

- **Deployment Guide:** `DEPLOYMENT_CHECKLIST.md`
- **Full Instructions:** `VPS_DEPLOYMENT_NEON.md`
- **Quick Reference:** `QUICK_START_VPS.md`
- **Installer Manual:** `VPS_INSTALLER_GUIDE.md`

---

**Questions?** All answered in the guides above! 📖

**Your repository:** `https://github.com/YOUR_USERNAME/ai-video-generator` 🚀
