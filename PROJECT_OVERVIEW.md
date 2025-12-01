# Recruitment Management System – Project Overview

---

## Table of Contents
1. [Project Vision & Goals](#project-vision--goals)
2. [High‑Level Architecture](#high‑level-architecture)
3. [Technology Stack](#technology-stack)
4. [Directory Structure & Naming Conventions](#directory-structure--naming-conventions)
5. [Core Modules & Their Responsibilities](#core-modules--their-responsibilities)
6. [User Roles & Permissions](#user-roles--permissions)
7. [Data Flow & Process Pipelines](#data-flow--process-pipelines)
8. [API Design & Contracts](#api-design--contracts)
9. [State Management & Client‑Side Architecture](#state-management--client‑side-architecture)
10. [Security, Authentication & Authorization](#security-authentication--authorization)
11. [Testing Strategy](#testing-strategy)
12. [CI/CD & Deployment Pipeline](#cicd--deployment-pipeline)
13. [Performance & Scalability Considerations](#performance--scalability-considerations)
14. [Future Enhancements & Roadmap](#future-enhancements--roadmap)
15. [Appendix – Glossary & Acronyms](#appendix--glossary--acronyms)
---

## 1. Project Vision & Goals
- **Vision**: Provide a seamless, end‑to‑end recruitment platform that empowers HR teams, interviewers, and candidates with an intuitive, secure, and highly performant experience.
- **Primary Goals**
  - Streamline job posting, applicant tracking, short‑listing, interview scheduling, and feedback collection.
  - Enforce role‑based access control (Admin, Interviewer, Candidate).
  - Deliver a modern UI that follows premium design standards (glass‑morphism, micro‑animations, dark‑mode support).
  - Ensure extensibility for future modules (e.g., analytics, AI‑driven candidate matching).
---

## 2. High‑Level Architecture
```
+-------------------+        +-------------------+        +-------------------+
|   Front‑End UI   | <----> |   Next.js Server  | <----> |   Database (SQL) |
+-------------------+        +-------------------+        +-------------------+
        ^   ^                         ^   ^
        |   |                         |   |
        |   +--- API Routes (REST)    |   +--- Auth Middleware
        |                             |
        +--- Static Assets (Images, Fonts, etc.)
```
- **Client**: React + TypeScript (Next.js) – server‑side rendering (SSR) for SEO‑critical pages, static generation (SSG) for public pages.
- **Server**: Next.js API routes act as thin controllers, delegating business logic to service layer.
- **Database**: PostgreSQL (via Prisma ORM) – stores users, jobs, applications, interview slots, feedback.
- **Auth**: NextAuth.js with JWT + session cookies, role‑based redirects.
---

## 3. Technology Stack
| Layer | Technology | Reasoning |
|------|------------|-----------|
| **Framework** | Next.js (v14) | Hybrid SSR/SSG, file‑based routing, API routes built‑in |
| **Language** | TypeScript | Strong typing, IDE assistance, reduces runtime errors |
| **Styling** | Vanilla CSS + CSS Modules (with design tokens) | Full control over premium UI, no Tailwind dependency |
| **State** | React Context + SWR (data fetching) | Simple, cache‑aware, works well with Next.js |
| **Database** | PostgreSQL + Prisma | Type‑safe ORM, migrations, easy scaling |
| **Auth** | NextAuth.js (Credentials + OAuth) | Proven, extensible, supports role‑based callbacks |
| **Testing** | Jest + React Testing Library | Unit & component testing |
| **CI/CD** | GitHub Actions | Automated lint, test, build, deploy |
---

## 4. Directory Structure & Naming Conventions
```
/v1
├─ app/                     # Next.js 13+ app router (pages & layouts)
│   ├─ admin/               # Admin‑only UI
│   │   ├─ jobs/            # CRUD for job postings
│   │   │   ├─ [id]/
│   │   │   │   ├─ page.tsx          # Job detail view
│   │   │   │   ├─ shortlist/
│   │   │   │   │   └─ page.tsx      # Short‑list management UI
│   │   │   └─ page.tsx              # List of jobs
│   │   ├─ users/            # Admin user management UI
│   │   │   └─ page.tsx
│   │   └─ layout.tsx        # Admin layout (sidebar, header)
│   ├─ interviewer/         # Interviewer UI (schedule, feedback)
│   ├─ candidate/           # Public candidate portal
│   │   ├─ profile/         # Public profile page
│   │   └─ apply/           # Application flow
│   ├─ api/                 # API routes (REST)
│   │   ├─ auth/            # login, logout, callbacks
│   │   ├─ jobs/            # CRUD endpoints
│   │   └─ ...
│   ├─ layout.tsx          # Root layout (global header/footer)
│   └─ page.tsx            # Landing / home page
├─ prisma/                  # Prisma schema & migrations
│   └─ schema.prisma
├─ public/                  # Static assets (images, fonts)
├─ styles/                  # Global CSS, design tokens
│   ├─ globals.css
│   └─ tokens.css          # Colors, spacing, typography
├─ utils/                   # Helper functions, API client wrappers
├─ lib/                     # Business logic services (jobService, userService)
├─ .env.example             # Environment variable template
├─ next.config.mjs          # Next.js configuration
├─ tsconfig.json
└─ README.md
```
- **Naming**: kebab‑case for folder names, PascalCase for React components, camelCase for functions & variables.
---

## 5. Core Modules & Their Responsibilities
| Module | Responsibility |
|--------|----------------|
| **Auth Middleware** | Verify JWT, attach `user` object to request, enforce role‑based redirects. |
| **Job Service** | CRUD operations, validation, publishing workflow, soft‑delete. |
| **Application Service** | Submit application, store resume, track status, trigger email notifications. |
| **Shortlist Service** | Allow admin to move candidates to shortlist, assign interviewers. |
| **Interview Scheduler** | Manage interview slots, calendar integration, conflict detection. |
| **Feedback Service** | Capture interviewer feedback, compute scores, store in DB. |
| **Notification Service** | Email & in‑app notifications (using SendGrid / nodemailer). |
| **UI Component Library** | Reusable components (Button, Card, Modal, Table, Avatar) with premium styling. |
---

## 6. User Roles & Permissions
| Role | Description | Permissions |
|------|-------------|-------------|
| **Admin** | HR manager, full control over the system. | Create/Update/Delete jobs, manage users, view all applications, assign interviewers, access analytics. |
| **Interviewer** | Conduct interviews, provide feedback. | View assigned candidates, schedule interviews, submit feedback, view own interview calendar. |
| **Candidate** | Public user applying for jobs. | View public job listings, create/edit profile, submit applications, track application status. |
---

## 7. Data Flow & Process Pipelines
1. **User Authentication**
   - `/api/auth/login` → validates credentials → issues JWT → sets httpOnly cookie.
   - Middleware reads cookie, populates `req.user`.
2. **Job Posting (Admin)**
   - Admin UI → `POST /api/jobs` → Job Service validates → Prisma creates record → returns job ID.
3. **Application Submission (Candidate)**
   - Candidate UI → `POST /api/jobs/:id/apply` → stores resume (S3) → creates `Application` record → triggers email to admin.
4. **Shortlisting (Admin)**
   - Admin UI → `PATCH /api/applications/:id/shortlist` → updates status → assigns interviewer.
5. **Interview Scheduling (Interviewer)**
   - Interviewer UI → `POST /api/interviews` → checks slot availability → creates `Interview` record → sends calendar invite.
6. **Feedback Collection**
   - Interviewer UI → `POST /api/interviews/:id/feedback` → stores feedback → updates candidate score.
7. **Notification Flow**
   - After each state change, Notification Service publishes an event → email & in‑app notification.
---

## 8. API Design & Contracts
- **Versioning**: `/api/v1/...` (future‑proofing).
- **RESTful Resources**: `jobs`, `applications`, `users`, `interviews`, `feedback`.
- **Standard Responses**
  ```json
  {
    "success": true,
    "data": {...},
    "error": null
  }
  ```
- **Error Handling**: HTTP status codes + `{ "error": { "code": "VALIDATION_ERROR", "message": "..." } }`.
- **Rate Limiting**: Apply middleware (e.g., `express-rate-limit`) on auth endpoints.
---

## 9. State Management & Client‑Side Architecture
- **Global State**: `UserContext` (auth info, role).
- **Data Fetching**: `swr` for GET endpoints – auto‑revalidation, caching.
- **Mutations**: Custom hooks (`useCreateJob`, `useApplyJob`) that call API and optimistically update SWR cache.
- **Form Management**: `react-hook-form` for validation, integrated with UI components.
- **Error Boundaries**: Top‑level error UI for unexpected failures.
---

## 10. Security, Authentication & Authorization
- **Password Storage**: bcrypt hashing.
- **JWT**: Short‑lived access token (15 min) + refresh token (7 days) stored httpOnly.
- **CSRF Protection**: SameSite=`Strict` cookies, double‑submit token for state‑changing requests.
- **Input Validation**: Zod schemas on both client & server.
- **Role‑Based Access Control**: Middleware checks `req.user.role` against route whitelist.
- **Audit Logging**: Critical actions (job delete, user role change) logged to `audit_logs` table.
---

## 11. Testing Strategy
- **Unit Tests**: Jest for pure functions (services, utils).
- **Component Tests**: React Testing Library – snapshot & interaction tests.
- **Integration Tests**: Supertest against API routes (in‑memory DB via SQLite).
- **E2E Tests**: Playwright – login flows, job creation, application submission.
- **Coverage Goal**: ≥ 80 % code coverage.
---

## 12. CI/CD & Deployment Pipeline
1. **GitHub Actions Workflow** (`ci.yml`)
   - `npm ci`
   - Lint (`eslint`) & format (`prettier`)
   - Run unit & integration tests
   - Build (`npm run build`)
   - Deploy to Vercel (or Azure Static Web Apps) on `main` merge.
2. **Environment Variables**
   - Stored in Vercel dashboard, never committed.
3. **Rollback**: Vercel preview deployments enable instant rollback.
---

## 13. Performance & Scalability Considerations
- **SSR Caching**: Cache public pages (job listings) with `Cache-Control` headers.
- **Database Indexes**: `jobs.id`, `applications.jobId`, `users.email`.
- **Pagination**: Server‑side pagination for large lists (applications, candidates).
- **Static Assets**: Served via CDN (Vercel Edge Network).
- **Horizontal Scaling**: Stateless API – can be scaled behind load balancer.
---

## 14. Future Enhancements & Roadmap
| Milestone | Features |
|-----------|----------|
| **v2.0** | AI‑driven resume parsing, candidate‑job matching scores. |
| **v2.1** | Multi‑tenant SaaS mode (multiple companies on same platform). |
| **v2.2** | Advanced analytics dashboard (KPIs, funnel visualization). |
| **v3.0** | Mobile‑first PWA with offline support for interviewers. |
---

## 15. Appendix – Glossary & Acronyms
- **SSR** – Server‑Side Rendering
- **SSG** – Static Site Generation
- **JWT** – JSON Web Token
- **CRUD** – Create, Read, Update, Delete
- **SWR** – Stale‑While‑Revalidate data fetching library
- **PWA** – Progressive Web App
- **CI/CD** – Continuous Integration / Continuous Deployment

---

*Document generated on 2025‑12‑01 by Antigravity – your AI‑powered development assistant.*
