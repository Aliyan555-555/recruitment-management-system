# Admin User Guide - Recruitment Management System

## Table of Contents
1. [Introduction](#introduction)
2. [Getting Started](#getting-started)
3. [Dashboard Overview](#dashboard-overview)
4. [Job Management](#job-management)
   - [Creating a New Job](#creating-a-new-job)
   - [Managing Jobs](#managing-jobs)
   - [Job Details & Workflow](#job-details--workflow)
5. [Candidate Management](#candidate-management)
   - [Viewing Candidates](#viewing-candidates)
   - [Candidate Details](#candidate-details)
6. [Shortlisting Process](#shortlisting-process)
   - [Initial Shortlisting](#initial-shortlisting)
   - [Round-Based Shortlisting](#round-based-shortlisting)
7. [Interview Rounds Management](#interview-rounds-management)
   - [Viewing Rounds](#viewing-rounds)
   - [Managing Applied Candidates](#managing-applied-candidates)
   - [Managing Shortlisted Candidates](#managing-shortlisted-candidates)
   - [Interview Slots Management](#interview-slots-management)
   - [Viewing Results](#viewing-results)
   - [Managing Offers](#managing-offers)
8. [Workflow Management](#workflow-management)
9. [Interviewer Management](#interviewer-management)
10. [User Management](#user-management)
11. [Settings](#settings)
12. [Best Practices](#best-practices)

---

## Introduction

Welcome to the **Recruitment Management System Admin Guide**. This comprehensive guide will walk you through every feature and process available to administrators. As an admin, you have full control over the recruitment process, from creating job postings to managing candidates through the entire hiring pipeline.

### Admin Capabilities

- ✅ Create and manage job postings
- ✅ View and manage all candidate applications
- ✅ Shortlist and reject candidates
- ✅ Configure recruitment workflows
- ✅ Manage interview rounds and slots
- ✅ Assign interviewers to workflow steps
- ✅ View candidate progress through pipelines
- ✅ Generate LOI (Letter of Intent) and Offer Letters
- ✅ Manage system users (Admins, Interviewers, Candidates)
- ✅ View analytics and reports
- ✅ Configure system settings

---

## Getting Started

### Accessing the Admin Dashboard

1. **Navigate to Admin Login**
   - Open your browser and go to: `http://your-domain.com/admin/login`
   - Or click on "Admin Login" from the main page

2. **Login Credentials**
   - Enter your **Email** address
   - Enter your **Password**
   - Click **"Sign In"**

3. **First Time Login**
   - If this is your first login, you may be prompted to change your password
   - Complete your profile if required

4. **Dashboard Access**
   - After successful login, you'll be redirected to the Admin Dashboard
   - URL: `/admin/dashboard`

### Navigation Overview

The admin interface consists of:

- **Sidebar Navigation**: Left side menu with all main sections
- **Top Bar**: User profile, notifications, and quick actions
- **Main Content Area**: Displays the current page content

**Main Navigation Items:**
- 📊 Dashboard
- 💼 Jobs
- 👥 Candidates
- 👨‍💼 Interviewers
- 👤 Users
- 🔄 Workflows
- ⚙️ Settings

---

## Dashboard Overview

### Purpose

The Dashboard provides a comprehensive overview of your recruitment activities, key metrics, and recent updates.

### Accessing the Dashboard

1. Click on **"Dashboard"** in the sidebar navigation
2. Or navigate to: `/admin/dashboard`

### Dashboard Components

#### 1. Statistics Cards (Top Row)

Four key metric cards display:

**a) Total Jobs**
- Shows the number of active job postings
- Includes trend indicator (e.g., +12%)
- Click to view all jobs

**b) Active Candidates**
- Number of candidates currently in the recruitment pipeline
- Shows candidates at various stages
- Trend indicator shows growth

**c) Interviews**
- Number of interviews scheduled for today
- Includes upcoming interviews count
- Trend shows daily changes

**d) Hiring Rate**
- Completion rate percentage
- Shows successful hires this month
- Trend indicates improvement

#### 2. Application Overview Chart

- **Location**: Left side of dashboard
- **Content**: Line chart showing applications vs interviews over the last 7 days
- **Purpose**: Visual representation of recruitment activity
- **Interactions**: Hover over data points to see exact numbers

#### 3. Recent Activity Feed

- **Location**: Right side of dashboard
- **Content**: Latest updates from your team
- **Includes**: 
  - Candidate status updates
  - Interview assignments
  - Workflow changes
  - Recent actions by team members

#### 4. Recent Candidates Applied

- **Location**: Bottom left
- **Content**: List of 5 most recent candidate applications
- **Information Displayed**:
  - Candidate name and avatar
  - Job title and company
  - Current status (IN_PROGRESS, COMPLETED, REJECTED, ON_HOLD)
  - Progress percentage
  - Steps completed (e.g., 2/5)
  - Application date
- **Actions**:
  - Click on any candidate card to view full details
  - "View All" button to see complete candidate list

#### 5. Recent Job Postings

- **Location**: Bottom right
- **Content**: List of 5 most recently created jobs
- **Information Displayed**:
  - Job title
  - Company name
  - Number of applicants
  - Creation date
- **Actions**:
  - Click arrow icon to view job details
  - "View All" button to see all jobs

### Quick Actions

**Post New Job Button**
- Located at top right of dashboard
- Quick access to create a new job posting
- Click to navigate to job creation page

**Time Filter**
- "Last 7 Days" button (top right)
- Filter dashboard data by time period
- Currently shows last 7 days by default

### Refreshing Dashboard Data

- Dashboard automatically refreshes on page load
- Click "Try Again" if data fails to load
- Data updates in real-time as changes occur

---

## Job Management

### Creating a New Job

This is one of the most important processes. Follow these steps carefully to create a complete job posting with a recruitment workflow.

#### Step 1: Access Job Creation Page

**Method 1: From Dashboard**
1. Click the **"Post New Job"** button (top right)
2. You'll be redirected to `/admin/jobs/create`

**Method 2: From Jobs Page**
1. Navigate to **Jobs** in sidebar
2. Click **"Create New Job"** button
3. Or click **"+"** icon if available

#### Step 2: Basic Job Information

Fill in the following required fields:

**a) Job Title** ⭐ Required
- Enter a clear, descriptive job title
- Examples: "Senior Software Engineer", "Marketing Manager"
- Minimum: 3 characters
- Maximum: 200 characters
- **Validation**: Must not be empty

**b) Short Description** (Optional)
- Brief summary of the position (1-2 sentences)
- Maximum: 300 characters
- This appears in job listings and search results
- **Tip**: Make it compelling to attract candidates

**c) Job Description** ⭐ Required
- Detailed description of the role
- Use the rich text editor for formatting
- Include:
  - Job responsibilities
  - Required qualifications
  - Company culture
  - Benefits
- Minimum: 50 characters (text only, HTML excluded)
- Maximum: 10,000 characters
- **Rich Text Features**:
  - Bold, italic, underline
  - Headings
  - Bullet points
  - Numbered lists
  - Text alignment
  - Highlighting

**d) Company Name** ⭐ Required
- Automatically filled from organization settings
- Can be edited if needed
- **Note**: This is the hiring company name

**e) Posting Dates** ⭐ Required
- **Post From**: Date when job becomes visible to candidates
  - Cannot be in the past
  - Default: Today's date
- **Post To**: Date when job posting expires
  - Must be after "Post From" date
  - Job automatically closes after this date

#### Step 3: Job Type Selection

**Job Type Options:**
- **NORMAL**: Standard single-position job
- **BULK**: Multiple positions, batch hiring enabled

**Selecting Job Type:**
1. Choose **"NORMAL"** for single position
2. Choose **"BULK"** if hiring multiple candidates for same role
3. **Bulk Jobs** enable:
   - Batch candidate evaluation
   - Group interview scheduling
   - Batch processing features

#### Step 4: Employment Details

**a) Employment Type** ⭐ Required
- **Permanent**: Full-time permanent position
- **Part Time**: Part-time employment
- **Contract**: Contract-based position

**b) Employment Shift** (Optional)
- Examples: "Morning", "Evening", "Night", "Flexible"
- Enter custom shift information

**c) Total Positions** ⭐ Required
- Number of positions available
- Default: 1
- For bulk jobs, enter total number needed
- Minimum: 1

#### Step 5: Job Requirements

**a) Department** (Optional)
- Department or division name
- Examples: "Engineering", "Sales", "HR"

**b) Minimum Experience** (Optional)
- Required years of experience
- Examples: "2-3 years", "5+ years", "Entry level"
- Free text field

**c) Minimum Salary** (Optional)
- Salary range or minimum
- Examples: "$50,000 - $70,000", "Competitive"
- Can include currency and range

**d) Certification** (Optional)
- Required certifications or licenses
- Examples: "PMP Certification", "AWS Certified"
- Use rich text editor for multiple certifications

**e) Minimum Education** (Optional)
- Education level requirements
- Examples: "Bachelor's Degree", "Master's Degree"
- Can specify field of study

**f) Benefits** (Optional)
- Employee benefits package
- Use rich text editor
- Include: Health insurance, retirement plans, PTO, etc.

#### Step 6: Skills Required

**Adding Skills:**
1. Type skill name in the "Add Skill" input field
2. Press **Enter** or click **"Add"** button
3. Skill appears as a tag below
4. Repeat for all required skills

**Removing Skills:**
- Click the **"X"** on any skill tag to remove it

**Best Practices:**
- List technical skills first
- Include soft skills
- Be specific (e.g., "React.js" not just "JavaScript")
- Add 5-10 relevant skills

#### Step 7: Job Locations

**Adding Locations:**
1. Enter **City** name
2. Enter **Country** (optional, defaults if not specified)
3. Click **"Add Location"** button
4. Location appears in the list below

**Removing Locations:**
- Click **"Remove"** next to any location

**Multiple Locations:**
- Add multiple cities if position is available in various locations
- Each location is listed separately

**Common Locations:**
- Pre-filled list includes major cities
- Can enter custom city names

#### Step 8: Workflow Configuration

This is crucial for defining the recruitment process.

**Understanding Workflow Steps:**
- Each step represents a stage in recruitment
- Steps are executed in order (stepOrder)
- Candidates must complete steps sequentially

**Step Types Available:**

1. **TEST**
   - Online assessment or test
   - Candidates complete remotely
   - Admin reviews results

2. **SCREENING_INTERVIEW**
   - Initial screening interview
   - Usually phone/video call
   - Basic qualification check

3. **FOCUS_GROUP**
   - Group interview session
   - Multiple candidates interviewed together
   - Used for team fit assessment

4. **FINAL_INTERVIEW**
   - Final round interview
   - Usually with senior management
   - Decision-making stage

5. **OFFER**
   - Offer letter stage
   - Final step before hiring
   - LOI and Offer Letter generation

**Adding Workflow Steps:**

1. **Step 1 Configuration:**
   - **Step Type**: Select from dropdown (TEST, SCREENING_INTERVIEW, etc.)
   - **Step Name**: Enter descriptive name (e.g., "Technical Assessment")
   - **Duration (Minutes)**: Interview/test duration (optional)
   - **Weightage (%)**: Importance weight for final decision (optional)
   - **Score Threshold**: Minimum score to pass (optional)
   - **Interview Mode**: "Online" or "In-Person" (optional)
   - **Meeting Link**: For online interviews (optional)

2. **Adding More Steps:**
   - Click **"Add Step"** button
   - Configure the new step
   - Steps are automatically numbered (1, 2, 3...)

3. **Removing Steps:**
   - Click **"Remove"** button on any step
   - Steps renumber automatically

**Step Configuration Details:**

**Step Name:**
- Descriptive name for the step
- Examples: "Technical Test", "HR Screening", "Final Interview"
- Visible to candidates and interviewers

**Duration (Minutes):**
- Expected time for this step
- Examples: 30, 60, 90 minutes
- Helps with scheduling

**Weightage (%):**
- Percentage importance in final decision
- Total should ideally equal 100% across all steps
- Example: Test (20%), Screening (30%), Final (50%)

**Score Threshold:**
- Minimum score/rating to pass
- Candidates below threshold are rejected
- Example: 70 out of 100

**Interview Mode:**
- **Online**: Video call, remote interview
- **In-Person**: Physical location interview
- Affects slot booking process

**Meeting Link:**
- For online interviews
- Zoom, Teams, Google Meet link
- Can be generic or step-specific

**Interviewer Assignment:**
- Interviewers are assigned later in the process
- Not configured during job creation
- Can be assigned per step after job is created

**Step Order:**
- Automatically set based on creation order
- First step = 1, second = 2, etc.
- Cannot be changed after creation (must delete and recreate)

**Best Practices for Workflow:**
- Start with screening (TEST or SCREENING_INTERVIEW)
- Include 3-5 steps for thorough evaluation
- End with FINAL_INTERVIEW and OFFER
- Set realistic durations
- Consider candidate experience (don't make it too long)

#### Step 9: Review and Submit

**Before Submitting:**

1. **Review All Information:**
   - Check job title and description
   - Verify dates are correct
   - Confirm locations
   - Review skills list
   - Verify workflow steps

2. **Check for Errors:**
   - Red error messages indicate issues
   - Fix all required field errors
   - Address validation warnings

3. **Validation Checklist:**
   - ✅ Job title entered (3-200 chars)
   - ✅ Description entered (50+ chars)
   - ✅ Company name entered
   - ✅ Post From date set (not past)
   - ✅ Post To date set (after Post From)
   - ✅ At least one workflow step configured
   - ✅ Employment type selected

**Submitting the Job:**

1. Click **"Create Job"** button (bottom of form)
2. System validates all fields
3. If errors exist:
   - Form scrolls to first error
   - Error messages displayed
   - Fix errors and try again
4. If successful:
   - Success message displayed
   - Redirected to job details page
   - Job is now active and visible to candidates

**After Job Creation:**

- Job appears in Jobs list
- Workflow is created automatically
- Job status: ACTIVE
- Candidates can now apply
- Admin can start managing applications

### Managing Jobs

#### Accessing Jobs List

1. Click **"Jobs"** in sidebar navigation
2. URL: `/admin/jobs`
3. View all jobs in a table format

#### Jobs List Features

**Table Columns:**

1. **S.No.**: Serial number
2. **Job Title**: Clickable link to job details
3. **Company**: Company name
4. **Status**: Active/Inactive toggle
5. **Job Status**: ACTIVE, ADMIN_SHORTLISTING, CLOSED
6. **Post From**: Start date
7. **Post To**: End date
8. **Applications**: Number of candidates applied
9. **Workflow Steps**: Number of steps configured
10. **Actions**: Menu with options

**Job Statuses:**

- **ACTIVE**: Job is live, accepting applications
- **ADMIN_SHORTLISTING**: Admin is reviewing applications
- **CLOSED**: Job posting is closed

**Filtering and Search:**

- Search by job title
- Filter by status
- Filter by job type (NORMAL/BULK)
- Sort by any column (click column header)

**Actions Menu (Three Dots):**

1. **View Details**: Open job details page
2. **Edit Job**: Modify job information
3. **Manage Workflow**: Configure workflow steps
4. **View Applications**: See all candidates
5. **Delete Job**: Remove job (with confirmation)

#### Viewing Job Details

1. Click on job title or "View Details"
2. URL: `/admin/jobs/[jobId]`
3. Comprehensive job information displayed

**Job Details Page Sections:**

**a) Job Information Card**
- All job details
- Edit button to modify
- Status indicators

**b) Applications Overview**
- Total applications count
- Status breakdown
- Quick stats

**c) Workflow Steps**
- List of all workflow steps
- Step order and types
- Interviewer assignments
- Edit workflow option

**d) Quick Actions**
- **Shortlist Candidates**: Initial shortlisting
- **View Rounds**: Interview rounds management
- **Manage Workflow**: Edit workflow
- **Edit Job**: Modify job details

#### Editing a Job

1. From Jobs list: Click **"Edit"** in actions menu
2. From Job details: Click **"Edit Job"** button
3. URL: `/admin/jobs/[jobId]/edit`

**Editable Fields:**
- All basic information
- Job description
- Requirements
- Skills
- Locations
- Dates (with restrictions)
- Employment details

**Restrictions:**
- Cannot change job type after creation
- Cannot modify workflow steps here (use workflow management)
- Date changes may affect active applications

**Saving Changes:**
1. Make desired changes
2. Click **"Update Job"** button
3. Confirmation message appears
4. Changes saved immediately

#### Deleting a Job

**Warning**: This action cannot be undone!

1. Click **"Delete"** in actions menu
2. Confirmation dialog appears
3. Type job title to confirm (if required)
4. Click **"Delete"** to proceed
5. Job and all related data removed

**What Gets Deleted:**
- Job posting
- All applications (candidates notified)
- Workflow configuration
- Interview slots
- Pipeline data

**Alternative to Deletion:**
- Change status to **CLOSED** instead
- Preserves data for reporting
- Candidates can still view their applications

### Job Details & Workflow

#### Understanding Job Workflow

Each job has a **Workflow** that defines the recruitment process stages.

**Workflow Structure:**
```
Job
└── Workflow
    └── Workflow Steps (ordered)
        ├── Step 1: TEST
        ├── Step 2: SCREENING_INTERVIEW
        ├── Step 3: FOCUS_GROUP
        ├── Step 4: FINAL_INTERVIEW
        └── Step 5: OFFER
```

**Step Properties:**
- **Step Order**: Execution sequence (1, 2, 3...)
- **Step Type**: Type of assessment
- **Step Name**: Display name
- **Is Required**: Must be completed
- **Is Skippable**: Can be bypassed (admin override)
- **Interviewer**: Assigned interviewer (if applicable)

#### Managing Workflow Steps

**Accessing Workflow Management:**

1. From Job Details: Click **"Manage Workflow"**
2. From Jobs list: Actions → **"Manage Workflow"**
3. URL: `/admin/workflows` (then select job)

**Workflow Management Features:**

**Viewing Workflow:**
- See all steps in order
- View step details
- See interviewer assignments
- Check step status (ACTIVE/INACTIVE)

**Editing Steps:**
- Modify step names
- Change step types (with caution)
- Update configuration
- Assign/change interviewers

**Adding Steps:**
- Add new steps to workflow
- Steps added at the end
- Reorder if needed

**Removing Steps:**
- Delete unnecessary steps
- **Warning**: Affects candidates in pipeline
- Cannot remove if candidates are in that step

**Assigning Interviewers:**
- Select interviewer for each step
- Can assign multiple interviewers for group interviews
- Interviewers must have INTERVIEWER role

#### Interview Rounds

**Understanding Rounds:**
- Each workflow step can have multiple "rounds"
- Rounds represent different batches or evaluation cycles
- Useful for bulk hiring

**Accessing Rounds:**
1. From Job Details: Click **"View Rounds"**
2. URL: `/admin/jobs/[jobId]/rounds/[roundId]`

**Round Management:**
- View candidates in each round
- Manage shortlisting per round
- Track round progress
- View round results

---

## Candidate Management

### Viewing Candidates

#### Accessing Candidates Page

1. Click **"Candidates"** in sidebar
2. URL: `/admin/candidates`
3. View all candidate pipelines

#### Candidates List Features

**Display Information:**
- Candidate name and email
- Job title and company
- Current status
- Progress percentage
- Steps completed
- Application date

**Filtering Options:**

1. **Search Bar**
   - Search by candidate name
   - Search by email
   - Search by job title
   - Search by company

2. **Status Filter**
   - ALL: Show all candidates
   - IN_PROGRESS: Active pipelines
   - COMPLETED: Finished pipelines
   - REJECTED: Rejected candidates
   - ON_HOLD: Paused pipelines

3. **Job Filter**
   - ALL: All jobs
   - Specific job: Filter by job title
   - Useful for job-specific candidate management

4. **Date Range Filter**
   - **From Date**: Start date
   - **To Date**: End date
   - Filters by application date

**Sorting:**
- Click column headers to sort
- Sort by name, date, status, progress

**Pagination:**
- 10 candidates per page (default)
- Navigate using page numbers
- Shows total count

**Actions:**
- Click on candidate card to view details
- Quick status view
- Progress tracking

### Candidate Details

#### Accessing Candidate Details

1. Click on any candidate from the list
2. URL: `/admin/candidates/[candidateId]`
3. Comprehensive candidate profile

#### Candidate Details Page Sections

**a) Candidate Information**
- Full name
- Email address
- Phone numbers
- Profile picture/avatar
- Registration date
- Last login

**b) Application Information**
- Job applied for
- Application date
- Current status
- Application ID

**c) Pipeline Progress**
- Current step
- Steps completed
- Total steps
- Progress bar
- Status badge

**d) Education**
- Degrees and qualifications
- Institutes attended
- Graduation years
- Fields of study

