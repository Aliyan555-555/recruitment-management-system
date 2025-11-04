# Database Relations Documentation
## Recruitment Management System

**Version:** 1.0  
**Last Updated:** October 28, 2025

---

## Table of Contents

1. [Overview](#overview)
2. [Relation Types](#relation-types)
3. [Module Relations](#module-relations)
4. [Detailed Relationship Mappings](#detailed-relationship-mappings)
5. [Cascade Rules](#cascade-rules)
6. [Query Examples](#query-examples)

---

## Overview

This document details all relationships between tables in the Recruitment Management System database. Understanding these relations is crucial for:

- Writing efficient queries
- Understanding data dependencies
- Implementing proper cascade rules
- Maintaining data integrity

### Relationship Summary

- **Total Relations**: 52
- **One-to-Many Relations**: 45
- **Many-to-One Relations**: 45
- **One-to-One Relations**: 0
- **Many-to-Many Relations**: 0 (implemented via junction tables)

---

## Relation Types

### One-to-Many (1:N)
A record in Table A can have multiple related records in Table B, but a record in Table B belongs to only one record in Table A.

**Example:** One User can have many UserEducation records.

### Many-to-One (N:1)
The inverse of One-to-Many from the child table's perspective.

**Example:** Many UserEducation records belong to one User.

### Self-Referencing
A table that references itself.

**Example:** User table references itself for created_by and updated_by in Job table.

---

## Module Relations

### 1. User Management Relations

```
User (Central Entity)
│
├─── has many ──→ UserEducation
│                 └─── belongs to ──→ UserEducationLevel
│                 └─── belongs to ──→ Institute (optional)
│
├─── has many ──→ UserSkills
│
├─── has many ──→ UserInfoData
│                 └─── belongs to ──→ UserInfoField
│                                     └─── belongs to ──→ UserInfoCategory
│
├─── has many ──→ CvManagerCv
│
├─── has many ──→ GalleryCv
│
├─── has many ──→ JobsApplied
│                 └─── belongs to ──→ Job
│                 └─── belongs to ──→ CvManagerCv
│
├─── has many ──→ JobsBookmark
│                 └─── belongs to ──→ Job
│
├─── has many ──→ BrAppointment
├─── has many ──→ ScreeningInterview
├─── has many ──→ FocusGroupInterview
├─── has many ──→ FinalInterview
├─── has many ──→ LetterOfIntent
│
├─── has many ──→ UtTest (as test taker)
│
├─── creates many ──→ Job (as creator)
├─── updates many ──→ Job (as updater)
│
├─── creates many ──→ UtTest (as creator)
└─── updates many ──→ UtTest (as updater)
```

---

### 2. Jobs Module Relations

```
Job
│
├─── belongs to ──→ User (creator)
├─── belongs to ──→ User (updater, optional)
├─── belongs to ──→ UserEducationLevel (minimum education, optional)
│
├─── has many ──→ JobSkill
├─── has many ──→ JobsApplied
│                 └─── belongs to ──→ User
│                 └─── belongs to ──→ CvManagerCv
│
├─── has many ──→ JobsBookmark
│                 └─── belongs to ──→ User
│
└─── has many ──→ UtTest
                  └─── belongs to ──→ User (test taker)
                  └─── belongs to ──→ User (creator)
                  └─── belongs to ──→ User (updater, optional)
```

---

### 3. CV Manager Relations

```
CvManager
└─── has many ──→ CvManagerImageMeta

CvManagerCv
├─── belongs to ──→ User
└─── has many ──→ JobsApplied
```

---

### 4. Gallery Relations

```
Gallery
└─── has many ──→ GalleryImageMeta

GalleryCv
└─── belongs to ──→ User
```

---

### 5. Recruitment Process Relations

```
Recruitment Process Tables:
├─── BrAppointment ──→ belongs to User
├─── ScreeningInterview ──→ belongs to User
├─── FocusGroupInterview ──→ belongs to User
├─── FinalInterview ──→ belongs to User
└─── LetterOfIntent ──→ belongs to User

All grouped by batch_id (logical grouping, not FK)
```

---

## Detailed Relationship Mappings

### User → UserEducation (1:N)

**Type:** One-to-Many with Cascade Delete

**Foreign Key:** `UserEducation.userId → User.id`

**Cascade Rule:** ON DELETE CASCADE

**Prisma Relation:**
```prisma
// In User model
educations UserEducation[]

// In UserEducation model
user User @relation(fields: [userId], references: [id], onDelete: Cascade)
```

**Description:** A user can have multiple educational qualifications. When a user is deleted, all their education records are automatically deleted.

**Example Query:**
```typescript
// Get user with all educations
const user = await prisma.user.findUnique({
  where: { id: userId },
  include: { educations: true }
});
```

---

### UserEducation → UserEducationLevel (N:1)

**Type:** Many-to-One

**Foreign Key:** `UserEducation.educationLevelId → UserEducationLevel.id`

**Cascade Rule:** Restrict (cannot delete education level if in use)

**Prisma Relation:**
```prisma
// In UserEducation model
educationLevel UserEducationLevel @relation(fields: [educationLevelId], references: [id])

// In UserEducationLevel model
userEducations UserEducation[]
```

**Description:** Multiple education records can reference the same education level (e.g., multiple Bachelor's degrees).

---

### UserEducation → Institute (N:1, Optional)

**Type:** Many-to-One (Optional)

**Foreign Key:** `UserEducation.instituteId → Institute.id`

**Cascade Rule:** Restrict

**Prisma Relation:**
```prisma
// In UserEducation model
instituteRef Institute? @relation(fields: [instituteId], references: [id])

// In Institute model
educations UserEducation[]
```

**Description:** Education can optionally reference a predefined institute. If not in the list, the text field is used instead.

---

### User → UserSkills (1:N)

**Type:** One-to-Many with Cascade Delete

**Foreign Key:** `UserSkills.userId → User.id`

**Cascade Rule:** ON DELETE CASCADE

**Description:** A user can have multiple skills with proficiency levels. Skills are deleted when the user is deleted.

---

### UserInfoData → UserInfoField (N:1)

**Type:** Many-to-One

**Foreign Key:** `UserInfoData.fieldId → UserInfoField.id`

**Cascade Rule:** Restrict

**Description:** Custom field values reference field definitions. Multiple users can have data for the same field.

---

### UserInfoField → UserInfoCategory (N:1)

**Type:** Many-to-One

**Foreign Key:** `UserInfoField.categoryId → UserInfoCategory.id`

**Cascade Rule:** Restrict

**Description:** Fields are organized into categories for better UI organization.

---

### Job → User (Creator) (N:1)

**Type:** Many-to-One (Self-referencing via User)

**Foreign Key:** `Job.createdBy → User.id`

**Cascade Rule:** Restrict (cannot delete user who created jobs)

**Prisma Relation:**
```prisma
// In Job model
creator User @relation("JobCreator", fields: [createdBy], references: [id])

// In User model
jobsCreated Job[] @relation("JobCreator")
```

**Description:** Tracks which user created each job posting. Named relation to distinguish from updater.

---

### Job → User (Updater) (N:1, Optional)

**Type:** Many-to-One (Self-referencing via User, Optional)

**Foreign Key:** `Job.updatedBy → User.id`

**Cascade Rule:** Restrict

**Prisma Relation:**
```prisma
// In Job model
updater User? @relation("JobUpdater", fields: [updatedBy], references: [id])

// In User model
jobsUpdated Job[] @relation("JobUpdater")
```

**Description:** Tracks which user last updated each job posting.

---

### Job → UserEducationLevel (N:1, Optional)

**Type:** Many-to-One (Optional)

**Foreign Key:** `Job.minimumEducationId → UserEducationLevel.id`

**Cascade Rule:** Restrict

**Description:** Specifies minimum education requirement for the job.

---

### Job → JobSkill (1:N)

**Type:** One-to-Many with Cascade Delete

**Foreign Key:** `JobSkill.jobId → Job.id`

**Cascade Rule:** ON DELETE CASCADE

**Description:** A job can require multiple skills. Skills are deleted when the job is deleted.

---

### JobsApplied → Job (N:1)

**Type:** Many-to-One with Cascade Delete

**Foreign Key:** `JobsApplied.jobId → Job.id`

**Cascade Rule:** ON DELETE CASCADE

**Description:** Multiple users can apply to one job. Applications are deleted when the job is deleted.

**Unique Constraint:** (jobId, userId) - One application per user per job

---

### JobsApplied → User (N:1)

**Type:** Many-to-One with Cascade Delete

**Foreign Key:** `JobsApplied.userId → User.id`

**Cascade Rule:** ON DELETE CASCADE

**Description:** A user can apply to multiple jobs. Applications are deleted when the user is deleted.

---

### JobsApplied → CvManagerCv (N:1)

**Type:** Many-to-One

**Foreign Key:** `JobsApplied.cvId → CvManagerCv.id`

**Cascade Rule:** Restrict

**Description:** Each application uses a specific CV. The CV cannot be hard-deleted while referenced by applications.

---

### JobsBookmark → Job (N:1)

**Type:** Many-to-One with Cascade Delete

**Foreign Key:** `JobsBookmark.jobId → Job.id`

**Cascade Rule:** ON DELETE CASCADE

**Description:** Users can bookmark jobs for later. Bookmarks are deleted when the job is deleted.

**Unique Constraint:** (jobId, userId) - One bookmark per user per job

---

### JobsBookmark → User (N:1)

**Type:** Many-to-One with Cascade Delete

**Foreign Key:** `JobsBookmark.userId → User.id`

**Cascade Rule:** ON DELETE CASCADE

**Description:** A user can bookmark multiple jobs. Bookmarks are deleted when the user is deleted.

---

### CvManagerCv → User (N:1)

**Type:** Many-to-One with Cascade Delete

**Foreign Key:** `CvManagerCv.userId → User.id`

**Cascade Rule:** ON DELETE CASCADE

**Description:** A user can upload multiple CVs. CVs are deleted when the user is deleted.

---

### CvManagerImageMeta → CvManager (N:1)

**Type:** Many-to-One with Cascade Delete

**Foreign Key:** `CvManagerImageMeta.cvmanagerId → CvManager.id`

**Cascade Rule:** ON DELETE CASCADE

**Description:** A CV manager gallery can contain multiple images. Images are deleted when the gallery is deleted.

---

### GalleryCv → User (N:1)

**Type:** Many-to-One with Cascade Delete

**Foreign Key:** `GalleryCv.userId → User.id`

**Cascade Rule:** ON DELETE CASCADE

**Description:** A user can upload multiple gallery CVs.

---

### GalleryImageMeta → Gallery (N:1)

**Type:** Many-to-One with Cascade Delete

**Foreign Key:** `GalleryImageMeta.galleryId → Gallery.id`

**Cascade Rule:** ON DELETE CASCADE

**Description:** A gallery can contain multiple images with metadata.

---

### Interview Tables → User (N:1)

**Applies to:**
- BrAppointment
- ScreeningInterview
- FocusGroupInterview
- FinalInterview
- LetterOfIntent

**Type:** Many-to-One with Cascade Delete

**Foreign Key:** `[Table].userId → User.id`

**Cascade Rule:** ON DELETE CASCADE

**Description:** Each interview/appointment record belongs to one candidate. Records are deleted when the user is deleted.

**Logical Grouping:** All records also have a `batchId` field for grouping by recruitment batch (not a foreign key).

---

### UtTest → Job (N:1)

**Type:** Many-to-One with Cascade Delete

**Foreign Key:** `UtTest.jobId → Job.id`

**Cascade Rule:** ON DELETE CASCADE

**Description:** Tests are associated with specific jobs. Tests are deleted when the job is deleted.

---

### UtTest → User (Test Taker) (N:1)

**Type:** Many-to-One with Cascade Delete

**Foreign Key:** `UtTest.userId → User.id`

**Cascade Rule:** ON DELETE CASCADE

**Prisma Relation:**
```prisma
user User @relation("TestTaker", fields: [userId], references: [id], onDelete: Cascade)
```

**Description:** Tracks which user is taking the test.

---

### UtTest → User (Creator) (N:1)

**Type:** Many-to-One (Self-referencing)

**Foreign Key:** `UtTest.createdBy → User.id`

**Cascade Rule:** Restrict

**Prisma Relation:**
```prisma
creator User @relation("TestCreator", fields: [createdBy], references: [id])
```

**Description:** Tracks which admin/user created the test.

---

### UtTest → User (Updater) (N:1, Optional)

**Type:** Many-to-One (Self-referencing, Optional)

**Foreign Key:** `UtTest.updatedBy → User.id`

**Cascade Rule:** Restrict

**Prisma Relation:**
```prisma
updater User? @relation("TestUpdater", fields: [updatedBy], references: [id])
```

**Description:** Tracks which user last updated the test.

---

## Cascade Rules

### DELETE CASCADE

**When parent is deleted, children are automatically deleted:**

| Parent Table | Child Table | Reason |
|--------------|-------------|---------|
| User | UserEducation | Personal data belongs to user |
| User | UserSkills | Personal data belongs to user |
| User | UserInfoData | Personal data belongs to user |
| User | CvManagerCv | Documents belong to user |
| User | GalleryCv | Documents belong to user |
| User | JobsApplied | Applications belong to user |
| User | JobsBookmark | Bookmarks belong to user |
| User | BrAppointment | Appointment records belong to candidate |
| User | ScreeningInterview | Interview records belong to candidate |
| User | FocusGroupInterview | Interview records belong to candidate |
| User | FinalInterview | Interview records belong to candidate |
| User | LetterOfIntent | Letters belong to candidate |
| User | UtTest (as test taker) | Test results belong to test taker |
| Job | JobSkill | Skills are part of job definition |
| Job | JobsApplied | Applications tied to job |
| Job | JobsBookmark | Bookmarks tied to job |
| Job | UtTest | Tests tied to job |
| CvManager | CvManagerImageMeta | Images belong to gallery |
| Gallery | GalleryImageMeta | Images belong to gallery |

---

### RESTRICT (No Cascade)

**Parent cannot be deleted if children exist:**

| Parent Table | Child Table | Reason |
|--------------|-------------|---------|
| User | Job (as creator) | Preserve audit trail of who created jobs |
| User | Job (as updater) | Preserve audit trail of who updated jobs |
| User | UtTest (as creator) | Preserve audit trail of test creators |
| User | UtTest (as updater) | Preserve audit trail of test updaters |
| UserEducationLevel | UserEducation | Cannot delete education level in use |
| UserEducationLevel | Job | Cannot delete education level in use |
| Institute | UserEducation | Cannot delete institute in use |
| UserInfoCategory | UserInfoField | Cannot delete category with fields |
| UserInfoField | UserInfoData | Cannot delete field with data |
| CvManagerCv | JobsApplied | Cannot hard-delete CV used in applications |

---

## Query Examples

### Get User with All Related Data

```typescript
const userProfile = await prisma.user.findUnique({
  where: { id: userId },
  include: {
    educations: {
      include: {
        educationLevel: true,
        instituteRef: true
      }
    },
    skills: true,
    infoData: {
      include: {
        field: {
          include: {
            category: true
          }
        }
      }
    },
    cvs: {
      where: { deletedAt: null }
    },
    jobsApplied: {
      include: {
        job: true,
        cv: true
      }
    },
    jobsBookmarked: true
  }
});
```

---

### Get Job with Applications and Test Results

```typescript
const jobWithCandidates = await prisma.job.findUnique({
  where: { id: jobId },
  include: {
    skills: true,
    applications: {
      include: {
        user: {
          select: {
            id: true,
            firstname: true,
            lastname: true,
            email: true,
            educations: true,
            skills: true
          }
        },
        cv: true
      }
    },
    tests: {
      include: {
        user: true
      }
    },
    creator: {
      select: {
        id: true,
        firstname: true,
        lastname: true
      }
    }
  }
});
```

---

### Get Candidate's Recruitment Progress

```typescript
const candidateProgress = await prisma.user.findUnique({
  where: { id: candidateId },
  include: {
    jobsApplied: {
      include: {
        job: true
      }
    },
    utTests: true,
    screeningInterviews: true,
    focusGroupInterviews: true,
    finalInterviews: true,
    lettersOfIntent: true,
    appointments: true
  }
});
```

---

### Get Jobs Created by User

```typescript
const userJobs = await prisma.job.findMany({
  where: {
    createdBy: userId,
    deletedAt: null
  },
  include: {
    skills: true,
    applications: {
      where: {
        status: 'SUBMITTED'
      }
    },
    minimumEducation: true
  },
  orderBy: {
    createdAt: 'desc'
  }
});
```

---

### Complex Query: Match Candidates to Job

```typescript
// Find candidates matching job requirements
const matchingCandidates = await prisma.user.findMany({
  where: {
    suspended: false,
    deletedAt: null,
    educations: {
      some: {
        educationLevelId: {
          gte: job.minimumEducationId // Assuming higher ID = higher education
        }
      }
    },
    skills: {
      some: {
        skillName: {
          in: job.skills.map(s => s.skillName)
        }
      }
    }
  },
  include: {
    educations: {
      include: {
        educationLevel: true
      }
    },
    skills: true,
    cvs: {
      where: { deletedAt: null },
      take: 1,
      orderBy: { updatedAt: 'desc' }
    }
  }
});
```

---

### Aggregate Query: Job Statistics

```typescript
const jobStats = await prisma.job.findUnique({
  where: { id: jobId },
  include: {
    _count: {
      select: {
        applications: true,
        bookmarks: true,
        tests: true,
        skills: true
      }
    },
    applications: {
      select: {
        status: true
      }
    }
  }
});

// Calculate status breakdown
const statusBreakdown = jobStats.applications.reduce((acc, app) => {
  acc[app.status] = (acc[app.status] || 0) + 1;
  return acc;
}, {} as Record<string, number>);
```

---

### Transaction Example: Create Job with Skills

```typescript
const newJob = await prisma.$transaction(async (tx) => {
  // Create job
  const job = await tx.job.create({
    data: {
      title: "Senior Developer",
      company: "Tech Corp",
      employmentType: "Permanent",
      createdBy: userId,
      createdAt: BigInt(Date.now()),
      updatedAt: BigInt(Date.now()),
      postFrom: new Date(),
      postTo: new Date('2025-12-31'),
      // ... other fields
    }
  });

  // Create associated skills
  await tx.jobSkill.createMany({
    data: [
      { jobId: job.id, skillName: "React" },
      { jobId: job.id, skillName: "TypeScript" },
      { jobId: job.id, skillName: "Node.js" }
    ]
  });

  return job;
});
```

---

## Best Practices

### 1. Always Include Soft Delete Checks

```typescript
// Good
const activeJobs = await prisma.job.findMany({
  where: { deletedAt: null }
});

// Bad - includes deleted records
const jobs = await prisma.job.findMany();
```

---

### 2. Use Transactions for Multi-Table Operations

```typescript
await prisma.$transaction([
  prisma.job.update({ where: { id }, data: { status: false } }),
  prisma.jobsApplied.updateMany({
    where: { jobId: id },
    data: { status: 'Removed' }
  })
]);
```

---

### 3. Select Only Required Fields

```typescript
// Good - minimal data transfer
const users = await prisma.user.findMany({
  select: {
    id: true,
    firstname: true,
    lastname: true,
    email: true
  }
});

// Bad - fetches all fields
const users = await prisma.user.findMany();
```

---

### 4. Use Proper Indexes for Queries

All foreign keys are already indexed. For custom queries, consider adding indexes:

```prisma
@@index([status, deletedAt]) // Compound index for common filters
```

---

### 5. Handle BigInt Timestamps Properly

```typescript
// Convert to Date object
const createdDate = new Date(Number(user.createdAt));

// Store current timestamp
const now = BigInt(Date.now());
```

---

## Relationship Validation

### Required Checks Before Deletion

**Before deleting User (if not cascading):**
1. Check if user has created any jobs
2. Check if user has updated any jobs
3. Check if user has created any tests
4. Consider soft delete instead

**Before deleting Job:**
1. No need to check - cascade handles cleanup
2. Consider soft delete for audit trail

**Before deleting UserEducationLevel:**
1. Check if any UserEducation uses it
2. Check if any Job requires it

**Before deleting Institute:**
1. Check if any UserEducation references it

---

**End of Document**

