# AI Video Generator

A professional AI-powered video generation platform featuring VEO 3.1 video generation, bulk processing, text-to-image, image-to-video, and AI script creation.

## Features

- 🎬 **VEO 3.1 Video Generation** - Create high-quality AI videos from text prompts
- 📦 **Bulk Video Generation** - Generate up to 100 videos in batches  
- 🖼️ **Text to Image** - AI-powered image generation using Google AI
- 🎥 **Image to Video** - Transform static images into animated videos
- 📝 **AI Script Creator** - Generate detailed storyboards with GPT-5
- 📊 **Admin Dashboard** - User management, API token rotation, analytics
- 💳 **Plan System** - Free, Scale, and Empire plans with usage limits

## Tech Stack

- **Frontend:** React, TypeScript, Vite, TailwindCSS, shadcn/ui
- **Backend:** Node.js, Express, TypeScript
- **Database:** PostgreSQL (Neon serverless) with Drizzle ORM
- **AI Services:** VEO 3.1, OpenAI GPT-5, Google AI (IMAGEN 3.5)
- **Storage:** Cloudinary
- **Deployment:** Replit, VPS (Hostinger)

## Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment

```bash
cp .env.example .env
# Edit .env with your actual API keys and credentials
```

### 3. Setup Database

```bash
npm run db:push
```

### 4. Run Development Server

```bash
npm run dev
```

The application will be available at `http://localhost:5000`

## Utility Scripts

### Export Database
```bash
./scripts/export_database.sh
```

### Collect Logs
```bash
./scripts/collect_logs.sh
```

### Prepare for GitHub
```bash
./scripts/github_prepare.sh
```

See [scripts/README.md](./scripts/README.md) for more details.

## Deployment

- **Replit:** Use the configured workflow
- **VPS:** See [VPS_DEPLOYMENT_GUIDE.md](./VPS_DEPLOYMENT_GUIDE.md)

## License

Proprietary software. All rights reserved.
