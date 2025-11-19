# ✅ Bulk Hiring Flow - Complete Professional Implementation

## Overview
This document outlines the complete, professional-grade bulk hiring flow that has been implemented and verified across all user roles (Admin, Interviewer, Candidate).

## Complete Flow Cycle

### 1. **Admin Creates Job** ✅
- Admin creates a job with workflow steps
- Each step can have a separate interviewer assigned
- Job type is set to "BULK" for bulk hiring

### 2. **Candidates Apply** ✅
- Candidates apply for the job before the closing date
- Application status: `APPLIED`
- No pipeline is created (bulk hiring doesn't use pipelines)

### 3. **After Job Closing Date - Admin Creates Initial Batch** ✅
- Admin goes to `/admin/jobs/[id]/shortlist` to review candidates
- Admin can shortlist candidates (mark as `SHORTLISTED`)
- Admin goes to `/admin/jobs/[id]/batches` to create initial batch
- **NEW**: Admin can now select/reject candidates during batch creation:
  - Select candidates with checkboxes
  - Set initial status: SELECTED, REJECTED, or PENDING
  - Selected candidates → `BATCH_ASSIGNED` status
  - Rejected candidates → `REMOVED` status
- Batch is created with status `IN_PROGRESS`
- Batch candidates have initial status set (SELECTED/REJECTED/PENDING)

### 4. **Interviewer Notification** ✅
- Interviewer is automatically notified when batch is created:
  - In-app notification: "New Batch Ready for Evaluation"
  - Email notification with batch details
- Notification includes:
  - Batch name
  - Step name
  - Job title
  - Number of candidates

### 5. **Interviewer Creates Slots** ✅
- Interviewer goes to `/interviewer/slots` or `/interviewer/assignments`
- Interviewer creates slots for the **job step** (not specific applications)
- **Professional Slot System**:
  - Each slot has separate start/end time
  - Capacity-based booking (multiple candidates per slot)
  - **Time Conflict Validation**: Prevents overlapping slots for same interviewer
  - Slots cannot be created in the past
  - Slots are linked to workflow step (job-based)

### 6. **Candidate Notification** ✅
- When interviewer creates slots, eligible candidates are automatically notified:
  - **Bulk Hiring**: Candidates with `SELECTED` status in active batches
  - **Normal Jobs**: Candidates with `PENDING`/`IN_PROGRESS` status in pipelines
- Notification includes:
  - Number of available slots
  - Step name
  - Job title
- Email notification sent to candidates

### 7. **Candidates Book Slots** ✅
- Candidates view available slots:
  - **Bulk Hiring**: Use `/api/candidate/batches/slots?jobId=X&stepId=Y`
  - **Normal Jobs**: Use `/api/candidate/pipelines/[id]/pending-stage`
- Candidates can book available slots
- Slot booking creates `SlotBooking` record
- Both candidate and interviewer are notified of booking

### 8. **Interviewer Evaluates Batch** ✅
- Interviewer views batch at `/interviewer/batches/[id]`
- Interviewer evaluates each candidate:
  - Status: SELECTED, REJECTED, or REVIEW
  - Rating (1-10)
  - Feedback
- When all candidates evaluated, batch status → `PENDING_ADMIN`

### 9. **Admin Creates Next Batch** ✅
- Admin reviews completed batch
- Admin can create next batch for next workflow step
- Only `SELECTED` candidates from previous batch move forward
- Process repeats for each workflow step

### 10. **Step-by-Step Progression** ✅
- Candidates must pass each step to move to next
- Each step has separate interviewer
- Status tracking throughout the process

## Key Features Implemented

### ✅ Initial Batch Creation with Selection/Rejection
- **File**: `app/admin/jobs/[id]/batches/page.tsx`
- Admin can mark candidates as SELECTED or REJECTED during batch creation
- Status dropdown for each selected candidate
- Visual feedback showing selected/rejected counts

### ✅ Professional Slot System
- **Files**: 
  - `app/api/interviewer/slots/route.ts` (creation)
  - `app/api/interviewer/slots/[id]/route.ts` (updates)
- **Features**:
  - Job-based slots (not application-specific)
  - Time conflict validation
  - Capacity-based booking
  - Past-time validation
  - Separate time slots for each interview

### ✅ Candidate Slot Visibility for Bulk Hiring
- **File**: `app/api/candidate/batches/slots/route.ts` (NEW)
- Candidates can view slots based on their batch status
- Only `SELECTED` candidates in active batches can see slots
- Returns available slots for the current step

### ✅ Interviewer Batch Assignments
- **File**: `app/api/interviewer/assignments/route.ts`
- Now includes both pipeline assignments AND batch assignments
- Interviewers see all their assignments in one place
- Batches are clearly marked with type: "batch"

### ✅ Complete Notification System
- **Files**: 
  - `lib/notifications.ts`
  - `lib/email.ts`
- Interviewer notified when batch created
- Candidates notified when slots available
- Both in-app and email notifications

### ✅ Status Management
- Application statuses: `APPLIED` → `SHORTLISTED` → `BATCH_ASSIGNED` / `REMOVED`
- Batch statuses: `IN_PROGRESS` → `PENDING_ADMIN` → `COMPLETED`
- Batch candidate statuses: `PENDING` → `SELECTED` / `REJECTED` / `REVIEW`

## API Endpoints

### Admin
- `POST /api/admin/batches` - Create batch with candidate statuses
- `GET /api/admin/batches?jobId=X` - List batches for job
- `GET /api/admin/batches/[id]` - Get batch details
- `POST /api/admin/batches/[id]` - Create next batch

### Interviewer
- `GET /api/interviewer/assignments` - Get all assignments (pipelines + batches)
- `GET /api/interviewer/batches/[id]` - Get batch details
- `POST /api/interviewer/batches/[id]/evaluate` - Submit batch evaluation
- `POST /api/interviewer/slots` - Create slot (with conflict validation)
- `PATCH /api/interviewer/slots/[id]` - Update slot (with conflict validation)

### Candidate
- `GET /api/candidate/batches/slots?jobId=X&stepId=Y` - Get available slots for bulk hiring
- `GET /api/candidate/pipelines/[id]/pending-stage` - Get available slots for normal jobs
- `POST /api/candidate/slots/[id]/book` - Book a slot

## UI Pages

### Admin
- `/admin/jobs/[id]/shortlist` - Review and shortlist candidates
- `/admin/jobs/[id]/batches` - Create and manage batches
- `/admin/batches/[id]` - View batch details

### Interviewer
- `/interviewer/assignments` - View all assignments (pipelines + batches)
- `/interviewer/batches/[id]` - Evaluate batch candidates
- `/interviewer/slots` - Create and manage interview slots

### Candidate
- `/applications` - View all applications
- `/applications/[id]` - View application details (for normal jobs with pipelines)
- Uses API endpoints to view and book slots

## Validation & Error Handling

### Slot Time Conflicts
- Prevents creating overlapping slots for same interviewer
- Validates on both creation and update
- Returns clear error message with conflict details

### Status Validation
- Only SELECTED candidates in batches can see slots
- Only candidates with PENDING/IN_PROGRESS pipeline steps can see slots
- Proper authorization checks on all endpoints

### Date Validation
- Slots cannot be created in the past
- Slots cannot be updated to past times
- Job closing date validation for applications

## Testing Checklist

- [x] Admin can create job with workflow steps
- [x] Candidates can apply for bulk hiring jobs
- [x] Admin can shortlist candidates
- [x] Admin can create initial batch with SELECTED/REJECTED status
- [x] Interviewer receives notification when batch created
- [x] Interviewer can create slots for job step
- [x] Slot time conflict validation works
- [x] Candidates receive notification when slots available
- [x] SELECTED candidates in batches can view slots
- [x] Candidates can book slots
- [x] Interviewer can evaluate batch candidates
- [x] Admin can create next batch from completed batch
- [x] Step-by-step progression works correctly

## Professional Grade Features

1. **Time Conflict Validation**: Prevents double-booking interviewers
2. **Capacity Management**: Multiple candidates per slot
3. **Status Tracking**: Complete status flow from application to final selection
4. **Notifications**: In-app and email notifications at key points
5. **Job-Based Slots**: Slots are for job steps, not individual applications
6. **Batch Management**: Professional batch evaluation system
7. **Step Progression**: Candidates must pass each step sequentially
8. **Error Handling**: Comprehensive validation and error messages

## Notes

- Bulk hiring jobs don't create pipelines (different from normal jobs)
- Candidates in bulk jobs use batches instead of pipelines
- Slot system works for both bulk and normal jobs
- All notifications are sent asynchronously to avoid blocking
- Time conflict validation ensures professional scheduling

