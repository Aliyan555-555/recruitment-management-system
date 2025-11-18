# Recruitment Management System - User Guide

## Table of Contents
1. [Overview](#overview)
2. [Role-Based Access](#role-based-access)
3. [Job Types](#job-types)
4. [Candidate Guide](#candidate-guide)
5. [Admin Guide](#admin-guide)
6. [Interviewer Guide](#interviewer-guide)
7. [Workflow Diagrams](#workflow-diagrams)

---

## Overview

The Recruitment Management System supports two types of hiring processes:
- **Normal Hiring**: Individual candidate progression through interview stages
- **Bulk Hiring**: Batch-based evaluation with admin shortlisting

---

## Role-Based Access

### Candidate
- Apply to jobs
- View application status
- Track interview progress
- Upload CVs

### Admin
- Create and manage jobs
- Shortlist candidates (Bulk Hiring)
- Create and manage batches (Bulk Hiring)
- View all candidates and applications
- Monitor recruitment pipeline

### Interviewer
- Evaluate assigned candidates
- Review batch candidates (Bulk Hiring)
- Submit evaluations and feedback
- View candidate profiles and CVs

---

## Job Types

### Normal Hiring
- Candidates apply anytime during the posting period
- Individual progression through interview stages
- Interviewers evaluate candidates one at a time
- Automatic advancement to next stage upon completion

### Bulk Hiring
- Candidates apply until job end date
- All applications go to "Applied" status
- After end date, job status changes to "Admin Shortlisting"
- Admin must shortlist candidates before interviews begin
- All interview stages use batch processing
- Admin creates batches and manages progression

---

## Candidate Guide

### Applying to Jobs

#### Step 1: Browse Available Jobs
1. Navigate to the Jobs page
2. View job listings with details:
   - Job title and company
   - Job type (Normal or Bulk Hiring)
   - Posting period
   - Required skills
   - Location

#### Step 2: Apply to a Job

**For Normal Hiring Jobs:**
1. Click "Apply" on the job listing
2. Select your CV from the dropdown
3. Submit application
4. **Immediate Action**: Your application is created and pipeline starts automatically
5. You'll receive a confirmation email
6. Interview process begins immediately

**For Bulk Hiring Jobs:**
1. Click "Apply" on the job listing
2. Select your CV from the dropdown
3. Submit application
4. **Status**: Application goes to "Applied" status
5. You'll receive a confirmation email
6. **Wait Period**: No interviews until after job end date
7. After end date, admin will review and shortlist candidates

#### Step 3: Track Application Status

**Normal Hiring Status Flow:**
- `SUBMITTED` → Application received
- `IN_PROGRESS` → Interview process started
- `PENDING` → Waiting for interviewer evaluation
- `COMPLETED` → All interviews completed
- `REJECTED` → Not selected

**Bulk Hiring Status Flow:**
- `APPLIED` → Application submitted (waiting for end date)
- `SHORTLISTED` → Selected by admin for interviews
- `BATCH_ASSIGNED` → Assigned to a batch for evaluation
- `REJECTED` → Not shortlisted or rejected during process

#### Step 4: Interview Process

**Normal Hiring:**
- You'll receive notifications for each interview stage
- Interviewers evaluate you individually
- Automatic progression to next stage upon completion
- Receive email notifications for each step

**Bulk Hiring:**
- After shortlisting, you're assigned to Batch 1
- Interviewer evaluates you along with other candidates in the batch
- Admin reviews batch results and creates next batch
- Process continues through all interview stages

---

## Admin Guide

### Creating Jobs

#### Step 1: Create New Job
1. Navigate to **Admin → Jobs → Create New Job**
2. Fill in job details:
   - **Job Title** (required)
   - **Job Type**: Select "Normal Hiring" or "Bulk Hiring"
   - **Company** (auto-filled from organization settings)
   - **Description** (required)
   - **Post From** and **Post To** dates (required)
   - **Employment Type**, **Locations**, **Skills**, etc.

#### Step 2: Configure Workflow Steps
1. Add interview workflow steps:
   - **Step Name** (e.g., "Technical Interview", "HR Interview")
   - **Step Type** (optional)
   - **Duration** (optional)
   - **Interview Mode** (Onsite/Remote)
   - **Meeting Link** (required for Remote)
   - **Assigned Interviewer(s)**
   - **Evaluation Criteria** (optional)

2. Configure step properties:
   - **Required**: Step must be completed
   - **Skippable**: Step can be skipped with reason

#### Step 3: Publish Job
1. Review all information
2. Set status to "Active"
3. Click "Create Job"
4. Job is now live and accepting applications

### Managing Normal Hiring Jobs

#### Viewing Applications
1. Navigate to **Admin → Jobs → [Job Title]**
2. Click "View Candidates" to see all applicants
3. View candidate details:
   - Personal information
   - CV
   - Application status
   - Pipeline progress

#### Monitoring Pipeline
- View individual candidate progress through interview stages
- See which step each candidate is currently on
- Track completion status

#### Manual Actions
- View candidate profiles
- Access CVs
- Monitor interview progress
- No batch management needed (individual progression)

### Managing Bulk Hiring Jobs

#### Phase A: Pre-End Date (Application Period)
1. **Job Status**: `ACTIVE`
2. Candidates can apply until `postTo` date
3. All applications go to `APPLIED` status
4. No interviews yet - just collecting applications

#### Phase B: Post-End Date (Shortlisting Phase)
1. **Automatic Transition**: When `postTo` date passes:
   - Job status changes to `ADMIN_SHORTLISTING`
   - No new applications accepted
   - Admin can now shortlist candidates

2. **Shortlisting Candidates**:
   - Navigate to **Admin → Jobs → [Job Title] → Shortlist**
   - View all applicants with their CVs
   - Select candidates to shortlist or reject
   - Click "Submit Shortlisting Decisions"
   - Shortlisted candidates receive notification

#### Phase C: Batch Creation and Management

**Creating Batch 1 (First Interview Step):**
1. Navigate to **Admin → Jobs → [Job Title] → Batches**
2. Click "Create Batch for Step 1"
3. Select shortlisted candidates
4. Choose workflow step (usually Step 1)
5. Enter batch name (optional)
6. Click "Create Batch"
7. Batch status: `PENDING_ADMIN`

**Approving Batch for Interviewer:**
1. View batch details
2. Review candidate list
3. Change batch status to `IN_PROGRESS`
4. Interviewer receives notification

**Creating Subsequent Batches:**
1. After interviewer completes batch evaluation:
   - Batch status becomes `PENDING_ADMIN`
   - Admin reviews results
2. View candidates marked as "SELECTED" from previous batch
3. Click "Create Batch for Step [Next Step]"
4. System auto-selects candidates marked "SELECTED"
5. Admin can manually adjust selection
6. Create batch for next workflow step
7. Repeat until final step

**Final Selection:**
- After final interview step, all "SELECTED" candidates are final
- Admin can view final selected list
- Process complete

### Batch Management Actions

#### View Batch Details
- See all candidates in batch
- View evaluation status
- Check individual candidate evaluations

#### Update Batch Status
- `PENDING_ADMIN`: Waiting for admin approval
- `IN_PROGRESS`: Ready for interviewer evaluation
- `COMPLETED`: All evaluations done
- `CANCELLED`: Batch cancelled

#### Monitor Progress
- Track batch completion
- View candidate evaluation results
- Review interviewer feedback

---

## Interviewer Guide

### Normal Hiring - Individual Evaluations

#### Receiving Assignments
1. **Notifications**: Receive notification when assigned a candidate
2. **View Assignments**: Navigate to **Interviewer → Assignments**
3. See list of candidates assigned to you:
   - Candidate name and job title
   - Current step and status
   - Job details

#### Evaluating a Candidate
1. Click on assignment to view details
2. Review candidate information:
   - Personal details
   - CV (download/view)
   - Previous interview feedback (if any)
3. Conduct interview
4. Submit evaluation:
   - **Status**: Select, Reject, or Review
   - **Feedback**: Enter detailed feedback
   - **Rating**: Provide rating (if applicable)
5. Click "Submit Evaluation"
6. **Automatic Progression**: If selected, candidate automatically moves to next step

### Bulk Hiring - Batch Evaluations

#### Receiving Batch Assignments
1. **Notifications**: Receive notification when batch is ready
2. **View Batches**: Navigate to **Interviewer → Assignments → Bulk Hiring Batches**
3. See batches assigned to you:
   - Batch name and number
   - Job title and step
   - Number of candidates
   - Batch status

#### Evaluating Batch Candidates
1. Click on batch to view details
2. See all candidates in the batch:
   - Candidate names and emails
   - CV links
   - Current evaluation status

3. **Evaluate Each Candidate**:
   - For each candidate, select:
     - **Selected**: Candidate passes this stage
     - **Rejected**: Candidate doesn't pass
     - **Review**: Needs further review
   - Enter **Rating** (1-5, optional)
   - Enter **Feedback** (detailed comments)

4. **Submit Batch Evaluation**:
   - Complete evaluations for all candidates
   - Click "Submit Batch Evaluation"
   - Batch status changes to `PENDING_ADMIN`
   - Admin receives notification

#### Batch Evaluation Workflow
1. **Receive Batch**: Batch assigned to you with status `IN_PROGRESS`
2. **Evaluate All Candidates**: Complete evaluations for entire batch
3. **Submit**: Submit all evaluations at once
4. **Admin Review**: Admin reviews results and creates next batch
5. **Repeat**: Process continues for next interview step

---

## Workflow Diagrams

### Normal Hiring Flow

```
Candidate Application
    ↓
Application Created (SUBMITTED)
    ↓
Pipeline Created (IN_PROGRESS)
    ↓
Step 1: Interviewer Assignment
    ↓
Interviewer Evaluates Candidate
    ↓
[Selected?] → Yes → Auto-advance to Step 2
    ↓                    ↓
   No              Interviewer Evaluates
    ↓                    ↓
[Rejected]         [Selected?] → Yes → Auto-advance to Step 3
    ↓                    ↓
[End]               No → [Rejected]
                          ↓
                        [End]
```

### Bulk Hiring Flow

```
Phase A: Application Period
    ↓
Candidates Apply (APPLIED status)
    ↓
Job End Date Reached
    ↓
Job Status: ADMIN_SHORTLISTING
    ↓
Phase B: Admin Shortlisting
    ↓
Admin Reviews Applications
    ↓
[Shortlist] → SHORTLISTED
[Reject] → REJECTED
    ↓
Phase C: Batch Processing
    ↓
Admin Creates Batch 1 (Step 1)
    ↓
Batch Status: IN_PROGRESS
    ↓
Interviewer Evaluates Batch
    ↓
[Selected/Rejected/Review for each candidate]
    ↓
Interviewer Submits Batch
    ↓
Batch Status: PENDING_ADMIN
    ↓
Admin Reviews Results
    ↓
Admin Creates Batch 2 (Step 2) from SELECTED candidates
    ↓
[Repeat for all workflow steps]
    ↓
Final Step Completed
    ↓
Final Selected Candidates List
```

### Batch Creation Loop

```
Step 1 Batch Created
    ↓
Interviewer Evaluates → SELECTED candidates identified
    ↓
Admin Reviews → Creates Step 2 Batch (only SELECTED candidates)
    ↓
Interviewer Evaluates → SELECTED candidates identified
    ↓
Admin Reviews → Creates Step 3 Batch (only SELECTED candidates)
    ↓
[Continue until final step]
    ↓
Final Selected List
```

---

## Key Features

### For Candidates
- ✅ Real-time application status tracking
- ✅ Email notifications for each stage
- ✅ CV management
- ✅ Interview progress visibility

### For Admins
- ✅ Job creation with flexible workflow configuration
- ✅ Bulk hiring shortlisting interface
- ✅ Batch creation and management
- ✅ Candidate progress monitoring
- ✅ Final selection management

### For Interviewers
- ✅ Individual candidate evaluation (Normal Hiring)
- ✅ Batch candidate evaluation (Bulk Hiring)
- ✅ Detailed feedback and rating system
- ✅ CV access and candidate profiles

---

## Status Reference

### Application Statuses
- `APPLIED`: Initial status for bulk hiring applications
- `SUBMITTED`: Initial status for normal hiring applications
- `SHORTLISTED`: Selected by admin for bulk hiring
- `BATCH_ASSIGNED`: Assigned to a batch
- `REJECTED`: Not selected

### Job Statuses
- `ACTIVE`: Job is live and accepting applications
- `ADMIN_SHORTLISTING`: Bulk job - admin can shortlist candidates
- `CLOSED`: Job is closed

### Batch Statuses
- `PENDING_ADMIN`: Waiting for admin approval
- `IN_PROGRESS`: Ready for interviewer evaluation
- `COMPLETED`: All evaluations completed
- `CANCELLED`: Batch cancelled

### Batch Candidate Statuses
- `PENDING`: Not yet evaluated
- `SELECTED`: Passes current stage
- `REJECTED`: Doesn't pass current stage
- `REVIEW`: Needs further review

---

## Best Practices

### For Admins
1. **Job Creation**: Ensure workflow steps are properly configured before publishing
2. **Bulk Hiring**: Review all applications before shortlisting
3. **Batch Management**: Create batches with reasonable candidate counts (5-15 candidates)
4. **Progress Monitoring**: Regularly check batch status and candidate progress

### For Interviewers
1. **Timely Evaluation**: Complete evaluations promptly to keep process moving
2. **Detailed Feedback**: Provide constructive feedback for each candidate
3. **Consistent Rating**: Use rating scale consistently across candidates
4. **Batch Completion**: Ensure all candidates in batch are evaluated before submitting

### For Candidates
1. **Complete Profile**: Keep profile and CV updated
2. **Monitor Status**: Regularly check application status
3. **Respond Promptly**: Respond to interview invitations quickly
4. **Prepare**: Review job requirements before interviews

---

## Troubleshooting

### Common Issues

**Q: I can't see the Shortlist option for my bulk job**
- **A**: Ensure job end date has passed and job status is `ADMIN_SHORTLISTING`

**Q: Batch creation fails**
- **A**: Ensure candidates are in `SHORTLISTED` status and workflow step exists

**Q: Interviewer can't see batch**
- **A**: Check batch status is `IN_PROGRESS` and interviewer is assigned to workflow step

**Q: Candidate can't apply**
- **A**: Check job status is `ACTIVE` and current date is within posting period

**Q: Application stuck in status**
- **A**: For normal hiring, check if previous step is completed. For bulk hiring, check if admin has created next batch.

---

## Support

For technical issues or questions:
- Contact system administrator
- Check system notifications
- Review audit logs (Admin only)

---

**Last Updated**: 2024
**Version**: 1.0

