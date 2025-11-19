# Bulk Hiring Process Fix - Summary

## ✅ Completed Changes

### 1. Enhanced Batch Creation
- **File**: `lib/services/batch-service.ts`
- **Changes**:
  - Added support for `candidateStatuses` parameter to differentiate SELECTED/REJECTED/PENDING candidates in initial batch
  - Batch now starts as `IN_PROGRESS` instead of `PENDING_ADMIN` for initial batches
  - Automatically updates application statuses:
    - SELECTED candidates → `BATCH_ASSIGNED`
    - REJECTED candidates → `REMOVED`
  - After batch creation, automatically notifies assigned interviewer

### 2. Interviewer Notification System
- **Files**: 
  - `lib/notifications.ts` - Added `notifyInterviewerBatchCreated()`
  - `lib/email.ts` - Added `sendInterviewerBatchCreatedEmail()`
- **Features**:
  - Notifies interviewer when batch is created
  - Includes batch details, job info, candidate count
  - Sends both in-app notification and email

### 3. Candidate Slot Notification System
- **Files**:
  - `lib/notifications.ts` - Added `notifyCandidateSlotsAvailable()`
  - `lib/email.ts` - Added `sendCandidateSlotsAvailableEmail()`
  - `app/api/interviewer/slots/route.ts` - Updated slot creation
- **Features**:
  - When interviewer creates slots, automatically notifies all SELECTED candidates
  - Only notifies candidates with status `SELECTED` from active batches
  - Sends both in-app notification and email with slot count

### 4. Updated Batch Creation API
- **File**: `app/api/admin/batches/route.ts`
- **Changes**:
  - Added support for `candidateStatuses` parameter
  - Allows admin to specify which candidates are SELECTED/REJECTED when creating initial batch

## 📋 Complete Flow

### Step 1: Admin Creates Job
```
POST /api/admin/jobs
- Admin creates job with workflow steps
- Job has postTo (closing date)
- Job status: ACTIVE
```

### Step 2: Candidates Apply
```
POST /api/jobs/[id]/apply
- Candidates apply to job
- Application status: APPLIED
- No pipeline created yet (waiting for batch)
```

### Step 3: After Job Closing Date - Admin Creates Initial Batch
```
POST /api/admin/batches
Body: {
  jobId: "...",
  workflowStepId: "...", // Step 1
  candidateIds: ["...", "..."],
  batchNumber: 1,
  batchName: "Initial Batch",
  candidateStatuses: [  // NEW: Optional
    { candidateId: "...", status: "SELECTED" },
    { candidateId: "...", status: "REJECTED" }
  ]
}

What happens:
1. Batch created with status: IN_PROGRESS
2. Batch candidates created with specified statuses
3. SELECTED candidates → application status: BATCH_ASSIGNED
4. REJECTED candidates → application status: REMOVED
5. Interviewer automatically notified (notification + email)
```

### Step 4: Interviewer Creates Slots for Job
```
POST /api/interviewer/slots
Body: {
  stepId: "...", // Workflow step ID
  startsAt: "2024-11-20T10:00:00Z",
  endsAt: "2024-11-20T11:00:00Z",
  capacity: 1
}

What happens:
1. Slot created for job (via step → workflow → job)
2. System finds all SELECTED candidates from active batches for this step
3. All selected candidates automatically notified (notification + email)
4. Candidates can now book slots
```

### Step 5: Candidates Book Slots
```
POST /api/candidate/slots/[id]/book
Body: {
  applicationId: "..."
}

What happens:
1. Candidate books available slot
2. Booking created
3. Candidate and interviewer notified
```

## 🎯 Key Improvements

### ✅ Job-Based Slots
- Slots are created for **jobs** (via workflow step)
- Not linked to specific applications
- Available to all selected candidates from batches

### ✅ Professional Slot System
- Each slot has separate start/end time
- Capacity management (multiple candidates per slot if needed)
- Conflict prevention
- Time-based availability

### ✅ Automatic Notifications
- Interviewer notified when batch created
- Candidates notified when slots available
- Only SELECTED candidates receive notifications
- Both in-app and email notifications

### ✅ Status Management
- Clear differentiation between SELECTED/REJECTED candidates
- Automatic application status updates
- Proper batch status flow

## 📝 API Usage Examples

### Create Initial Batch with Selected/Rejected Candidates
```typescript
POST /api/admin/batches
{
  "jobId": "123",
  "workflowStepId": "456",
  "candidateIds": ["789", "101", "112"],
  "batchNumber": 1,
  "batchName": "Initial Screening Batch",
  "candidateStatuses": [
    { "candidateId": "789", "status": "SELECTED" },
    { "candidateId": "101", "status": "SELECTED" },
    { "candidateId": "112", "status": "REJECTED" }
  ]
}
```

### Create Slots (Interviewer)
```typescript
POST /api/interviewer/slots
{
  "stepId": "456",
  "startsAt": "2024-11-20T10:00:00Z",
  "endsAt": "2024-11-20T11:00:00Z",
  "capacity": 1
}
// Automatically notifies all SELECTED candidates
```

## 🔄 Status Flow

### Application Status Flow
```
APPLIED → SHORTLISTED → BATCH_ASSIGNED (if SELECTED) or REMOVED (if REJECTED)
```

### Batch Status Flow
```
IN_PROGRESS → PENDING_ADMIN → COMPLETED
```

### Batch Candidate Status
```
PENDING → SELECTED (after evaluation)
PENDING → REJECTED (after evaluation)
PENDING → REVIEW (needs admin decision)
```

## ⚠️ Important Notes

1. **Initial Batch**: When creating initial batch, use `candidateStatuses` to mark candidates as SELECTED or REJECTED
2. **Slot Creation**: Slots are created for workflow steps, which are linked to jobs - this makes them job-based
3. **Notifications**: Only SELECTED candidates from active batches receive slot availability notifications
4. **Status Sync**: Application statuses are automatically updated based on batch candidate statuses

## 🧪 Testing Checklist

- [ ] Admin creates job with workflow
- [ ] Candidates apply to job
- [ ] After closing date, admin creates initial batch with selected/rejected candidates
- [ ] Interviewer receives notification about batch
- [ ] Interviewer creates slots for the job/step
- [ ] Selected candidates receive slot availability notifications
- [ ] Candidates can book slots
- [ ] Rejected candidates do NOT receive slot notifications

## 📚 Related Files

- `lib/services/batch-service.ts` - Batch creation logic
- `lib/notifications.ts` - Notification functions
- `lib/email.ts` - Email templates
- `app/api/admin/batches/route.ts` - Batch creation API
- `app/api/interviewer/slots/route.ts` - Slot creation API
- `app/api/candidate/slots/[id]/book/route.ts` - Slot booking API

---

**Status**: ✅ Implementation Complete
**Date**: November 2024