**e) Experience**
- Work history
- Companies
- Job titles
- Duration
- Current employment

**f) Skills**
- Technical skills
- Skill levels
- Proficiency ratings

**g) Profile Details**
- Additional information
- Bio
- Certifications
- Languages
- References

**h) Pipeline Steps Timeline**
- Visual timeline of all steps
- Current step highlighted
- Completed steps marked
- Pending steps shown
- Step status indicators

**i) Interview History**
- Past interviews
- Interviewer names
- Dates and times
- Feedback and ratings
- Recommendations

**j) Documents**
- CV/Resume download
- Cover letter
- Certificates
- Other attachments

**k) Actions**
- **Advance to Next Step**: Manually move candidate forward
- **Reject Candidate**: End pipeline
- **Put on Hold**: Pause pipeline
- **View Full Profile**: Complete candidate profile
- **Send Message**: Contact candidate
- **Download CV**: Get resume

#### Managing Candidate Pipeline

**Advancing Candidates:**
1. Click **"Advance to Next Step"** button
2. Confirm action
3. Candidate moves to next workflow step
4. Notifications sent automatically

**Rejecting Candidates:**
1. Click **"Reject Candidate"** button
2. Enter rejection reason (optional)
3. Confirm rejection
4. Pipeline status: REJECTED
5. Candidate notified via email

