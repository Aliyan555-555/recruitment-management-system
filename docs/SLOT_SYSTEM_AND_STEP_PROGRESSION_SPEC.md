# 🎯 Slot System & Step Progression - Enhanced Specification

## Overview

This document outlines improvements to the interview slot system for interviewer flexibility and implements strict step progression rules with admin override capabilities.

---

## 🔄 **Step Progression Rules**

### **Core Rule: Sequential Step Progression**

```typescript
interface StepProgressionRule {
  // Candidates MUST pass previous step to proceed
  enforceSequentialProgression: boolean
  
  // Admin can override this rule
  adminOverrideEnabled: boolean
  
  // Validation logic
  canProceedToStep(candidateId: string, targetStepOrder: number): boolean
  checkPreviousStepsPassed(candidateId: string, targetStepOrder: number): StepValidationResult
}

interface StepValidationResult {
  canProceed: boolean
  blockingStep?: {
    stepOrder: number
    stepName: string
    status: 'PENDING' | 'IN_PROGRESS' | 'REJECTED' | 'SKIPPED'
    reason: string
  }
  passedSteps: number[]
  requiredSteps: number[]
}
```

### **Progression Logic**

```
Step 1: Application Review → Status: COMPLETED ✅
Step 2: Technical Test → Status: COMPLETED ✅
Step 3: Technical Interview → Status: PENDING ⏳
  ↓
Candidate CAN proceed to Step 3 ✅

---

Step 1: Application Review → Status: COMPLETED ✅
Step 2: Technical Test → Status: REJECTED ❌
Step 3: Technical Interview → Status: PENDING ⏳
  ↓
Candidate CANNOT proceed to Step 3 ❌
(Blocked by Step 2 failure)

---

Admin Override:
Step 1: Application Review → Status: COMPLETED ✅
Step 2: Technical Test → Status: REJECTED ❌
Step 3: Technical Interview → Status: PENDING ⏳
  ↓
Admin manually advances candidate to Step 3 ✅
(Audit log created, reason required)
```

---

## 🎛️ **Enhanced Slot System for Interviewers**

### **1. Flexible Slot Management**

```typescript
interface FlexibleSlotSystem {
  // Interviewer can create their own slots
  interviewerCanCreateSlots: boolean
  
  // Flexible time management
  slotTypes: {
    FIXED: { startTime: DateTime, endTime: DateTime }
    FLEXIBLE: { duration: number, availableWindow: TimeWindow }
    RECURRING: { pattern: RecurrencePattern, endDate?: DateTime }
    ON_DEMAND: { availableHours: TimeRange[] }
  }
  
  // Buffer time management
  bufferTime: {
    beforeSlot: number // minutes
    afterSlot: number // minutes
    betweenSlots: number // minutes
  }
  
  // Capacity management
  capacityManagement: {
    maxConcurrent: number
    maxDaily: number
    maxWeekly: number
    allowOverbooking: boolean
    overbookingLimit: number
  }
}
```

### **2. Interviewer Slot Preferences**

```typescript
interface InterviewerSlotPreferences {
  interviewerId: string
  
  // Availability patterns
  availability: {
    workingDays: DayOfWeek[]
    workingHours: TimeRange[]
    timezone: string
    blackoutDates: Date[]
    preferredSlots: PreferredSlot[]
  }
  
  // Auto-scheduling preferences
  autoScheduling: {
    enabled: boolean
    preferredDuration: number // minutes
    bufferTime: number
    advanceBookingDays: number
    maxSlotsPerDay: number
  }
  
  // Notification preferences
  notifications: {
    newBooking: boolean
    cancellation: boolean
    reminder: boolean
    reminderTime: number // hours before
  }
}
```

### **3. Smart Slot Suggestions**

```typescript
interface SmartSlotSuggestions {
  // AI-powered slot recommendations
  suggestOptimalSlots(candidateId: string, stepId: string): SlotSuggestion[]
  
  // Conflict detection
  detectConflicts(proposedSlot: Slot): Conflict[]
  
  // Load balancing
  balanceInterviewerWorkload(stepId: string): LoadBalancedSlots[]
}

interface SlotSuggestion {
  slotId: string
  startsAt: DateTime
  endsAt: DateTime
  interviewer: InterviewerInfo
  matchScore: number // 0-100
  reasons: string[] // Why this slot is suggested
  alternatives: SlotSuggestion[]
}
```

