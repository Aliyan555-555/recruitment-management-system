# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev            # Start dev server (http://localhost:3001 per README; port may vary)
npm run build           # Production build (Next.js 14 App Router, output: 'standalone')
npm start                # Run production build
npm run lint             # next lint (NOTE: build ignores lint errors — next.config.js sets eslint.ignoreDuringBuilds: true)
npm test                  # Runs tsx --test lib/**/*.test.ts (covers lib/assessments/* and lib/ai-shortlist/*)
npx tsx --test lib/assessments/scoring.test.ts   # Run a single test file directly
npm run seed               # Seed the database via prisma/seed.ts
npx prisma studio           # Browse the database
npx prisma generate          # Regenerate Prisma Client after editing schema.prisma (also runs on postinstall)
npx prisma migrate dev --name <name>   # Create/apply a migration
npx prisma db push            # Push schema changes without a migration (dev only)
```

TypeScript build errors DO fail `next build` (`typescript.ignoreBuildErrors: false`); ESLint errors do not.

## Architecture

Next.js 14 App Router recruitment/ATS platform with three role-scoped surfaces (`ADMIN`, `INTERVIEWER`, `CANDIDATE`) sharing one Postgres database via Prisma.

### Auth & route protection (two independent layers — keep both in sync)

- **NextAuth v5** (`lib/auth.ts`) — Credentials provider, JWT session strategy, 24h expiry. `authorize()` checks `deletedAt`/`suspended` before allowing login and stamps `lastLogin`/`currentLogin`/`lastAccess`. The JWT/session callbacks propagate `id`, `username`, `role`, `avatar` onto `session.user` (see `types/next-auth.d.ts` for the augmented types).
- **`middleware.ts`** — a hand-rolled `PROTECTED_ROUTES` table (regex pattern → allowed roles → redirect target) gates every non-API, non-static route by reading the JWT via `getToken`. It tries multiple Auth.js cookie name variants (`authjs.session-token`, `__Secure-...`, legacy `next-auth.session-token`) because cookie naming differs between dev/prod and Auth.js versions. Set `MIDDLEWARE_DEBUG=true` (or `NODE_ENV=development`) to get verbose per-request logs.
- **`lib/rbac.ts`** — server-side helpers (`requireAdmin`, `requireStaff`, `requireRole`, etc.) for use inside API routes/Server Components. Route middleware controls page-level navigation; RBAC helpers are the actual authorization check API handlers must call — middleware alone does not protect `/api/*` (middleware explicitly skips `/api/auth` and generally lets other API routes pass through undefended by the route table above).
- Roles are `ADMIN | INTERVIEWER | CANDIDATE` (`UserRole` enum in `prisma/schema.prisma`), duplicated as a local enum/type in both `middleware.ts` and `lib/rbac.ts` — update all three places together if roles ever change.

### Data model (`prisma/schema.prisma`, ~50 models)

Three broad domains:
1. **User/profile** — `User`, `UserEducation`, `UserSkills`, `UserExperience`, `UserProfileDetail`, `UserJobPreference`, `SkillAssessment`/`AssessmentQuestion`/`AssessmentAnswer` (AI-generated skill tests, scored via `lib/assessments/`).
2. **Jobs & applications** — `Job`, `JobSkill`, `JobLocation`, `JobEducationRequirement`, `JobsApplied`, `JobsBookmark`.
3. **Recruitment pipeline** — a job has one `JobWorkflow` made of ordered `WorkflowStep`s. Applying creates a `CandidatePipeline` that advances step-by-step via `CandidatePipelineStep` instances. Steps can run `INDIVIDUAL` or `BATCH` mode (`Batch`/`BatchCandidate`/`BatchCandidateEvaluation`) and use `InterviewSlot`/`SlotBooking` for scheduling and `StageEvaluation`/`Interview` for interviewer feedback. `CandidatePipeline.lockState = LOCKED_REJECTED` freezes further advancement. `lib/services/pipeline-service.ts` (advancement logic), `lib/services/batch-service.ts`, and `lib/services/bulk-hiring-service.ts` hold this orchestration; don't reimplement stage-advancement logic in route handlers.
4. Supporting: `AuditLog`, `Notification`, `LetterOfIntent`/`OfferLetter` (PDF-generated via `lib/pdf-generator.ts` / `lib/templates/`), `OrganizationSettings`.

**Conventions to preserve when touching this schema/data layer:**
- All PKs/FKs are `BigInt`. API route handlers must manually call `.toString()` on every `BigInt` field before returning JSON (BigInt isn't JSON-serializable) — see `lib/assessments/serializers.ts` for the established `serializeX()` pattern; follow it for new endpoints instead of ad hoc mapping.
- Timestamps (`createdAt`, `updatedAt`, `lastLogin`, etc.) are stored as `BigInt` Unix seconds, not Prisma `DateTime` — use `getCurrentTimestamp()` / `formatDate()` / `formatDateTime()` from `lib/utils.ts`. (`InterviewSlot.startsAt/endsAt` are an exception and use real `DateTime`.)
- Several `*Metadata`/`formData`/`evaluationSchema`/`options` columns are untyped `Json` — check existing usages nearby before assuming a shape.

### App structure

- `app/admin/*`, `app/interviewer/*`, `app/candidate/*` — role-specific UI trees, each with their own `layout.tsx` that pairs with the middleware role gate above.
- `app/api/*` mirrors the UI structure (`app/api/admin`, `app/api/interviewer`, `app/api/candidate`, plus shared `applications`, `jobs`, `assessments`, `notifications`, etc.). Route handlers are the enforcement point for auth (via `lib/rbac.ts`) and business rules.
- `components/admin/`, `components/interviewer/`, `components/candidate/`, `components/ui/` (shadcn/ui-based primitives) follow the same role split.
- `store/` — Zustand stores (`useAppStore`, `useDashboardStore`, `useJobsStore`) for client-side state.
- `lib/api-client.ts` — client-side fetch wrapper (`ApiClient.get/post/put/patch`) that auto-redirects to `/login` on 401/403; prefer it over raw `fetch` in client components for consistency with the rest of the app.
- Uploaded files (avatars, org logos, CVs) go to Cloudinary when `CLOUDINARY_*` env vars are set, otherwise fall back to local `public/uploads/` (served via `app/uploads/[...path]`) — see `lib/cloudinary.ts`.

### Interview scheduling (interviewer role, availability, slots, bookings)

- Interview steps (`SCREENING_INTERVIEW`, `FOCUS_GROUP`, `FINAL_INTERVIEW`) are configured with real `WorkflowStep` columns (`interviewMode`, `durationMins`, `panelSize`, `bufferMins`, `capacityPerSlot` = candidates per slot). The interviewer pool is `StepInterviewer`. Read step settings only through `lib/workflow/step-config.ts` (`readStepConfig`); never read `stepMetadata` ad hoc and never expose it on public endpoints (`toPublicStep`).
- Interviewers set `InterviewerAvailability` (weekly or one-off windows, minutes from midnight in the org timezone) and `InterviewerTimeOff`. Admin publishes slots for a round; the generator in `lib/scheduling/` creates `InterviewSlot` + `SlotInterviewer` rows. Candidates book; only admins reschedule/cancel.
- Capacity is enforced atomically with `InterviewSlot.bookedCount` (conditional UPDATE), and one active booking per candidate per step is enforced by `SlotBooking.activeKey` (UNIQUE, NULL once cancelled). Do not count `bookings` rows for capacity.
- Timezone: organization timezone lives in `OrganizationSettings.timezone` (default `Asia/Karachi`). Use the zone helpers in `lib/timezone.ts` (`zonedWallTimeToUtc`, `getZonedParts`, ...), never browser-local time.
- `requireStaff()` is ADMIN only. Interviewer API routes use `requireInterviewer()` and must scope every query to slots the interviewer sits on (`SlotInterviewer`).

### AI skill assessments

`lib/ai/assessment-generator.ts` calls GitHub Models / Azure AI Inference (`AI_INFERENCE_TOKEN`, configurable endpoint/model) to generate assessment questions. Attempt/cooldown rules live in `lib/assessments/attempt-rules.ts`, scoring in `lib/assessments/scoring.ts` — both have unit tests (`*.test.ts`); extend those tests when changing assessment logic. `lib/ai-shortlist/scoring.ts` and `lib/ai-shortlist/deterministic.ts` are also covered by unit tests — extend those when changing shortlisting logic.

## Environment

Required: `DATABASE_URL`, `DIRECT_URL` (Postgres), `NEXTAUTH_SECRET`, `NEXTAUTH_URL`. Optional: `CLOUDINARY_*` (file uploads), `AI_INFERENCE_TOKEN`/`AI_INFERENCE_ENDPOINT`/`AI_INFERENCE_MODEL` (skill assessment generation), `MIDDLEWARE_DEBUG`. See `.env.example`.