**Putting on Hold:**
1. Click **"Put on Hold"** button
2. Enter reason (optional)
3. Pipeline status: ON_HOLD
4. Can be resumed later

**Resuming from Hold:**
1. Click **"Resume Pipeline"** button
2. Candidate returns to current step
3. Status: IN_PROGRESS

---

## Shortlisting Process

### Initial Shortlisting

This is the first step after candidates apply. Admin reviews applications and shortlists qualified candidates.

#### Accessing Shortlist Page

**Method 1: From Job Details**
1. Open job details page
2. Click **"Shortlist Candidates"** button
3. URL: `/admin/jobs/[jobId]/shortlist`

**Method 2: From Jobs List**
1. Click actions menu on job
2. Select **"Shortlist Candidates"**

#### Shortlist Page Features

**Candidate List:**
- All applicants for the job
- Application date
- Current status
- Candidate information
- Selection checkboxes

**Status Filters:**
- **ALL**: All applicants
- **APPLIED**: New applications
- **SHORTLISTED**: Already shortlisted
- **REJECTED**: Rejected applications

**Selection Options:**
- **Select All**: Checkbox at top
- **Individual Selection**: Checkbox per candidate
- **Bulk Actions**: Apply to multiple candidates

#### Shortlisting Candidates

**Step-by-Step Process:**