---

## 🚀 **Slot System Features**

### **1. Multi-Format Slot Creation**

```typescript
interface SlotCreationOptions {
  // Single slot
  createSingleSlot: {
    stepId: string
    interviewerId: string
    startsAt: DateTime
    endsAt: DateTime
    capacity: number
  }
  
  // Bulk slots
  createBulkSlots: {
    stepId: string
    interviewerId: string
    dateRange: DateRange
    timeSlots: TimeSlot[]
    capacity: number
    excludeWeekends: boolean
    excludeHolidays: boolean
  }
  
  // Recurring slots
  createRecurringSlots: {
    stepId: string
    interviewerId: string
    recurrence: {
      frequency: 'DAILY' | 'WEEKLY' | 'MONTHLY'
      interval: number
      daysOfWeek?: DayOfWeek[]
      endDate?: DateTime
      occurrences?: number
    }
    timeRange: TimeRange
    capacity: number
  }
  
  // Template-based slots
  createFromTemplate: {
    templateId: string
    interviewerId: string
    startDate: DateTime
    adjustments?: SlotAdjustment[]
  }
}
```

### **2. Dynamic Slot Adjustment**

```typescript
interface DynamicSlotManagement {
  // Interviewer can modify their slots
  modifySlot: {
    extendDuration: boolean
    reduceDuration: boolean
    reschedule: boolean
    splitSlot: boolean
    mergeSlots: boolean
  }
  
  // Auto-adjustments
  autoAdjustments: {
    extendIfRunningLate: boolean
    addBufferTime: boolean
    cancelIfNoBookings: boolean
    cancelThreshold: number // hours before
  }
  
  // Conflict resolution
  conflictResolution: {
    autoReschedule: boolean
    notifyCandidates: boolean
    suggestAlternatives: boolean
  }
}
```

### **3. Slot Booking Intelligence**

```typescript
interface IntelligentBooking {
  // Candidate preferences
  candidatePreferences: {
    preferredTimeSlots: TimeRange[]
    timezone: string
    availability: AvailabilityWindow[]
  }
  
  // Smart matching
  smartMatching: {
    matchCandidateToOptimalSlot(candidateId: string, stepId: string): SlotMatch[]
    considerInterviewerExpertise: boolean
    considerTimeZone: boolean
    considerCandidateAvailability: boolean
  }
  
  // Booking validation
  bookingValidation: {
    checkStepProgression: boolean // Enforce step progression rule
    checkSlotAvailability: boolean
    checkInterviewerCapacity: boolean
    validateTimeConstraints: boolean
  }
}
```

---

## 👨‍💼 **Admin Override System**

### **1. Admin Step Progression Override**

```typescript
interface AdminStepOverride {
  // Override step progression rules
  overrideStepProgression: {
    candidateId: string
    targetStepOrder: number
    reason: string // Required
    bypassedSteps: number[] // Steps being bypassed
    effectiveDate: DateTime
    notifyCandidate: boolean
    notifyInterviewer: boolean
  }
  
  // Audit trail
  auditLog: {
    action: 'ADMIN_OVERRIDE'
    adminId: string
    candidateId: string
    previousStepOrder: number
    newStepOrder: number
    reason: string
    timestamp: DateTime
  }
  
  // Validation
  validation: {
    requireReason: boolean
    requireApproval: boolean // For critical overrides
    approvalWorkflow: ApprovalWorkflow
    maxBypassLimit: number // Max steps that can be bypassed
  }
}
```

### **2. Admin Slot Management**

```typescript
interface AdminSlotManagement {
  // Full slot control
  fullControl: {
    createSlotsForInterviewer: boolean
    modifyAnySlot: boolean
    cancelAnySlot: boolean
    reassignSlots: boolean
  }
  
  // Bulk operations
  bulkOperations: {
    createBulkSlotsForMultipleInterviewers: boolean
    rescheduleAllSlotsForStep: boolean
    cancelSlotsByCriteria: boolean
  }
  
  // Emergency actions
  emergencyActions: {
    emergencyReschedule: boolean
    forceSlotAssignment: boolean
    overrideCapacity: boolean
  }
}
```

### **3. Admin Dashboard for Step Progression**

