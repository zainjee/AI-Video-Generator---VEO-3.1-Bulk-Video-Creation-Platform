# AI Video Generator

## Overview
This web application provides AI-powered video generation tools, featuring VEO 3.1 for single and batch video creation, OpenAI GPT-5 for script generation, and comprehensive video history tracking. It aims for a Disney Pixar-style 3D animation aesthetic, offering a complete video production suite with bulk processing capabilities. The project's ambition is to deliver a professional, intuitive platform for creating AI-generated video content.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend
-   **Framework**: React with TypeScript (Vite)
-   **UI**: Shadcn/ui (Radix UI, Tailwind CSS) with a professional dark navy theme, purple accents, glass-morphism effects, hover-lift interactions, and full mobile responsiveness.
-   **State Management**: TanStack Query for server state; React hooks for UI state.

### Backend
-   **Runtime**: Node.js with Express.js (TypeScript, ES modules)
-   **API**: RESTful, session-based authentication with Zod for validation.
-   **Server Organization**: Modular structure with dedicated modules for authentication, video generation, storage, and database.
-   **Monitoring**: Comprehensive logging, performance timing, and health check endpoints.

### Data Storage
-   **Database**: PostgreSQL with Drizzle ORM, utilizing Neon serverless for Replit and standard PostgreSQL for VPS. Includes connection pooling, retry logic with exponential backoff, and controlled concurrency limits for bulk processing.
-   **Schema**: Drizzle ORM for Users, API Tokens, Token Settings, and Video History.
-   **Authentication**: Session-based with bcrypt password hashing and role-based access control.
-   **User Management**: Admin panel for user oversight, plan management (Free, Scale, Empire), and API token rotation/tracking.
-   **Plan System**: Enforces access to tools, daily video limits, and expiry based on Free, Scale, and Empire tiers.

### UI/UX Decisions
-   **Design System**: Dark navy theme with purple accents, CSS gradients, icons, animations, glass-morphism, and mobile responsiveness.
-   **Dashboard**: Tool selector for VEO 3.1, Bulk Video Generator, Text to Image, Image to Video, Script Creator, and Video History, alongside plan information.
-   **Tool Pages**: Dedicated pages for each AI tool, including Script Creator (OpenAI GPT-5), Text to Image (Google AI Sandbox Whisk API), Image to Video (VEO 3.1), and Video History with merging capabilities.

### Technical Implementations
-   **AI Integration**: OpenAI GPT-5 for script generation and Google AI Sandbox Whisk API (IMAGEN_3_5) for text-to-image.
-   **Video Generation**: VEO 3.1 API with "Disney Pixar-style 3D animation" prefixing, supporting 16:9 and 9:16 formats. Features sequential processing with Server-Sent Events (SSE), automatic prompt cleaning, token rotation, and retry mechanisms. Image-to-video uses a 3-step process involving image upload, video generation with reference image, and polling.
-   **Bulk Generation**: Backend queue system with configurable batch processing, batch-based token rotation, and background processing. Includes centralized polling coordinator, Undici Agent for API calls, database-backed token rotation with row-level locking, and automatic retry system for failed videos.
-   **Plan Enforcement**: API-level access control based on plan expiry, daily video limits, and tool access.
-   **Status Polling**: 15-second polling intervals for all video generation status checks to optimize server load.
-   **Video Merging**: Local FFmpeg processing or fal.ai FFmpeg API for merging user-selected videos, with migration from Google Cloud Storage to Cloudinary.
-   **Network Reliability**: Automatic retry logic with exponential backoff for Cloudinary operations and external API calls.

## External Dependencies

-   **AI Services**: OpenAI GPT-5, Google AI Sandbox Whisk API (IMAGEN_3_5)
-   **Video Generation**: VEO 3.1 API
-   **Database**: Neon PostgreSQL
-   **ORM**: Drizzle ORM
-   **Video Storage**: Cloudinary (for individual and merged videos), Replit Object Storage (for temporary merged videos)
-   **Video Merging**: fal.ai API
-   **System Dependency**: FFmpeg (for local video processing)