1. **Review Applications**
   - Read through candidate profiles
   - Check qualifications
   - Review experience
   - Assess skills match

2. **Select Candidates**
   - Check boxes next to qualified candidates
   - Can select multiple at once
   - Selected count shown

3. **Shortlist Action**
   - Click **"Shortlist Selected"** button
   - Confirmation dialog appears
   - Click **"Confirm"** to proceed
   - Selected candidates moved to SHORTLISTED status

4. **Reject Action** (Optional)
   - Select unqualified candidates
   - Click **"Reject Selected"** button
   - Confirm rejection
   - Candidates moved to REJECTED status
   - Rejection email sent automatically

**After Shortlisting:**
- Shortlisted candidates enter pipeline
- First workflow step activated
- Candidates notified via email
- Can proceed to interview rounds

### Round-Based Shortlisting

For jobs with multiple interview rounds, shortlisting happens per round.

#### Accessing Round Shortlisting

1. From Job Details: Click **"View Rounds"**
2. Select specific round
3. Navigate to **"Applied"** tab
4. URL: `/admin/jobs/[jobId]/rounds/[roundId]/applied`

#### Round Shortlisting Process

**Step 1: View Applied Candidates**
- See all candidates who applied for this round
- Filter by status
- View candidate details

**Step 2: Evaluate Candidates**
- Review candidate performance
- Check previous round results
- Assess qualifications