```typescript
interface AdminProgressionDashboard {
  // View blocked candidates
  blockedCandidates: {
    candidateId: string
    currentStep: number
    blockingStep: number
    blockingReason: string
    canOverride: boolean
  }[]
  
  // Override history
  overrideHistory: {
    date: DateTime
    admin: string
    candidate: string
    action: string
    reason: string
    outcome: string
  }[]
  
  // Analytics
  analytics: {
    overrideFrequency: number
    mostCommonReasons: string[]
    successRate: number
    averageBypassSteps: number
  }
}
```

---

## 📊 **Database Schema Updates**

### **1. Step Progression Tracking**

```sql
-- Track step progression with validation
ALTER TABLE candidate_pipeline_step
ADD COLUMN passed BOOLEAN DEFAULT FALSE,
ADD COLUMN passed_at BIGINT,
ADD COLUMN passed_by BIGINT REFERENCES users(id),
ADD COLUMN admin_override BOOLEAN DEFAULT FALSE,
ADD COLUMN override_reason TEXT,
ADD COLUMN override_by BIGINT REFERENCES users(id),
ADD COLUMN override_at BIGINT,
ADD COLUMN progression_blocked BOOLEAN DEFAULT FALSE,
ADD COLUMN blocking_reason TEXT;

-- Index for progression queries
CREATE INDEX idx_pipeline_step_progression 
ON candidate_pipeline_step(pipeline_id, step_order, status, passed);
```

### **2. Enhanced Slot Management**

```sql
-- Flexible slot configuration
ALTER TABLE interview_slot
ADD COLUMN slot_type VARCHAR(50) DEFAULT 'FIXED',
ADD COLUMN recurrence_pattern JSON,
ADD COLUMN buffer_before INTEGER DEFAULT 0,
ADD COLUMN buffer_after INTEGER DEFAULT 0,
ADD COLUMN max_capacity INTEGER DEFAULT 1,
ADD COLUMN current_bookings INTEGER DEFAULT 0,
ADD COLUMN is_flexible BOOLEAN DEFAULT FALSE,
ADD COLUMN flexible_window_start TIME,
ADD COLUMN flexible_window_end TIME,
ADD COLUMN auto_cancel_if_empty BOOLEAN DEFAULT FALSE,
ADD COLUMN auto_cancel_threshold_hours INTEGER,
ADD COLUMN created_by_interviewer BOOLEAN DEFAULT FALSE;

-- Interviewer slot preferences
CREATE TABLE interviewer_slot_preferences (
    id BIGSERIAL PRIMARY KEY,
    interviewer_id BIGINT REFERENCES users(id) UNIQUE,
    working_days INTEGER[], -- Array of day numbers (0-6)
    working_hours_start TIME,
    working_hours_end TIME,
    timezone VARCHAR(100),
    preferred_duration_minutes INTEGER DEFAULT 60,
    buffer_time_minutes INTEGER DEFAULT 15,
    max_slots_per_day INTEGER DEFAULT 8,
    auto_scheduling_enabled BOOLEAN DEFAULT FALSE,
    advance_booking_days INTEGER DEFAULT 30,
    notification_preferences JSON,
    created_at BIGINT,
    updated_at BIGINT
);

-- Slot templates for interviewers
CREATE TABLE slot_templates (
    id BIGSERIAL PRIMARY KEY,
    interviewer_id BIGINT REFERENCES users(id),
    template_name VARCHAR(255),
    step_id BIGINT REFERENCES workflow_steps(id),
    slot_configuration JSON,
    is_active BOOLEAN DEFAULT TRUE,
    created_at BIGINT,
    updated_at BIGINT
);
```

### **3. Admin Override Audit**

```sql
-- Admin override audit log
CREATE TABLE admin_step_overrides (
    id BIGSERIAL PRIMARY KEY,
    admin_id BIGINT REFERENCES users(id),
    candidate_id BIGINT REFERENCES users(id),
    pipeline_id BIGINT REFERENCES candidate_pipeline(id),
    previous_step_order INTEGER,
    new_step_order INTEGER,
    bypassed_steps INTEGER[],
    reason TEXT NOT NULL,
    approval_required BOOLEAN DEFAULT FALSE,
    approved_by BIGINT REFERENCES users(id),
    approved_at BIGINT,
    created_at BIGINT,
    
    FOREIGN KEY (admin_id) REFERENCES users(id),
    FOREIGN KEY (candidate_id) REFERENCES users(id),
    FOREIGN KEY (pipeline_id) REFERENCES candidate_pipeline(id)
);

CREATE INDEX idx_admin_overrides_candidate 
ON admin_step_overrides(candidate_id, created_at DESC);

CREATE INDEX idx_admin_overrides_admin 
ON admin_step_overrides(admin_id, created_at DESC);
```

