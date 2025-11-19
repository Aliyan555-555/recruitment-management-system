# Bulk Hiring Process Fix - Implementation Plan

## Current Issues
1. ❌ Slots are created for workflow steps, not jobs
2. ❌ No notification to interviewer after batch creation
3. ❌ Initial batch doesn't differentiate selected/rejected candidates
4. ❌ Slots are application-specific instead of job-based

## Required Flow

### Step 1: Admin Creates Job
- Admin creates job with workflow steps
- Job has `postTo` (closing date)
- Job status: ACTIVE

### Step 2: Candidates Apply
- Candidates apply to job
- Application status: APPLIED
- No pipeline created yet (waiting for batch)

### Step 3: After Job Closing Date
- Admin creates initial batch
- Admin selects/rejects candidates manually
- Selected candidates → status: SELECTED
- Rejected candidates → status: REJECTED
- Batch status: PENDING_ADMIN → IN_PROGRESS

### Step 4: Notify Interviewer
- After batch creation, notify assigned interviewer
- Notification includes: job details, batch info, candidate count

### Step 5: Interviewer Creates Slots
- Interviewer creates slots for the JOB (not applications)
- Slots linked to workflow step
- Each slot has separate start/end time
- Slots are available for all selected candidates

### Step 6: Notify Candidates
- When slots are available, notify SELECTED candidates
- Candidates can book available slots

## Implementation Changes Needed

### 1. Database Schema Updates
```prisma
// InterviewSlot - already has stepId, but we need to ensure it's job-based
// Current: slot → step → workflow → job (indirect)
// Need: Make it clearer that slots are for jobs

// Add jobId to InterviewSlot for direct access
model InterviewSlot {
  // ... existing fields
  jobId        BigInt?  @map("job_id")  // NEW: Direct job reference
  // ... rest
}
```

### 2. Batch Creation Enhancement
- Add selected/rejected differentiation in initial batch
- After batch creation → notify interviewer
- Update application statuses based on selection

### 3. Slot System Update
- Slots created for job + workflow step
- Not linked to specific applications
- Available to all selected candidates from batch

### 4. Notification System
- Notify interviewer when batch created
- Notify candidates when slots available

## Files to Modify

1. `prisma/schema.prisma` - Add jobId to InterviewSlot (optional, for optimization)
2. `lib/services/batch-service.ts` - Enhance batch creation with notifications
3. `app/api/admin/batches/route.ts` - Update batch creation endpoint
4. `app/api/interviewer/slots/route.ts` - Update slot creation for jobs
5. `lib/notifications.ts` - Add batch creation notification
6. `app/api/candidate/slots/route.ts` - Update slot booking for job-based slots

## Questions to Clarify

1. **Initial Batch Selection**: Manual or automatic?
2. **Slot-Step Relationship**: Slots must be for specific workflow step?
3. **Candidate Notification**: Only selected candidates or all?
4. **Slot Time**: Each slot has separate time (already implemented)?