**Step 3: Shortlist for Next Round**
1. Select candidates to advance
2. Click **"Shortlist Selected"** button
3. Candidates move to next round
4. Status updated to SHORTLISTED

**Step 4: Reject if Needed**
1. Select candidates to reject
2. Click **"Reject Selected"** button
3. Confirm rejection
4. Candidates removed from pipeline

**Round Statuses:**
- **APPLIED**: Applied for this round
- **SHORTLISTED**: Selected for next round
- **REJECTED**: Not selected
- **COMPLETED**: Finished this round

---

## Interview Rounds Management

### Viewing Rounds

#### Accessing Rounds

1. From Job Details: Click **"View Rounds"** or **"Manage Rounds"**
2. URL: `/admin/jobs/[jobId]/rounds/[roundId]`
3. See all workflow steps as rounds

#### Rounds Overview

**Round Information:**
- Round name (step name)
- Round type (step type)
- Total candidates
- Shortlisted count
- Pending count
- Completed count

**Round Tabs:**
- **Applied**: Candidates who applied
- **Shortlisted**: Selected candidates
- **Candidates**: All candidates in round
- **Slots**: Interview slots
- **Results**: Round results
- **Offers**: Offer letters (if applicable)

### Managing Applied Candidates

#### Accessing Applied Candidates

