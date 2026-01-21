# Recruitment Management System - Technical Documentation

## Table of Contents
1. [Project Overview](#project-overview)
2. [System Requirements](#system-requirements)
3. [Node.js Version](#nodejs-version)
4. [Environment Variables](#environment-variables)
5. [Setup Instructions](#setup-instructions)
6. [GitHub Actions CI/CD Pipeline](#github-actions-cicd-pipeline)
7. [Project Folder Structure](#project-folder-structure)
8. [Database Architecture](#database-architecture)
9. [Technical Stack & Dependencies](#technical-stack--dependencies)
10. [Technical Terms & Knowledge Transfer](#technical-terms--knowledge-transfer)
11. [Development Workflow](#development-workflow)
12. [Deployment Guide](#deployment-guide)
13. [Troubleshooting](#troubleshooting)

---

## Project Overview

The **Recruitment Management System** is a comprehensive, enterprise-grade Applicant Tracking System (ATS) built with Next.js 14. It manages the complete recruitment lifecycle from job posting to offer letter generation, supporting three distinct user roles: Admin, Interviewer, and Candidate.

### Key Features
- **Multi-role Authentication**: Admin, Interviewer, and Candidate roles with role-based access control
- **Job Management**: Create, edit, and manage job postings with custom workflows
- **Application Tracking**: Complete pipeline management from application to offer
- **Interview Scheduling**: Slot-based interview booking system
- **Batch Processing**: Bulk hiring support with batch evaluation
- **Workflow Engine**: Customizable multi-stage recruitment workflows
- **Document Generation**: Automated LOI (Letter of Intent) and Offer Letter generation
- **Email Notifications**: Automated email system for all stakeholders
- **Real-time Dashboard**: Analytics and metrics for admins and interviewers

---

## System Requirements

### Minimum Requirements
- **Node.js**: 22.19.0 (exact version required)
- **PostgreSQL**: 12.0 or higher
- **npm**: 9.0.0 or higher (or yarn/pnpm equivalent)
- **Operating System**: Windows 10+, macOS 10.15+, or Linux (Ubuntu 20.04+)

### Recommended Requirements
- **Node.js**: 22.19.0 (LTS)
- **PostgreSQL**: 14.0 or higher
- **RAM**: 8GB minimum, 16GB recommended
- **Disk Space**: 2GB for dependencies, additional space for uploads
- **CPU**: Multi-core processor recommended for development

---

## Node.js Version

### Required Version
**Node.js 22.19.0** (exact version)

This version is specified in the GitHub Actions workflow and should be used consistently across all environments (development, staging, production).

### Why This Version?
- Compatibility with Next.js 14.2.18
- Support for latest TypeScript features
- Performance optimizations
- Security patches included

### Installing Node.js 22.19.0

#### Using nvm (Node Version Manager) - Recommended
```bash
# Install nvm (if not already installed)
# Windows: Download from https://github.com/coreybutler/nvm-windows/releases
# macOS/Linux: curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash

# Install and use Node.js 22.19.0
nvm install 22.19.0
nvm use 22.19.0

# Verify installation
node -v  # Should output: v22.19.0
npm -v   # Should output: 10.x.x or higher
```

#### Direct Installation
Download from [Node.js official website](https://nodejs.org/) and install version 22.19.0.

### Verifying Installation
```bash
node -v    # Must output: v22.19.0
npm -v     # Should output: 10.x.x or higher
```

---

## Environment Variables

### Required Environment Variables

All environment variables must be set before running the application. Create a `.env` file in the root directory.

#### Database Configuration
```env
# PostgreSQL Connection String (Required)
DATABASE_URL="postgresql://username:password@localhost:5432/recruitment_db?schema=public"

# Direct Database URL for migrations (Required)
DIRECT_URL="postgresql://username:password@localhost:5432/recruitment_db?schema=public"
```

#### Authentication & Security
```env
# NextAuth Secret (Required) - Generate with: openssl rand -base64 32
NEXTAUTH_SECRET="your-super-secret-key-change-this-in-production"

# Application URL (Required)
NEXTAUTH_URL="http://localhost:3001"

# JWT Configuration (Optional - has defaults)
JWT_SECRET="your-jwt-secret-key"
JWT_EXPIRES_IN="24h"
SESSION_MAX_AGE="86400"
```

#### Application Configuration
```env
# Node Environment (Required)
NODE_ENV="development"  # or "production"

# Application Port (Optional - defaults to 3001)
PORT="3001"

# Application URL (Required for production)
APP_URL="http://localhost:3001"
```

#### File Upload Configuration
```env
# Maximum file size in bytes (e.g., 5MB = 5242880)
MAX_FILE_SIZE="5242880"

# Allowed file types (comma-separated)
ALLOWED_FILE_TYPES="pdf,doc,docx,jpg,jpeg,png"

# Upload directory path
UPLOAD_DIR="./uploads"

# CV Storage Path
CV_STORAGE_PATH="./public/uploads/cv"

# Gallery Storage Path
GALLERY_STORAGE_PATH="./public/uploads/gallery"
```

#### Email Configuration (SMTP)
```env
# SMTP Server Configuration
SMTP_HOST="smtp.gmail.com"
SMTP_PORT="587"
SMTP_SECURE="false"  # true for port 465, false for 587/25
SMTP_USER="your-email@gmail.com"
SMTP_PASS="your-app-password"
SMTP_FROM="noreply@yourcompany.com"
```

#### Cron Jobs (Optional)
```env
# Secret for cron job authentication
CRON_SECRET="your-cron-secret-key"
```

### Environment Variable Descriptions

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `DATABASE_URL` | ✅ Yes | PostgreSQL connection string | `postgresql://user:pass@localhost:5432/db` |
| `DIRECT_URL` | ✅ Yes | Direct DB connection for migrations | `postgresql://user:pass@localhost:5432/db` |
| `NEXTAUTH_SECRET` | ✅ Yes | Secret for JWT signing | Generate with `openssl rand -base64 32` |
| `NEXTAUTH_URL` | ✅ Yes | Base URL of the application | `http://localhost:3001` |
| `NODE_ENV` | ✅ Yes | Environment mode | `development` or `production` |
| `SMTP_HOST` | ⚠️ Conditional | SMTP server hostname | `smtp.gmail.com` |
| `SMTP_PORT` | ⚠️ Conditional | SMTP server port | `587` |
| `SMTP_USER` | ⚠️ Conditional | SMTP username | `your-email@gmail.com` |
| `SMTP_PASS` | ⚠️ Conditional | SMTP password/app password | `your-app-password` |
| `SMTP_FROM` | ⚠️ Conditional | Default sender email | `noreply@company.com` |
| `MAX_FILE_SIZE` | ❌ No | Max upload size in bytes | `5242880` (5MB) |
| `ALLOWED_FILE_TYPES` | ❌ No | Allowed file extensions | `pdf,doc,docx` |
| `PORT` | ❌ No | Server port | `3001` |
| `APP_URL` | ⚠️ Production | Full application URL | `https://yourdomain.com` |
| `CRON_SECRET` | ❌ No | Secret for cron endpoints | Random string |

### Generating Secure Secrets

```bash
# Generate NEXTAUTH_SECRET
openssl rand -base64 32

# Generate JWT_SECRET
openssl rand -base64 32

# Generate CRON_SECRET
openssl rand -base64 32
```

### Environment File Template

Create a `.env.example` file (already in `.gitignore`):

```env
# Database
DATABASE_URL="postgresql://username:password@localhost:5432/recruitment_db?schema=public"
DIRECT_URL="postgresql://username:password@localhost:5432/recruitment_db?schema=public"

# Authentication
NEXTAUTH_SECRET="generate-with-openssl-rand-base64-32"
NEXTAUTH_URL="http://localhost:3001"
JWT_SECRET="generate-with-openssl-rand-base64-32"
JWT_EXPIRES_IN="24h"
SESSION_MAX_AGE="86400"

# Application
NODE_ENV="development"
PORT="3001"
APP_URL="http://localhost:3001"

# File Uploads
MAX_FILE_SIZE="5242880"
ALLOWED_FILE_TYPES="pdf,doc,docx,jpg,jpeg,png"
UPLOAD_DIR="./uploads"
CV_STORAGE_PATH="./public/uploads/cv"
GALLERY_STORAGE_PATH="./public/uploads/gallery"

# Email (SMTP)
SMTP_HOST="smtp.gmail.com"
SMTP_PORT="587"
SMTP_SECURE="false"
SMTP_USER="your-email@gmail.com"
SMTP_PASS="your-app-password"
SMTP_FROM="noreply@yourcompany.com"

# Cron Jobs
CRON_SECRET="generate-with-openssl-rand-base64-32"
```

---

## Setup Instructions

### Step 1: Prerequisites Installation

1. **Install Node.js 22.19.0** (see [Node.js Version](#nodejs-version) section)
2. **Install PostgreSQL**
   - Download from [PostgreSQL official website](https://www.postgresql.org/download/)
   - Create a database named `recruitment_db` (or your preferred name)
   - Note down username, password, and port (default: 5432)

### Step 2: Clone Repository

```bash
git clone <repository-url>
cd "Recruitment Management System/v1"
```

### Step 3: Install Dependencies

```bash
# Install all npm packages
npm install

# This will automatically run 'prisma generate' via postinstall script
```

### Step 4: Configure Environment Variables

1. Create `.env` file in the root directory:
   ```bash
   cp .env.example .env  # If .env.example exists
   # OR create manually
   touch .env
   ```

2. Edit `.env` file with your configuration:
   - Update `DATABASE_URL` with your PostgreSQL credentials
   - Generate and set `NEXTAUTH_SECRET`
   - Configure SMTP settings if email functionality is needed
   - Set other required variables

### Step 5: Database Setup

```bash
# Generate Prisma Client (if not done automatically)
npx prisma generate

# Push schema to database (creates tables)
npx prisma db push

# OR use migrations (recommended for production)
npx prisma migrate dev --name init

# (Optional) Seed database with initial data
npm run seed
```

### Step 6: Verify Database Connection

```bash
# Open Prisma Studio to view database
npx prisma studio

# This opens a browser at http://localhost:5555
```

### Step 7: Run Development Server

```bash
# Start development server
npm run dev

# Server will start at http://localhost:3001
```

### Step 8: Access Application

- **Frontend**: http://localhost:3001
- **Admin Login**: http://localhost:3001/admin/login
- **Interviewer Login**: http://localhost:3001/interviewer/login
- **Candidate Login**: http://localhost:3001/login

### Step 9: Create Initial Admin User

You can create an admin user through:
1. Registration API endpoint: `POST /api/register` (if enabled)
2. Direct database insertion via Prisma Studio
3. Seed script (if configured)

---

## GitHub Actions CI/CD Pipeline

### Pipeline Overview

The project uses GitHub Actions for continuous integration and deployment. The workflow is defined in `.github/workflows/node.js.yml`.

### Workflow Configuration

```yaml
name: ATS CI CD

on:
  push:
    branches: [ "main" ]
  pull_request:
    branches: [ "main" ]

jobs:
  build:
    runs-on: self-hosted
    environment: production
    strategy:
      matrix:
        node-version: [22.19.0]
```

### Pipeline Steps

1. **Checkout Code**
   - Checks out the repository code

2. **Setup Node.js**
   - Installs Node.js 22.19.0
   - Configures npm cache

3. **Create Environment File**
   - Creates `.env` file from GitHub Secrets
   - Maps all required environment variables

4. **Install Dependencies**
   - Runs `npm i --force`
   - Installs all project dependencies

5. **Build Application**
   - Runs `npm run build`
   - Compiles Next.js application

6. **Restart Production Server**
   - Restarts PM2 process (production server)

### Required GitHub Secrets

Configure these secrets in GitHub Repository Settings → Secrets and variables → Actions:

| Secret Name | Description |
|-------------|-------------|
| `DATABASE_URL` | PostgreSQL connection string |
| `DIRECT_URL` | Direct database URL |
| `NEXTAUTH_SECRET` | NextAuth secret key |
| `NEXTAUTH_URL` | Production application URL |
| `NODE_ENV` | Environment (production) |
| `PORT` | Server port |
| `APP_URL` | Full application URL |
| `MAX_FILE_SIZE` | Max file upload size |
| `ALLOWED_FILE_TYPES` | Allowed file types |
| `UPLOAD_DIR` | Upload directory path |
| `CV_STORAGE_PATH` | CV storage path |
| `GALLERY_STORAGE_PATH` | Gallery storage path |
| `JWT_SECRET` | JWT signing secret |
| `JWT_EXPIRES_IN` | JWT expiration time |
| `SESSION_MAX_AGE` | Session max age |
| `SMTP_HOST` | SMTP server host |
| `SMTP_PORT` | SMTP server port |
| `SMTP_SECURE` | SMTP secure flag |
| `SMTP_USER` | SMTP username |
| `SMTP_PASS` | SMTP password |
| `SMTP_FROM` | SMTP from address |

### Setting Up GitHub Secrets

1. Go to your GitHub repository
2. Navigate to **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret**
4. Add each secret with its corresponding value
5. Save the secret

### Self-Hosted Runner Setup

The workflow uses a `self-hosted` runner. To set up:

1. **Install GitHub Actions Runner** on your server
2. **Configure the runner** with your repository
3. **Ensure Node.js 22.19.0** is installed on the runner
4. **Install PM2** globally: `npm install -g pm2`
5. **Configure PM2** with `ecosystem.config.js`

### PM2 Configuration

The project includes `ecosystem.config.js` for PM2:

```javascript
module.exports = {
    apps: [{
        name: "ATS",
        script: "npm",
        args: "start",
        cwd: "/path/to/project",
        instances: "max",
        exec_mode: "cluster",
        env: {
            NODE_ENV: "production",
        },
    }],
};
```

### Manual Deployment (Alternative)

If not using GitHub Actions:

```bash
# On production server
git pull origin main
npm install
npm run build
pm2 restart ATS
```

---

## Project Folder Structure

```
Recruitment Management System/
└── v1/
    ├── .github/
    │   └── workflows/
    │       └── node.js.yml          # GitHub Actions CI/CD
    ├── app/                          # Next.js App Router
    │   ├── admin/                    # Admin dashboard pages
    │   │   ├── applications/         # Application management
    │   │   ├── candidates/          # Candidate management
    │   │   │   └── [id]/            # Dynamic candidate detail
    │   │   ├── dashboard/           # Admin dashboard
    │   │   ├── interviewers/        # Interviewer management
    │   │   ├── jobs/                # Job management
    │   │   │   ├── [id]/            # Job detail & editing
    │   │   │   │   ├── edit/        # Edit job page
    │   │   │   │   ├── rounds/      # Interview rounds
    │   │   │   │   │   └── [roundId]/
    │   │   │   │   │       ├── applied/      # Applied candidates
    │   │   │   │   │       ├── candidates/   # Candidate evaluations
    │   │   │   │   │       ├── offers/       # Offer management
    │   │   │   │   │       ├── results/      # Round results
    │   │   │   │   │       ├── shortlisted/  # Shortlisted candidates
    │   │   │   │   │       └── slots/       # Interview slots
    │   │   │   │   └── shortlist/          # Shortlist management
    │   │   │   ├── create/          # Create new job
    │   │   │   └── page.tsx         # Jobs list
    │   │   ├── login/                # Admin login
    │   │   ├── settings/            # System settings
    │   │   ├── users/               # User management
    │   │   ├── workflows/            # Workflow management
    │   │   └── layout.tsx           # Admin layout
    │   ├── api/                      # API Routes
    │   │   ├── admin/                # Admin API endpoints
    │   │   │   ├── applications/    # Application APIs
    │   │   │   ├── batches/         # Batch management APIs
    │   │   │   ├── calendar/        # Calendar APIs
    │   │   │   ├── candidates/      # Candidate APIs
    │   │   │   ├── dashboard/       # Dashboard APIs
    │   │   │   ├── interviewers/    # Interviewer APIs
    │   │   │   ├── jobs/            # Job management APIs
    │   │   │   ├── organization/    # Organization APIs
    │   │   │   ├── pipelines/      # Pipeline APIs
    │   │   │   ├── search/         # Search APIs
    │   │   │   ├── users/          # User management APIs
    │   │   │   ├── workflows/     # Workflow APIs
    │   │   │   └── workflow-steps/ # Workflow step APIs
    │   │   ├── applications/        # Application APIs
    │   │   ├── auth/                # Authentication APIs
    │   │   │   ├── [...nextauth]/  # NextAuth handler
    │   │   │   ├── forgot-password/ # Password reset
    │   │   │   ├── reset-password/  # Reset password
    │   │   │   └── validate-reset-token/ # Token validation
    │   │   ├── candidate/           # Candidate APIs
    │   │   │   ├── batches/         # Batch APIs
    │   │   │   ├── bookings/        # Booking APIs
    │   │   │   ├── loi/            # Letter of Intent APIs
    │   │   │   ├── offer/          # Offer letter APIs
    │   │   │   ├── pipelines/     # Pipeline APIs
    │   │   │   ├── profile/       # Profile APIs
    │   │   │   └── slots/         # Slot booking APIs
    │   │   ├── company/            # Company APIs
    │   │   ├── cron/               # Cron job APIs
    │   │   │   └── job-status-check/ # Job status monitoring
    │   │   ├── interviewer/        # Interviewer APIs
    │   │   │   ├── assignments/    # Assignment APIs
    │   │   │   ├── batches/        # Batch APIs
    │   │   │   ├── calendar/      # Calendar APIs
    │   │   │   ├── dashboard/     # Dashboard APIs
    │   │   │   ├── pipelines/     # Pipeline APIs
    │   │   │   └── slots/         # Slot management APIs
    │   │   ├── interviews/        # Interview APIs
    │   │   ├── jobs/               # Public job APIs
    │   │   ├── notifications/      # Notification APIs
    │   │   ├── organization/       # Organization APIs
    │   │   ├── profile/            # Profile APIs
    │   │   │   ├── cv/            # CV management
    │   │   │   ├── education/     # Education APIs
    │   │   │   ├── experience/   # Experience APIs
    │   │   │   └── skills/        # Skills APIs
    │   │   ├── register/          # Registration API
    │   │   └── upload/             # File upload APIs
    │   │       └── avatar/        # Avatar upload
    │   ├── applications/           # Application pages
    │   │   └── [id]/              # Application detail
    │   ├── candidate/              # Candidate pages
    │   │   └── profile/            # Candidate profile
    │   │       ├── edit/          # Edit profile
    │   │       └── public/       # Public profile
    │   ├── forgot-password/       # Password reset page
    │   ├── interviewer/           # Interviewer pages
    │   │   ├── assignments/       # Assignment management
    │   │   ├── batches/           # Batch management
    │   │   ├── calendar/         # Interview calendar
    │   │   ├── dashboard/        # Interviewer dashboard
    │   │   ├── login/            # Interviewer login
    │   │   └── layout.tsx        # Interviewer layout
    │   ├── jobs/                  # Public job pages
    │   │   ├── [id]/             # Job detail
    │   │   │   └── apply/        # Application form
    │   │   └── page.tsx          # Jobs listing
    │   ├── login/                # Candidate login
    │   ├── profile/              # Profile pages
    │   │   └── interviews/      # Interview booking
    │   ├── register/            # Registration page
    │   │   └── components/      # Registration components
    │   ├── reset-password/      # Reset password page
    │   ├── unauthorized/        # Unauthorized page
    │   ├── uploads/            # Upload serving
    │   ├── layout.tsx          # Root layout
    │   ├── page.tsx            # Home page
    │   ├── globals.css          # Global styles
    │   ├── loading.tsx          # Loading component
    │   └── providers.tsx        # Context providers
    ├── components/               # React components
    │   ├── admin/               # Admin-specific components
    │   │   ├── AdminLayout.tsx  # Admin layout component
    │   │   ├── AdminSearchBar.tsx # Search bar
    │   │   ├── Calendar.tsx    # Calendar component
    │   │   ├── Sidebar.tsx      # Admin sidebar
    │   │   └── Topbar.tsx       # Admin topbar
    │   ├── interviewer/         # Interviewer components
    │   │   ├── InterviewerSidebar.tsx
    │   │   ├── InterviewerTopbar.tsx
    │   │   └── NotificationDropdown.tsx
    │   ├── ui/                  # Reusable UI components
    │   │   ├── avatar.tsx       # Avatar component
    │   │   ├── badge.tsx        # Badge component
    │   │   ├── button.tsx       # Button component
    │   │   ├── card.tsx         # Card component
    │   │   ├── data-table.tsx   # Data table component
    │   │   ├── dialog.tsx       # Dialog/modal component
    │   │   ├── dropdown-menu.tsx # Dropdown menu
    │   │   ├── input.tsx        # Input component
    │   │   ├── label.tsx        # Label component
    │   │   ├── mode-toggle.tsx  # Theme toggle
    │   │   ├── modern-styles.ts # Modern styling
    │   │   ├── select.tsx       # Select component
    │   │   └── textarea.tsx     # Textarea component
    │   ├── InterviewTimer.tsx   # Interview timer
    │   ├── JobApplicationSuccess.tsx # Success message
    │   ├── JobCardSkeleton.tsx  # Loading skeleton
    │   ├── JobDetails.tsx       # Job details component
    │   ├── JobsLandingHero.tsx  # Hero section
    │   ├── JobsList.tsx         # Jobs list component
    │   ├── Navbar.tsx           # Navigation bar
    │   ├── ProfileForm.tsx      # Profile form
    │   ├── PublicJobCard.tsx    # Public job card
    │   ├── ReviewForm.tsx       # Review form
    │   ├── SlotCreator.tsx      # Slot creation
    │   └── TextEditor.tsx       # Rich text editor
    ├── config/                  # Configuration files
    │   └── company.json         # Company information
    ├── lib/                     # Library/utility functions
    │   ├── api-client.ts        # API client utilities
    │   ├── auth.ts              # NextAuth configuration
    │   ├── constants/           # Constants
    │   │   └── focus-group-behaviors.ts
    │   ├── email.ts             # Email service
    │   ├── loi-template-generator.ts # LOI generator
    │   ├── middleware/          # Middleware utilities
    │   │   └── job-status-check.ts
    │   ├── notifications.ts     # Notification service
    │   ├── offer-template-generator.ts # Offer generator
    │   ├── pdf-generator.ts     # PDF generation
    │   ├── pipeline-helpers.ts  # Pipeline utilities
    │   ├── pipeline-metrics.ts  # Pipeline metrics
    │   ├── prisma.ts            # Prisma client
    │   ├── rate-limit.ts        # Rate limiting
    │   ├── rbac.ts              # Role-based access control
    │   ├── services/            # Business logic services
    │   │   ├── batch-service.ts  # Batch service
    │   │   ├── bulk-hiring-service.ts # Bulk hiring
    │   │   ├── job-status-monitor.ts # Job monitoring
    │   │   └── pipeline-service.ts # Pipeline service
    │   ├── templates/           # Email/PDF templates
    │   │   ├── loi-template.tsx # LOI template
    │   │   └── offer-letter-template.tsx # Offer template
    │   ├── timezone.ts          # Timezone utilities
    │   ├── toast.ts             # Toast notifications
    │   ├── utils.ts             # General utilities
    │   ├── validations.ts       # Validation schemas
    │   └── workers/             # Background workers
    │       └── job-status-worker.ts
    ├── prisma/                  # Prisma configuration
    │   ├── schema.prisma        # Database schema
    │   └── seed.ts              # Database seed script
    ├── public/                  # Static assets
    │   ├── ats_banner.png       # Banner image
    │   ├── banner.png           # Banner
    │   ├── loading.svg          # Loading icon
    │   └── uploads/             # User uploads
    │       ├── avatars/         # User avatars
    │       └── organization/    # Organization logos
    ├── store/                   # State management (Zustand)
    │   ├── useAppStore.ts       # App-wide store
    │   ├── useDashboardStore.ts # Dashboard store
    │   └── useJobsStore.ts      # Jobs store
    ├── types/                   # TypeScript types
    │   └── next-auth.d.ts       # NextAuth type definitions
    ├── .env                     # Environment variables (gitignored)
    ├── .gitignore               # Git ignore rules
    ├── ecosystem.config.js      # PM2 configuration
    ├── middleware.ts            # Next.js middleware
    ├── next.config.js           # Next.js configuration
    ├── next-env.d.ts            # Next.js types
    ├── package.json             # Dependencies & scripts
    ├── package-lock.json        # Lock file
    ├── postcss.config.js        # PostCSS configuration
    ├── tailwind.config.ts       # Tailwind CSS configuration
    ├── tsconfig.json            # TypeScript configuration
    └── README.md                # Project README
```

### Key Directory Explanations

- **`app/`**: Next.js 14 App Router directory. Each folder represents a route.
- **`app/api/`**: API route handlers (REST endpoints)
- **`components/`**: Reusable React components
- **`lib/`**: Utility functions, services, and business logic
- **`prisma/`**: Database schema and migrations
- **`public/`**: Static files served directly
- **`store/`**: Zustand state management stores
- **`types/`**: TypeScript type definitions

---

## Database Architecture

### Database System
- **Database**: PostgreSQL
- **ORM**: Prisma 5.19.1
- **Connection**: Connection pooling via Prisma

### Schema Overview

The database schema is defined in `prisma/schema.prisma`. Key models include:

#### Core Models

1. **User Model**
   - Stores all users (Admin, Interviewer, Candidate)
   - Fields: id, role, email, password (hashed), profile data
   - Relations: educations, skills, experiences, applications

2. **Job Model**
   - Job postings and listings
   - Fields: jobCode, title, description, status, dates
   - Relations: applications, workflow, locations, skills

3. **JobsApplied Model**
   - Tracks job applications
   - Fields: jobId, userId, status, appliedAt
   - Relations: job, user, pipeline, batch

4. **CandidatePipeline Model**
   - Tracks candidate progress through recruitment stages
   - Fields: candidateId, jobId, currentStepOrder, overallStatus
   - Relations: candidate, job, application, steps

5. **WorkflowStep Model**
   - Defines recruitment workflow steps
   - Fields: stepName, stepType, stepOrder, isRequired
   - Relations: workflow, pipelineSteps, slots

6. **CandidatePipelineStep Model**
   - Instance of workflow step for a candidate
   - Fields: pipelineId, workflowStepId, status, interviewerId
   - Relations: pipeline, workflowStep, interviewer, evaluations

7. **InterviewSlot Model**
   - Available interview time slots
   - Fields: stepId, interviewerId, startsAt, endsAt, capacity
   - Relations: step, interviewer, bookings

8. **SlotBooking Model**
   - Candidate bookings for interview slots
   - Fields: slotId, candidateId, applicationId, status
   - Relations: slot, candidate, application

9. **Batch Model**
   - Batch hiring groups
   - Fields: jobId, workflowStepId, batchNumber, status
   - Relations: job, workflowStep, batchCandidates

10. **LetterOfIntent Model**
    - LOI documents
    - Fields: pipelineStepId, candidateId, status, formData
    - Relations: pipelineStep, candidate, job, offerLetter

11. **OfferLetter Model**
    - Offer letter documents
    - Fields: letterOfIntentId, candidateId, status, formData
    - Relations: letterOfIntent, pipelineStep, candidate, job

### Database Relationships

```
User
├── UserEducation (1:N)
├── UserSkills (1:N)
├── UserExperience (1:N)
├── UserProfileDetail (1:1)
├── UserJobPreference (1:1)
├── JobsApplied (1:N)
├── CandidatePipeline (1:N)
└── InterviewSlot (1:N) [as interviewer]

Job
├── JobWorkflow (1:1)
├── JobsApplied (1:N)
├── CandidatePipeline (1:N)
├── JobSkill (1:N)
├── JobLocation (1:N)
└── Batch (1:N)

JobWorkflow
└── WorkflowStep (1:N)

WorkflowStep
├── CandidatePipelineStep (1:N)
├── InterviewSlot (1:N)
└── Batch (1:N)

CandidatePipeline
├── CandidatePipelineStep (1:N)
└── Interview (1:N)

CandidatePipelineStep
├── StageEvaluation (1:N)
├── Interview (1:N)
├── LetterOfIntent (1:N)
└── OfferLetter (1:N)
```

### Enums

- **UserRole**: ADMIN, INTERVIEWER, CANDIDATE
- **UserStatus**: ACTIVE, INACTIVE, PENDING
- **JobType**: NORMAL, BULK
- **JobStatus**: ACTIVE, ADMIN_SHORTLISTING, CLOSED
- **EmploymentType**: Permanent, Part Time, Contract
- **ApplicationStatus**: APPLIED, BOOKMARKED, REMOVED, SUBMITTED, SHORTLISTED, BATCH_ASSIGNED
- **PipelineStatus**: IN_PROGRESS, COMPLETED, REJECTED, ON_HOLD
- **StepInstanceStatus**: PENDING, IN_PROGRESS, COMPLETED, SKIPPED, REJECTED
- **StepType**: TEST, SCREENING_INTERVIEW, FOCUS_GROUP, FINAL_INTERVIEW, OFFER
- **BatchStatus**: PENDING_ADMIN, IN_PROGRESS, COMPLETED, CANCELLED
- **LetterStatus**: DRAFTED, SENT, ACCEPTED, REJECTED, EXPIRED

### Database Indexes

Key indexes for performance:
- User: `role`, `userStatus`, `email` (unique), `username` (unique)
- Job: `jobCode` (unique), `status`, `jobStatus`, `createdBy`
- JobsApplied: `jobId`, `userId`, `batchId` (composite unique: jobId+userId)
- CandidatePipeline: `candidateId`, `jobId`, `overallStatus`
- InterviewSlot: `stepId`, `interviewerId`
- SlotBooking: `slotId`, `candidateId` (composite unique: slotId+candidateId)

### Database Migrations

```bash
# Create a new migration
npx prisma migrate dev --name migration_name

# Apply migrations in production
npx prisma migrate deploy

# Reset database (development only)
npx prisma migrate reset
```

### Database Seeding

```bash
# Run seed script
npm run seed

# Seed script location: prisma/seed.ts
```

---

## Technical Stack & Dependencies

### Core Framework
- **Next.js**: 14.2.18 (App Router)
- **React**: 18.3.1
- **TypeScript**: 5.6.3

### Backend & Database
- **Prisma**: 5.19.1 (ORM)
- **PostgreSQL**: Database (via Prisma adapter)
- **NextAuth**: 5.0.0-beta.25 (Authentication)

### UI & Styling
- **Tailwind CSS**: 3.4.14
- **Radix UI**: UI primitives (Avatar, Dialog, Dropdown, Select, etc.)
- **Lucide React**: 0.462.0 (Icons)
- **next-themes**: 0.4.6 (Dark mode)
- **recharts**: 3.6.0 (Charts)

### Form & Validation
- **Zod**: 3.23.8 (Schema validation)
- **Joi**: 18.0.2 (Additional validation)

### Rich Text & Documents
- **TipTap**: 3.9.1 (Rich text editor)
- **@react-pdf/renderer**: 3.4.4 (PDF generation)
- **Puppeteer**: 24.33.0 (PDF rendering)

### Utilities
- **bcryptjs**: 2.4.3 (Password hashing)
- **date-fns**: 4.1.0 (Date manipulation)
- **nodemailer**: 7.0.10 (Email sending)
- **zustand**: 5.0.8 (State management)
- **sonner**: 2.0.7 (Toast notifications)

### Development Tools
- **ESLint**: 8.57.1
- **TypeScript**: 5.6.3
- **tsx**: 4.21.0 (TypeScript execution)

### Key Dependencies Summary

| Package | Version | Purpose |
|---------|---------|---------|
| next | 14.2.18 | React framework |
| react | 18.3.1 | UI library |
| typescript | 5.6.3 | Type safety |
| prisma | 5.19.1 | Database ORM |
| @prisma/client | 5.19.1 | Prisma client |
| next-auth | 5.0.0-beta.25 | Authentication |
| tailwindcss | 3.4.14 | CSS framework |
| zod | 3.23.8 | Validation |
| bcryptjs | 2.4.3 | Password hashing |
| nodemailer | 7.0.10 | Email service |
| @tiptap/react | 3.9.1 | Rich text editor |
| @react-pdf/renderer | 3.4.4 | PDF generation |
| zustand | 5.0.8 | State management |

---

## Technical Terms & Knowledge Transfer

### For New Developers

This section explains key concepts, patterns, and technologies used in the project.

#### 1. Next.js App Router
- **Concept**: File-based routing system in Next.js 13+
- **Location**: `app/` directory
- **Pattern**: Each folder = route, `page.tsx` = page component, `layout.tsx` = layout wrapper
- **Example**: `app/admin/jobs/page.tsx` → `/admin/jobs` route

#### 2. Server Components vs Client Components
- **Server Components**: Default in App Router, run on server, no JavaScript sent to client
- **Client Components**: Marked with `"use client"`, run in browser, can use hooks
- **Usage**: Use Server Components for data fetching, Client Components for interactivity

#### 3. API Routes
- **Location**: `app/api/` directory
- **Pattern**: `route.ts` files export HTTP methods (GET, POST, PUT, DELETE)
- **Example**: `app/api/jobs/route.ts` → `/api/jobs` endpoint

#### 4. Prisma ORM
- **Purpose**: Type-safe database access
- **Schema**: Defined in `prisma/schema.prisma`
- **Client**: Generated via `npx prisma generate`
- **Usage**: Import `prisma` from `@/lib/prisma`

#### 5. NextAuth (Auth.js)
- **Purpose**: Authentication and session management
- **Configuration**: `lib/auth.ts`
- **Usage**: `auth()` function for server-side, `useSession()` hook for client-side
- **Session**: JWT-based, stored in HTTP-only cookies

#### 6. Role-Based Access Control (RBAC)
- **Implementation**: Middleware (`middleware.ts`) checks user roles
- **Roles**: ADMIN, INTERVIEWER, CANDIDATE
- **Pattern**: Route protection based on role in route config

#### 7. Zustand State Management
- **Purpose**: Lightweight state management
- **Location**: `store/` directory
- **Usage**: Create stores with `create()` function, use hooks in components

#### 8. Zod Validation
- **Purpose**: Runtime type validation
- **Usage**: Define schemas, validate data before database operations
- **Example**: `z.object({ email: z.string().email() })`

#### 9. Tailwind CSS
- **Purpose**: Utility-first CSS framework
- **Configuration**: `tailwind.config.ts`
- **Usage**: Apply classes directly in JSX

#### 10. TypeScript Patterns
- **Type Safety**: All functions, components, and data structures are typed
- **Interfaces**: Define data structures
- **Generics**: Used in Prisma queries and utility functions

#### 11. Pipeline System
- **Concept**: Multi-stage recruitment process
- **Flow**: Application → Pipeline → Pipeline Steps → Completion
- **Status Tracking**: Each step has status (PENDING, IN_PROGRESS, COMPLETED, etc.)

#### 12. Batch Processing
- **Purpose**: Handle bulk hiring scenarios
- **Flow**: Admin creates batch → Assigns candidates → Interviewer evaluates
- **Models**: Batch, BatchCandidate, BatchCandidateEvaluation

#### 13. Interview Slot System
- **Purpose**: Manage interviewer availability
- **Flow**: Interviewer creates slots → Candidates book → Interview conducted
- **Models**: InterviewSlot, SlotBooking

#### 14. Document Generation
- **LOI**: Letter of Intent (pre-offer)
- **Offer Letter**: Official job offer
- **Technology**: React PDF Renderer + Puppeteer
- **Templates**: `lib/templates/`

#### 15. Email System
- **Service**: Nodemailer
- **Configuration**: SMTP settings in `.env`
- **Templates**: HTML email templates in `lib/email.ts`
- **Usage**: Import functions like `sendEmail()`, `sendApplicationConfirmationEmail()`

#### 16. File Upload System
- **Storage**: Local filesystem (`public/uploads/`)
- **API**: `app/api/upload/` routes
- **Validation**: File size and type checks

#### 17. Middleware
- **Location**: `middleware.ts` (root)
- **Purpose**: Route protection, role checking, security headers
- **Execution**: Runs before page/API route handlers

#### 18. Environment Variables
- **File**: `.env` (not committed to git)
- **Access**: `process.env.VARIABLE_NAME`
- **Validation**: Checked at startup for required variables

#### 19. Database Migrations
- **Tool**: Prisma Migrate
- **Command**: `npx prisma migrate dev`
- **Purpose**: Version control for database schema

#### 20. PM2 Process Manager
- **Purpose**: Production process management
- **Config**: `ecosystem.config.js`
- **Usage**: `pm2 start ecosystem.config.js`, `pm2 restart ATS`

### Common Patterns

#### API Route Pattern
```typescript
import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  // Handle request
  return NextResponse.json({ data: result })
}
```

#### Prisma Query Pattern
```typescript
import { prisma } from "@/lib/prisma"

const users = await prisma.user.findMany({
  where: { role: "CANDIDATE" },
  include: { educations: true }
})
```

#### Form Validation Pattern
```typescript
import { z } from "zod"

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(8)
})

const result = schema.safeParse(data)
if (!result.success) {
  return { error: result.error }
}
```

#### Zustand Store Pattern
```typescript
import { create } from "zustand"

interface Store {
  count: number
  increment: () => void
}

export const useStore = create<Store>((set) => ({
  count: 0,
  increment: () => set((state) => ({ count: state.count + 1 }))
}))
```

---

## Development Workflow

### Daily Development

1. **Pull Latest Changes**
   ```bash
   git pull origin main
   ```

2. **Create Feature Branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

3. **Start Development Server**
   ```bash
   npm run dev
   ```

4. **Make Changes**
   - Edit files in `app/`, `components/`, `lib/`
   - Test in browser at http://localhost:3001

5. **Database Changes**
   ```bash
   # Edit prisma/schema.prisma
   npx prisma migrate dev --name your_migration_name
   npx prisma generate
   ```

6. **Commit Changes**
   ```bash
   git add .
   git commit -m "feat: your feature description"
   git push origin feature/your-feature-name
   ```

### Code Style

- **TypeScript**: Strict mode enabled
- **Naming**: 
  - Components: PascalCase (`UserProfile.tsx`)
  - Functions: camelCase (`getUserData()`)
  - Files: kebab-case for routes, PascalCase for components
- **Imports**: Absolute imports using `@/` alias
- **Formatting**: Use Prettier (if configured)

### Testing

```bash
# Run linter
npm run lint

# Type check
npx tsc --noEmit
```

### Database Management

```bash
# View database in browser
npx prisma studio

# Create migration
npx prisma migrate dev --name migration_name

# Reset database (development only - deletes all data!)
npx prisma migrate reset
```

---

## Deployment Guide

### Production Checklist

- [ ] Set all environment variables in production
- [ ] Use secure `NEXTAUTH_SECRET` (generate new)
- [ ] Configure production database
- [ ] Set `NODE_ENV=production`
- [ ] Configure SMTP for emails
- [ ] Set up file storage (local or cloud)
- [ ] Configure domain and SSL
- [ ] Set up monitoring/logging
- [ ] Configure backup strategy

### Build for Production

```bash
# Install dependencies
npm install --production

# Build application
npm run build

# Start production server
npm start
```

### PM2 Deployment

```bash
# Install PM2 globally
npm install -g pm2

# Start with PM2
pm2 start ecosystem.config.js

# View logs
pm2 logs ATS

# Restart
pm2 restart ATS

# Stop
pm2 stop ATS
```

### Environment-Specific Configuration

- **Development**: `.env` (local)
- **Staging**: `.env.staging` (if using)
- **Production**: Environment variables in hosting platform or `.env.production`

---

## Troubleshooting

### Common Issues

#### 1. Database Connection Error
```
Error: Can't reach database server
```
**Solution**: 
- Check `DATABASE_URL` in `.env`
- Verify PostgreSQL is running
- Check firewall/network settings

#### 2. Prisma Client Not Generated
```
Error: @prisma/client did not initialize yet
```
**Solution**:
```bash
npx prisma generate
```

#### 3. Authentication Not Working
```
Error: NEXTAUTH_SECRET is required
```
**Solution**: 
- Set `NEXTAUTH_SECRET` in `.env`
- Generate new secret: `openssl rand -base64 32`

#### 4. Port Already in Use
```
Error: Port 3001 is already in use
```
**Solution**:
- Change `PORT` in `.env`
- Or kill process using port 3001

#### 5. Build Errors
```
Error: Type errors found
```
**Solution**:
- Run `npx tsc --noEmit` to see errors
- Fix TypeScript errors
- Ensure all types are properly defined

#### 6. Email Not Sending
```
Email send error
```
**Solution**:
- Check SMTP configuration in `.env`
- Verify SMTP credentials
- Check firewall allows SMTP port
- In development, emails are logged to console if SMTP not configured

#### 7. File Upload Fails
```
Error: File too large
```
**Solution**:
- Check `MAX_FILE_SIZE` in `.env`
- Verify upload directory exists and is writable
- Check disk space

### Getting Help

1. **Check Logs**: 
   - Development: Console output
   - Production: `pm2 logs ATS`

2. **Database Issues**: 
   - Use `npx prisma studio` to inspect data
   - Check Prisma logs: `log: ["query", "error", "warn"]` in `lib/prisma.ts`

3. **Type Errors**: 
   - Run `npx tsc --noEmit`
   - Check `tsconfig.json` settings

4. **Build Issues**: 
   - Clear `.next` folder: `rm -rf .next`
   - Reinstall dependencies: `rm -rf node_modules && npm install`

---

## Additional Resources

### Documentation Links
- [Next.js Documentation](https://nextjs.org/docs)
- [Prisma Documentation](https://www.prisma.io/docs)
- [NextAuth Documentation](https://next-auth.js.org/)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [TypeScript Documentation](https://www.typescriptlang.org/docs)

### Project-Specific Files
- `README.md`: Basic project overview
- `PROJECT_OVERVIEW.md`: High-level architecture
- `prisma/schema.prisma`: Complete database schema
- `.github/workflows/node.js.yml`: CI/CD pipeline

---

## Conclusion

This technical documentation provides a comprehensive guide for setting up, developing, and deploying the Recruitment Management System. For specific questions or issues, refer to the troubleshooting section or consult the project's codebase and inline documentation.

**Last Updated**: 2024
**Maintained By**: Development Team