---

## 🔧 **API Endpoints**

### **1. Step Progression APIs**

```typescript
// Check if candidate can proceed to step
GET /api/pipeline/{pipelineId}/can-proceed-to-step/{stepOrder}
Response: {
  canProceed: boolean
  blockingStep?: BlockingStepInfo
  passedSteps: number[]
  requiredSteps: number[]
}

// Admin override step progression
POST /api/admin/pipeline/{pipelineId}/override-step
Body: {
  targetStepOrder: number
  reason: string
  bypassedSteps?: number[]
  notifyCandidate?: boolean
  notifyInterviewer?: boolean
}
Response: {
  success: boolean
  newStepOrder: number
  auditLogId: string
}

// Get progression status
GET /api/pipeline/{pipelineId}/progression-status
Response: {
  currentStep: number
  completedSteps: number[]
  blockedSteps: number[]
  canProceed: boolean
  nextAvailableStep?: number
}
```

### **2. Enhanced Slot APIs**

```typescript
// Interviewer create slot
POST /api/interviewer/slots/create
Body: {
  stepId: string
  startsAt: string
  endsAt: string
  capacity?: number
  slotType?: 'FIXED' | 'FLEXIBLE' | 'RECURRING'
  recurrencePattern?: RecurrencePattern
}
Response: {
  slotId: string
  slots: Slot[]
}

// Interviewer modify slot
PUT /api/interviewer/slots/{slotId}
Body: {
  startsAt?: string
  endsAt?: string
  capacity?: number
  isBlocked?: boolean
}
Response: {
  success: boolean
  slot: Slot
}

// Interviewer bulk create slots
POST /api/interviewer/slots/bulk-create
Body: {
  stepId: string
  dateRange: { start: string, end: string }
  timeSlots: TimeSlot[]
  capacity: number
  excludeWeekends?: boolean
}
Response: {
  createdSlots: Slot[]
  count: number
}

// Get interviewer slot preferences
GET /api/interviewer/slot-preferences
Response: {
  preferences: InterviewerSlotPreferences
}

// Update interviewer slot preferences
PUT /api/interviewer/slot-preferences
Body: {
  workingDays?: number[]
  workingHours?: TimeRange
  timezone?: string
  autoScheduling?: AutoSchedulingConfig
}
Response: {
  success: boolean
  preferences: InterviewerSlotPreferences
}

// Smart slot suggestions for candidate
GET /api/slots/suggestions?candidateId={id}&stepId={id}
Response: {
  suggestions: SlotSuggestion[]
  matchScore: number
}

// Admin create slots for interviewer
POST /api/admin/slots/create-for-interviewer
Body: {
  interviewerId: string
  stepId: string
  slots: SlotInput[]
}
Response: {
  createdSlots: Slot[]
}

// Admin override slot assignment
POST /api/admin/slots/{slotId}/force-assign
Body: {
  candidateId: string
  bypassProgressionCheck?: boolean
  reason?: string
}
Response: {
  success: boolean
  booking: SlotBooking
}
```

### **3. Booking with Progression Validation**

```typescript
// Book slot (with progression check)
POST /api/slots/{slotId}/book
Body: {
  candidateId: string
  applicationId: string
}
Response: {
  success: boolean
  booking?: SlotBooking
  error?: {
    code: 'PROGRESSION_BLOCKED' | 'SLOT_FULL' | 'CONFLICT'
    message: string
    blockingStep?: BlockingStepInfo
  }
}

// Admin force booking (bypass progression)
POST /api/admin/slots/{slotId}/force-booking
Body: {
  candidateId: string
  applicationId: string
  reason: string
  bypassProgressionCheck: boolean
}
Response: {
  success: boolean
  booking: SlotBooking
  auditLogId: string
}
```

---

