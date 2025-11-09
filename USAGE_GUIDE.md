# Usage Guide - Logs, Database Export & GitHub Publishing

This guide shows you how to use the new utility scripts for managing logs, exporting your database, and publishing to GitHub.

---

## 📁 **New Directory Structure**

```
ai-video-generator/
├── logs/           # Application logs will be saved here
├── exports/        # Database exports will be saved here
├── scripts/        # Utility scripts
│   ├── export_database.sh
│   ├── collect_logs.sh
│   ├── github_prepare.sh
│   └── README.md
├── .env.example    # Template for environment variables
└── .gitignore      # Updated to protect sensitive files
```

---

## 📋 **1. Collecting Logs**

### **Collect All Application Logs**

```bash
./scripts/collect_logs.sh
```

**What it does:**
- Collects PM2 logs, workflow logs, and system logs
- Creates a timestamped archive file
- Saves to `logs/logs_archive_TIMESTAMP.txt`

**Output Example:**
```
✅ Logs collected successfully!
📁 Archive saved to: logs/logs_archive_20251107_153045.txt
📊 Archive size: 234K
```

**View the collected logs:**
```bash
cat logs/logs_archive_*.txt

# Or search for specific errors:
grep -i "error" logs/logs_archive_*.txt
grep -i "video not found" logs/logs_archive_*.txt
```

---

## 📦 **2. Exporting Database**

### **Export Full Database**

```bash
./scripts/export_database.sh
```

**What it does:**
- Exports complete database (schema + data)
- Exports schema-only version
- Saves to `exports/database_export_TIMESTAMP.sql`

**Output Example:**
```
✅ Database exported successfully!
📁 File location: exports/database_export_20251107_153045.sql
📊 File size: 125K
```

### **Import Database Later**

On your VPS or another environment:

```bash
# Import the full database
psql $DATABASE_URL < exports/database_export_20251107_153045.sql

# Or just the schema
psql $DATABASE_URL < exports/schema_only_20251107_153045.sql
```

---

## 🚀 **3. Publishing to GitHub**

### **Step 1: Prepare for GitHub**

```bash
./scripts/github_prepare.sh
```

**What it does:**
- Checks for sensitive files (.env)
- Creates .env.example template
- Validates .gitignore configuration
- Shows pre-commit checklist

### **Step 2: Commit Your Code**

```bash
# Add all files
git add .

# Commit with message
git commit -m "Initial commit: AI Video Generator"

# Add your GitHub repository
git remote add origin https://github.com/yourusername/ai-video-generator.git

# Push to GitHub
git push -u origin main
```

### **Step 3: Verify on GitHub**

Visit your repository and make sure:
- ✅ `.env` file is NOT visible (protected by .gitignore)
- ✅ `.env.example` is visible (safe template)
- ✅ All source code is uploaded
- ✅ `logs/` and `exports/` directories exist but are empty

---

## 🔄 **4. Workflow for VPS Deployment**

### **Before Deploying:**

1. **Export Database:**
   ```bash
   ./scripts/export_database.sh
   ```

2. **Collect Logs (for debugging):**
   ```bash
   ./scripts/collect_logs.sh
   ```

3. **Commit to GitHub:**
   ```bash
   git add .
   git commit -m "Update before VPS deployment"
   git push
   ```

### **On VPS:**

1. **Clone from GitHub:**
   ```bash
   cd /var/www
   git clone https://github.com/yourusername/ai-video-generator.git
   cd ai-video-generator
   ```

2. **Setup Environment:**
   ```bash
   cp .env.example .env
   nano .env  # Add your actual credentials
   ```

3. **Import Database (if needed):**
   ```bash
   # Download your exported database
   # Then import it:
   psql $DATABASE_URL < exports/database_export_TIMESTAMP.sql
   ```

4. **Start Application:**
   ```bash
   npm install
   npm run db:push
   pm2 start ecosystem.config.cjs
   ```

---

## 🔍 **5. Common Tasks**

### **Daily Logs Collection**

```bash
# Collect logs for debugging
./scripts/collect_logs.sh

# View recent errors
cat logs/logs_archive_*.txt | grep -i "error" | tail -50
```

### **Weekly Database Backup**

```bash
# Export database
./scripts/export_database.sh

# Optional: Upload to cloud storage
# Or commit to private GitHub repository
```

### **Before Major Updates**

```bash
# 1. Backup database
./scripts/export_database.sh

# 2. Collect current logs
./scripts/collect_logs.sh

# 3. Commit to GitHub
git add .
git commit -m "Backup before update"
git push

# 4. Make your changes...
```

---

## 📊 **6. File Locations**

### **Logs:**
- **Archive:** `logs/logs_archive_TIMESTAMP.txt`
- **Live PM2:** Use `pm2 logs ai-video-generator`

### **Database Exports:**
- **Full Export:** `exports/database_export_TIMESTAMP.sql`
- **Schema Only:** `exports/schema_only_TIMESTAMP.sql`

### **Configuration:**
- **Template:** `.env.example` (safe to commit)
- **Actual:** `.env` (never commit this!)

---

## ⚠️ **Important Notes**

### **Security:**
- ✅ `.env` is in `.gitignore` (will NOT be pushed to GitHub)
- ✅ Log files in `logs/` are ignored
- ✅ Database exports in `exports/` are ignored
- ⚠️ Always use `.env.example` as template, never commit `.env`

### **GitHub:**
- ✅ `.env.example` should be committed (safe template)
- ✅ `logs/.gitkeep` keeps directory in Git
- ✅ `exports/.gitkeep` keeps directory in Git
- ⚠️ Actual logs and exports are never committed

### **VPS:**
- All scripts work identically on VPS
- Make sure to set environment variables first
- Use `pm2` for production deployments

---

## 🆘 **Troubleshooting**

### **Script Permission Denied:**
```bash
chmod +x scripts/*.sh
```

### **Database Export Fails:**
```bash
# Make sure DATABASE_URL is set
export DATABASE_URL="your-connection-string"
./scripts/export_database.sh
```

### **Logs Not Collecting:**
```bash
# Check if PM2 is running
pm2 status

# Or collect workflow logs manually
cat /tmp/logs/*.log > logs/manual_collection.txt
```

---

## 📚 **Quick Reference**

```bash
# Collect logs
./scripts/collect_logs.sh

# Export database
./scripts/export_database.sh

# Prepare for GitHub
./scripts/github_prepare.sh

# View logs
cat logs/logs_archive_*.txt

# Import database
psql $DATABASE_URL < exports/database_export_*.sql
```

---

**That's it!** You now have complete control over your logs, database backups, and GitHub publishing workflow. 🎉