1. Navigate to round
2. Click **"Applied"** tab
3. URL: `/admin/jobs/[jobId]/rounds/[roundId]/applied`

#### Applied Candidates Page

**Candidate List:**
- All candidates in this round
- Application information
- Previous round performance
- Selection status

**Actions Available:**

1. **View Candidate**
   - Click on candidate name
   - See full profile
   - Review previous assessments

2. **Shortlist**
   - Select candidates
   - Click **"Shortlist Selected"**
   - Move to next round

3. **Reject**
   - Select candidates
   - Click **"Reject Selected"**
   - Remove from pipeline

4. **Bulk Actions**
   - Select multiple candidates
   - Apply action to all selected

**Filters:**
- Search by name
- Filter by status
- Sort by date or name

### Managing Shortlisted Candidates

#### Accessing Shortlisted Candidates

1. Navigate to round
2. Click **"Shortlisted"** tab
3. URL: `/admin/jobs/[jobId]/rounds/[roundId]/shortlisted`

#### Shortlisted Candidates Page

**Candidate Information:**
- All shortlisted candidates
- Assessment status
- Interviewer assignments
- Evaluation scores
- Recommendations

**Actions Available:**

1. **View Assessment**
   - Click **"View Assessment"** button
   - See evaluation details
   - Review interviewer feedback

2. **Manage LOI** (Letter of Intent)
   - Generate LOI for candidate
   - Send LOI
   - Track LOI status

3. **Manage Offer**
   - Generate offer letter
   - Send offer
   - Track acceptance

4. **Re-evaluate**
   - Request re-evaluation
   - Assign different interviewer
   - Update assessment

**Status Indicators:**
- **Pending**: Awaiting assessment
- **In Progress**: Assessment ongoing
- **Completed**: Assessment done
- **LOI Sent**: Letter of Intent sent
- **Offer Sent**: Offer letter sent

### Interview Slots Management

#### Accessing Slots Management

1. Navigate to round
2. Click **"Slots"** tab
3. URL: `/admin/jobs/[jobId]/rounds/[roundId]/slots`

#### Understanding Interview Slots

**What are Slots?**
- Time slots created by interviewers
- Candidates book available slots
- Each slot has capacity (usually 1)

**Slot Information:**
- Date and time
- Interviewer name
- Capacity (number of candidates)
- Booked count
- Available count
- Status (Active/Blocked)

#### Managing Slots

**Viewing Slots:**
- See all slots for this round
- Filter by date
- Filter by interviewer
- View booking status

**Slot Actions:**

1. **View Bookings**
   - See which candidates booked
   - View booking details
   - Check attendance

2. **Block Slot**
   - Prevent new bookings
   - Useful for cancellations
   - Existing bookings unaffected

3. **Unblock Slot**
   - Make slot available again
   - Allow new bookings

4. **Delete Slot**
   - Remove slot completely
   - **Warning**: Affects booked candidates
   - Notify candidates if needed

**Creating Slots:**
- Slots are created by interviewers
- Admin can view and manage
- Cannot create slots directly (interviewer function)

**Slot Status:**
- **Available**: Open for booking
- **Booked**: Candidate booked
- **Blocked**: Temporarily unavailable
- **Completed**: Interview conducted

### Viewing Results

#### Accessing Round Results