## 💡 **My Additional Ideas**

### **1. Intelligent Slot Optimization**

```typescript
interface SlotOptimization {
  // Auto-fill empty slots
  autoFillEmptySlots: {
    enabled: boolean
    threshold: number // hours before slot
    candidatePool: 'WAITING' | 'ALL_ELIGIBLE'
  }
  
  // Load balancing
  loadBalancing: {
    distributeEvenly: boolean
    considerInterviewerExpertise: boolean
    preventOverload: boolean
    maxDailySlotsPerInterviewer: number
  }
  
  // Time zone optimization
  timezoneOptimization: {
    matchCandidateTimezone: boolean
    suggestOptimalTimes: boolean
    avoidOffHours: boolean
  }
}
```

### **2. Slot Conflict Resolution**

```typescript
interface ConflictResolution {
  // Automatic conflict detection
  detectConflicts: {
    interviewerDoubleBooking: boolean
    candidateDoubleBooking: boolean
    timeOverlap: boolean
    capacityExceeded: boolean
  }
  
  // Resolution strategies
  resolutionStrategies: {
    autoReschedule: boolean
    suggestAlternatives: boolean
    notifyStakeholders: boolean
    escalateToAdmin: boolean
  }
  
  // Prevention
  prevention: {
    realTimeValidation: boolean
    lockSlotsDuringBooking: boolean
    queueSystem: boolean
  }
}
```

### **3. Candidate Self-Service Slot Booking**

```typescript
interface CandidateSelfService {
  // Candidate can book their own slots
  selfServiceBooking: {
    enabled: boolean
    requireProgressionCheck: boolean
    showAvailableSlots: boolean
    allowRescheduling: boolean
    cancellationPolicy: CancellationPolicy
  }
  
  // Slot visibility
  slotVisibility: {
    showAllAvailable: boolean
    showOnlyEligible: boolean // Based on step progression
    showInterviewerInfo: boolean
    showLocationDetails: boolean
  }
  
  // Booking assistance
  bookingAssistance: {
    suggestBestSlots: boolean
    showCalendarView: boolean
    sendConfirmation: boolean
    sendReminders: boolean
  }
}
```

### **4. Step Progression Analytics**

```typescript
interface ProgressionAnalytics {
  // Bottleneck detection
  bottleneckDetection: {
    identifyBlockingSteps: boolean
    calculateAverageWaitTime: boolean
    suggestOptimizations: boolean
  }
  
  // Success rate tracking
  successRateTracking: {
    stepPassRate: number
    progressionRate: number
    dropoffPoints: number[]
    averageTimePerStep: number
  }
  
  // Admin override analytics
  overrideAnalytics: {
    overrideFrequency: number
    successRate: number
    commonReasons: string[]
    impactAnalysis: ImpactAnalysis
  }
}
```

### **5. Mobile Slot Management**

```typescript
interface MobileSlotManagement {
  // Interviewer mobile app
  interviewerMobile: {
    viewMySlots: boolean
    createQuickSlot: boolean
    modifySlot: boolean
    cancelSlot: boolean
    viewBookings: boolean
    checkInCandidate: boolean
  }
  
  // Push notifications
  pushNotifications: {
    newBooking: boolean
    cancellation: boolean
    reminder: boolean
    slotConflict: boolean
  }
  
  // Offline capability
  offlineCapability: {
    cacheSlots: boolean
    syncWhenOnline: boolean
    queueActions: boolean
  }
}
```

---

## 🎯 **Implementation Priority**

### **Phase 1: Core Features (Month 1)**
- [ ] Step progression validation logic
- [ ] Admin override functionality
- [ ] Basic interviewer slot creation
- [ ] Progression blocking UI

### **Phase 2: Enhanced Flexibility (Month 2)**
- [ ] Interviewer slot preferences
- [ ] Bulk slot creation
- [ ] Slot modification capabilities
- [ ] Smart slot suggestions

### **Phase 3: Intelligence & Automation (Month 3)**
- [ ] AI-powered slot optimization
- [ ] Conflict detection and resolution
- [ ] Candidate self-service booking
- [ ] Mobile slot management

---

This enhanced slot system and step progression framework will provide maximum flexibility for interviewers while maintaining strict quality control through progression rules, with admin override capabilities for exceptional cases.
