# Slot Conflict Validation & Job-Based Slot System - Summary

## ✅ Completed Enhancements

### 1. Slot Time Conflict Validation
- **File**: `app/api/interviewer/slots/route.ts`
- **Features**:
  - ✅ Validates time conflicts before creating slots
  - ✅ Checks for overlaps with existing slots for the same interviewer
  - ✅ Prevents double-booking for the same interviewer
  - ✅ Validates slot cannot be in the past
  - ✅ Returns clear error messages (HTTP 409 Conflict)

### 2. Slot Update Conflict Validation
- **File**: `app/api/interviewer/slots/[id]/route.ts`
- **Features**:
  - ✅ Validates conflicts when updating slot times
  - ✅ Excludes current slot from conflict check
  - ✅ Same validation rules as slot creation

### 3. Job-Based Slot System (Bulk & Normal)
- **File**: `app/api/interviewer/slots/route.ts`
- **Features**:
  - ✅ Slots are created for jobs (via workflow step → job)
  - ✅ Works for both BULK and NORMAL jobs
  - ✅ Notifies candidates from batches (bulk jobs)
  - ✅ Notifies candidates from pipelines (normal jobs)
  - ✅ Each interviewer has separate slots (no cross-interviewer conflicts)

## 🔒 Conflict Validation Logic

### Time Overlap Detection
Two slots overlap if:
```
newSlot.startsAt < existingSlot.endsAt AND newSlot.endsAt > existingSlot.startsAt
```

### Validation Rules
1. **Same Interviewer Only**: Conflicts are checked per interviewer
   - Interviewer A's slots don't conflict with Interviewer B's slots
   - Each interviewer manages their own availability

2. **Non-Blocked Slots Only**: Only active (non-blocked) slots are checked
   - Blocked slots are ignored in conflict detection

3. **Past Time Prevention**: Slots cannot be created in the past
   - Validates `startsAt >= current time`

4. **Time Range Validation**: End time must be after start time
   - Validates `endsAt > startsAt`

## 📋 Complete Flow

### For Bulk Jobs:
```
1. Admin creates job (BULK type)
2. Candidates apply
3. Admin creates batch with SELECTED/REJECTED candidates
4. Interviewer notified → Creates slots for job/step
5. SELECTED candidates from batches notified
6. Candidates book slots
```

### For Normal Jobs:
```
1. Admin creates job (NORMAL type)
2. Candidates apply → Pipeline created automatically
3. Interviewer assigned to step → Creates slots for job/step
4. Candidates in pipeline (PENDING/IN_PROGRESS) notified
5. Candidates book slots
```

## 🎯 Key Features

### ✅ Interviewer-Specific Slots
- Each interviewer creates slots independently
- No conflicts between different interviewers
- Each interviewer has their own availability schedule

### ✅ Job-Based (Not Application-Based)
- Slots are linked to workflow step → job
- Available to all eligible candidates for that job/step
- Not tied to specific applications

### ✅ Step-by-Step Process
- Each workflow step has separate interviewer
- Candidates must pass each step to advance
- Slots created per step, not per application

### ✅ Conflict Prevention
- Automatic validation on slot creation
- Automatic validation on slot update
- Clear error messages for conflicts
- Prevents scheduling conflicts

## 📝 API Examples

### Create Slot (with conflict validation)
```typescript
POST /api/interviewer/slots
{
  "stepId": "456",
  "startsAt": "2024-11-20T10:00:00Z",
  "endsAt": "2024-11-20T11:00:00Z",
  "capacity": 1
}

// Success Response:
{ "id": "789", "status": "OK" }

// Conflict Response (409):
{
  "error": "Time conflict: You already have a slot scheduled during this time. Please choose a different time slot.",
  "conflictDetails": "This slot overlaps with an existing slot in your schedule."
}
```

### Update Slot (with conflict validation)
```typescript
PATCH /api/interviewer/slots/[id]
{
  "startsAt": "2024-11-20T14:00:00Z",
  "endsAt": "2024-11-20T15:00:00Z"
}

// Validates conflicts with other slots (excluding current slot)
```

## 🔍 Conflict Detection Scenarios

### Scenario 1: Exact Overlap
```
Existing: 10:00 - 11:00
New:      10:00 - 11:00
Result:    ❌ CONFLICT
```

### Scenario 2: Partial Overlap (Start)
```
Existing: 10:00 - 11:00
New:      10:30 - 11:30
Result:    ❌ CONFLICT
```

### Scenario 3: Partial Overlap (End)
```
Existing: 10:00 - 11:00
New:      09:30 - 10:30
Result:    ❌ CONFLICT
```

### Scenario 4: Complete Containment
```
Existing: 10:00 - 11:00
New:      09:30 - 11:30
Result:    ❌ CONFLICT
```

### Scenario 5: No Overlap (Adjacent)
```
Existing: 10:00 - 11:00
New:      11:00 - 12:00
Result:    ✅ ALLOWED (no overlap, adjacent is OK)
```

### Scenario 6: No Overlap (Gap)
```
Existing: 10:00 - 11:00
New:      12:00 - 13:00
Result:    ✅ ALLOWED
```

### Scenario 7: Different Interviewers
```
Interviewer A: 10:00 - 11:00
Interviewer B: 10:00 - 11:00
Result:    ✅ ALLOWED (different interviewers, no conflict)
```

## 🛡️ Validation Checks

### On Slot Creation:
1. ✅ Required fields present (stepId, startsAt, endsAt)
2. ✅ Valid date objects
3. ✅ End time after start time
4. ✅ Start time not in the past
5. ✅ No time conflict with existing slots (same interviewer)
6. ✅ Workflow step exists

### On Slot Update:
1. ✅ Slot ownership verified
2. ✅ Valid date objects (if updating time)
3. ✅ End time after start time
4. ✅ Start time not in the past
5. ✅ No time conflict with other slots (same interviewer, excluding current)

## 📊 Database Structure

### InterviewSlot Model
```prisma
model InterviewSlot {
  id            BigInt
  stepId        BigInt      // Links to WorkflowStep → Job
  interviewerId BigInt      // Links to User (interviewer)
  startsAt      DateTime    // Slot start time
  endsAt        DateTime    // Slot end time
  capacity      Int         // Max candidates per slot
  isBlocked     Boolean     // Blocked slots ignored in conflicts
}
```

### Relationships
- Slot → WorkflowStep → Job (job-based)
- Slot → Interviewer (interviewer-specific)
- Slot → Bookings (candidate bookings)

## ✅ Benefits

1. **No Double-Booking**: Interviewers cannot create conflicting slots
2. **Clear Availability**: Each interviewer's schedule is independent
3. **Job-Based**: Slots available to all eligible candidates
4. **Works for Both**: Bulk and normal jobs use same system
5. **Step-by-Step**: Each step has separate slots and interviewers
6. **Professional**: Proper conflict validation and error handling

---

**Status**: ✅ Complete
**Date**: November 2024