1. Navigate to round
2. Click **"Results"** tab
3. URL: `/admin/jobs/[jobId]/rounds/[roundId]/results`

#### Results Page Features

**Results Overview:**
- Total candidates evaluated
- Average scores
- Pass rate
- Recommendations summary

**Candidate Results:**
- Individual candidate scores
- Interviewer feedback
- Recommendations (HIRE, NO_HIRE, etc.)
- Evaluation date
- Interviewer name

**Filters:**
- Filter by recommendation
- Filter by score range
- Sort by score
- Search by candidate name

**Actions:**
- **View Detailed Assessment**: Full evaluation
- **Download Report**: Export results
- **Advance Candidates**: Move to next round
- **Generate Summary**: Create round summary

**Result Metrics:**
- **Strong Hire**: Highly recommended
- **Hire**: Recommended
- **No Hire**: Not recommended
- **Strong No Hire**: Strongly not recommended

### Managing Offers

#### Accessing Offers Management

1. Navigate to round (usually final round)
2. Click **"Offers"** tab
3. URL: `/admin/jobs/[jobId]/rounds/[roundId]/offers`

#### Offers Page Features

**Offer Status:**
- **DRAFTED**: Offer created but not sent
- **SENT**: Offer sent to candidate
- **ACCEPTED**: Candidate accepted
- **REJECTED**: Candidate declined
- **EXPIRED**: Offer expired

**Offer Information:**
- Candidate name
- Job title
- Salary/compensation
- Start date
- Offer date
- Response date
- Status

#### Managing Offers

**Creating Offers:**

1. **Generate LOI First** (Letter of Intent)
   - Click **"Generate LOI"** for candidate
   - Fill in LOI details
   - Review and send
   - Wait for candidate acceptance

2. **Generate Offer Letter**
   - After LOI acceptance
   - Click **"Generate Offer"** button
   - Fill in offer details:
     - Salary
     - Start date
     - Benefits
     - Terms and conditions
   - Review offer
   - Send to candidate

**Offer Details Form:**
- **Position**: Job title
- **Department**: Department name
- **Start Date**: Employment start date
- **Salary**: Compensation amount
- **Benefits**: Benefits package
- **Terms**: Employment terms
- **Reporting Manager**: Manager name
- **Location**: Work location

**Sending Offers:**
1. Fill in all required fields
2. Review offer letter preview
3. Click **"Send Offer"** button
4. Offer sent via email
5. Status: SENT
6. Candidate receives notification

**Tracking Offers:**
- View all offers in list
- See status of each offer
- Track response dates
- Monitor acceptance rate

**Offer Actions:**
- **View Offer**: See full offer details
- **Resend Offer**: Send again if needed
- **Revoke Offer**: Cancel offer (if not accepted)
- **Download PDF**: Get offer letter PDF
- **Update Status**: Manually update if needed

---

## Workflow Management

### Accessing Workflows

1. Click **"Workflows"** in sidebar
2. URL: `/admin/workflows`
3. View all job workflows

### Workflows Page Features

**Workflow List:**
- Job title and company
- Number of steps
- Created date
- Status indicators

**Workflow Information:**
- **Job**: Associated job
- **Total Steps**: Number of workflow steps
- **Steps List**: All steps in order
- **Interviewers**: Assigned interviewers per step

**Actions:**
- **View Details**: See full workflow
- **Edit Workflow**: Modify steps
- **Assign Interviewers**: Manage assignments
- **View Job**: Go to job details

### Managing Workflows

**Viewing Workflow Details:**
1. Click on workflow or "View Details"
2. See complete workflow structure
3. View all steps with details
4. Check interviewer assignments

**Editing Workflow:**
1. Click **"Edit Workflow"** button
2. Modify step configurations
3. Add/remove steps
4. Update step details
5. Save changes

**Assigning Interviewers:**
1. Click **"Assign Interviewers"** button
2. Select step
3. Choose interviewer(s)
4. Save assignment
5. Interviewer notified

**Workflow Best Practices:**
- Keep workflows simple (3-5 steps)
- Assign interviewers early
- Set clear step requirements
- Document workflow process

---

## Interviewer Management

### Accessing Interviewers Page

1. Click **"Interviewers"** in sidebar
2. URL: `/admin/interviewers`
3. View all system interviewers

### Interviewers Page Features

**Interviewer List:**
- Name and email
- Department
- Institution
- Workload statistics

**Workload Information:**
- **Assigned Steps**: Number of workflow steps assigned
- **Active Candidates**: Candidates currently being evaluated
- **Total Interviews**: Total interviews conducted

**Interviewer Details:**
- Contact information
- Department affiliation
- Availability status
- Performance metrics

### Managing Interviewers

**Viewing Interviewer Details:**
- Click on interviewer name
- See full profile
- View assignments
- Check calendar

**Assigning to Steps:**
1. Go to workflow management
2. Select workflow step
3. Click "Assign Interviewer"
4. Choose interviewer
5. Save assignment

