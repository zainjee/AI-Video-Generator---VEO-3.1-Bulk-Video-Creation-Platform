# Quick Start - VPS Deployment with Neon Database

**Condensed 30-minute deployment guide for experienced users.**

---

## Prerequisites Checklist

- [ ] Fresh Ubuntu 22.04/24.04 server
- [ ] Domain DNS A record → Server IP
- [ ] Neon database created at https://neon.tech
- [ ] GitHub repo ready to clone
- [ ] API keys: Cloudinary, OpenAI, Fal.ai

---

## Step 1: Server Setup (5 min)

```bash
# SSH and update
ssh root@YOUR_SERVER_IP
apt update && apt upgrade -y

# Install essentials
apt install -y curl wget git build-essential

# Install Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
apt install -y nodejs

# Install FFmpeg, PM2, Nginx
apt install -y ffmpeg nginx
npm install -g pm2
```

---

## Step 2: Clone & Setup App (5 min)

```bash
# Clone repo
git clone https://github.com/YOUR_USERNAME/YOUR_REPO.git ai-video-generator
cd ai-video-generator

# Install dependencies
npm install
```

---

## Step 3: Environment Variables (3 min)

```bash
nano .env
```

**Paste this (replace with your values):**

```env
NODE_ENV=production
DATABASE_URL=postgresql://user:pass@ep-xxx.neon.tech/videoapp?sslmode=require
SESSION_SECRET=$(node -pe "require('crypto').randomBytes(32).toString('hex')")
CLOUDINARY_CLOUD_NAME=your-cloud
CLOUDINARY_API_KEY=your-key
CLOUDINARY_API_SECRET=your-secret
CLOUDINARY_UPLOAD_PRESET=ml_default
OPENAI_API_KEY=sk-proj-your-key
FAL_KEY=your-fal-key
PORT=3000
HOST=0.0.0.0
DOMAIN=yourdomain.com
IS_VPS=true
```

Save: `CTRL+X`, `Y`, `ENTER`

---

## Step 4: Database & Build (3 min)

```bash
# Push schema to Neon
npm run db:push

# Build frontend
npm run build
```

---

## Step 5: PM2 Setup (2 min)

```bash
# Create ecosystem config
cat > ecosystem.config.cjs << 'EOF'
module.exports = {
  apps: [{
    name: 'ai-video-generator',
    script: 'server/index.ts',
    interpreter: 'node',
    interpreter_args: '--loader tsx',
    instances: 1,
    autorestart: true,
    max_memory_restart: '2G',
    env: { NODE_ENV: 'production', PORT: 3000 }
  }]
};
EOF

# Start app
mkdir -p logs
pm2 start ecosystem.config.cjs
pm2 save
pm2 startup  # Run the command PM2 outputs
```

---

## Step 6: Nginx Config (5 min)

```bash
# Create config
sudo nano /etc/nginx/sites-available/ai-video-generator
```

**Paste this (replace yourdomain.com):**

```nginx
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;
    client_max_body_size 500M;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    location /api/bulk-generate {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Connection '';
        proxy_buffering off;
        chunked_transfer_encoding on;
    }
}
```

```bash
# Enable site
sudo ln -s /etc/nginx/sites-available/ai-video-generator /etc/nginx/sites-enabled/
sudo rm /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl reload nginx
```

---

## Step 7: SSL Certificate (3 min)

```bash
# Install Certbot
apt install -y certbot python3-certbot-nginx

# Get certificate
certbot --nginx -d yourdomain.com -d www.yourdomain.com \
  --email your@email.com --agree-tos --redirect
```

---

## Step 8: Firewall (2 min)

```bash
ufw enable
ufw allow 22/tcp    # SSH
ufw allow 80/tcp    # HTTP
ufw allow 443/tcp   # HTTPS
ufw status
```

---

## Step 9: Create Admin User (2 min)

```bash
# Option 1: Register at https://yourdomain.com then update role in Neon SQL editor:
# UPDATE users SET role = 'admin', plan = 'empire' WHERE username = 'admin';

# Option 2: Run this script
cat > create-admin.js << 'EOF'
import { drizzle } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless';
import bcrypt from 'bcrypt';
import { users } from './shared/schema.ts';

const sql = neon(process.env.DATABASE_URL);
const db = drizzle(sql);

const hashedPassword = await bcrypt.hash('Admin@123', 10);
await db.insert(users).values({
  username: 'admin',
  email: 'admin@yourdomain.com',
  password: hashedPassword,
  role: 'admin',
  plan: 'empire',
  planStartDate: new Date().toISOString(),
  planExpiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
  dailyVideoCount: 0
});
console.log('✓ Admin created! Login: admin / Admin@123');
EOF

node --loader tsx create-admin.js
rm create-admin.js
```

---

## Step 10: Verify (2 min)

```bash
# Check status
pm2 status
sudo systemctl status nginx

# View logs
pm2 logs ai-video-generator --lines 50
```

**Test in browser:**
1. Visit `https://yourdomain.com`
2. Login as admin
3. Add VEO API tokens in Admin Panel
4. Test video generation

---

## Common Commands

```bash
# Update app
cd ~/ai-video-generator
git pull
npm install
npm run build
npm run db:push
pm2 restart ai-video-generator

# View logs
pm2 logs ai-video-generator

# Restart services
pm2 restart ai-video-generator
sudo systemctl reload nginx

# Check health
curl https://yourdomain.com/api/health
```

---

## Troubleshooting

**App won't start:**
```bash
pm2 logs ai-video-generator
cat .env | grep DATABASE_URL
```

**Database errors:**
```bash
npm run db:push --force
```

**Nginx errors:**
```bash
sudo nginx -t
sudo tail -f /var/log/nginx/error.log
```

---

## Done! ✅

Your AI Video Generator is now live at `https://yourdomain.com`

**Next steps:**
1. Change admin password
2. Add VEO API tokens
3. Create user plans
4. Monitor with `pm2 monit`

For detailed guide, see: `VPS_DEPLOYMENT_NEON.md`