**Interviewer Actions:**
- **View Profile**: Full interviewer information
- **View Assignments**: See all assigned steps
- **View Calendar**: Check availability
- **Contact**: Send message/email

---

## User Management

### Accessing Users Page

1. Click **"Users"** in sidebar
2. URL: `/admin/users`
3. View all system users

### Users Page Features

**User Statistics:**
- **Total Users**: All users in system
- **Admins**: Administrator count
- **Interviewers**: Interviewer count
- **Candidates**: Candidate count

**User List:**
- Name and email
- Role (ADMIN, INTERVIEWER, CANDIDATE)
- Registration date
- Status (ACTIVE, INACTIVE, PENDING)
- Quick stats

**Filters:**
- Search by name or email
- Filter by role
- Filter by status
- Sort by registration date

### Managing Users

**Viewing User Details:**
- Click on user name
- See full profile
- View activity
- Check role permissions

**User Actions:**
- **Edit User**: Modify user information
- **Change Role**: Update user role
- **Suspend User**: Temporarily disable
- **Activate User**: Enable user account
- **Delete User**: Remove user (with caution)

**Changing User Roles:**
1. Click **"Edit User"**
2. Select new role from dropdown
3. Save changes
4. User permissions updated immediately

**User Status Management:**
- **ACTIVE**: User can login and use system
- **INACTIVE**: User account disabled
- **PENDING**: Awaiting activation
- **SUSPENDED**: Temporarily blocked

---

## Settings

### Accessing Settings

1. Click **"Settings"** in sidebar
2. URL: `/admin/settings`
3. Configure system settings

### Settings Categories

**Organization Settings:**
- Company name
- Logo upload
- Contact information
- Website URL
- Address
- Description
- Social media links

**Email Settings:**
- SMTP configuration
- Email templates
- Notification preferences

**System Settings:**
- General preferences
- Security settings
- Feature toggles

### Updating Settings

1. Navigate to Settings page
2. Select category
3. Modify values
4. Click **"Save"** button
5. Changes applied immediately

---

## Best Practices

### Job Creation Best Practices

1. **Clear Job Titles**
   - Use standard industry titles
   - Be specific about level (Junior, Senior, etc.)
   - Avoid internal jargon

2. **Detailed Descriptions**
   - Include all responsibilities
   - List required qualifications
   - Mention company culture
   - Specify benefits clearly

3. **Realistic Requirements**
   - Don't over-qualify
   - Match requirements to role
   - Be flexible where possible

4. **Complete Workflows**
   - Plan workflow before creating job
   - Keep steps reasonable (3-5)
   - Set appropriate durations
   - Assign interviewers early

### Candidate Management Best Practices

1. **Regular Reviews**
   - Review applications daily
   - Respond to candidates promptly
   - Keep status updated

2. **Fair Evaluation**
   - Use consistent criteria
   - Document decisions
   - Provide feedback when possible

3. **Communication**
   - Keep candidates informed
   - Send updates regularly
   - Be transparent about process

### Workflow Management Best Practices

1. **Simple Workflows**
   - Avoid too many steps
   - Keep process streamlined
   - Focus on essential evaluations

2. **Clear Steps**
   - Name steps clearly
   - Set expectations
   - Provide instructions

3. **Timely Assignments**
   - Assign interviewers early
   - Ensure availability
   - Coordinate schedules

### General Best Practices

1. **Data Accuracy**
   - Keep information updated
   - Verify candidate details
   - Maintain clean records

2. **Security**
   - Protect candidate data
   - Use secure passwords
   - Follow privacy regulations

3. **Efficiency**
   - Use bulk actions when possible
   - Leverage filters and search
   - Automate where appropriate

4. **Documentation**
   - Document decisions
   - Keep notes on candidates
   - Maintain audit trail

---

## Troubleshooting

### Common Issues

**Issue: Cannot create job**
- **Solution**: Check all required fields are filled
- Verify dates are valid
- Ensure at least one workflow step is added

**Issue: Candidates not appearing**
- **Solution**: Check job status is ACTIVE
- Verify post dates are current
- Check filters on candidates page

**Issue: Cannot shortlist candidates**
- **Solution**: Ensure candidates have APPLIED status
- Check job workflow is configured
- Verify you have admin permissions

**Issue: Workflow steps not saving**
- **Solution**: Ensure step type is selected
- Check step name is entered
- Verify no duplicate step orders

**Issue: Interview slots not showing**
- **Solution**: Check interviewer has created slots
- Verify round is active
- Ensure slots are not blocked

### Getting Help

- Check this guide first
- Review error messages carefully
- Contact system administrator
- Check system logs if available

---

## Conclusion

This guide covers all major admin functions in the Recruitment Management System. For specific questions or advanced features, refer to the technical documentation or contact your system administrator.

**Remember:**
- Always review before submitting
- Keep candidate data secure
- Communicate clearly with candidates
- Maintain accurate records
- Follow your organization's recruitment policies

**Last Updated**: 2024
**Version**: 1.0
