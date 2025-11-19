# Database Cleanup & Demo Users Summary

## ✅ Completed Actions

### 1. Database Cleanup
All data has been cleared from the database in the correct order (respecting foreign key constraints):

**Cleaned Tables:**
- `batch_candidate_evaluation`
- `batch_candidate`
- `batch`
- `slot_booking`
- `interview_slot`
- `stage_evaluation`
- `interview`
- `candidate_pipeline_step`
- `candidate_pipeline`
- `audit_log`
- `notification`
- `workflow_step`
- `job_workflow`
- `jobs_bookmark`
- `jobs_applied`
- `job_education_requirement`
- `job_location`
- `job_skill`
- `jobs`
- `cvmanager_cv`
- `user_skills`
- `user_education`
- `user`
- `user_education_level`
- `institute`

### 2. Education Levels Seeded
The following education levels have been created:
- High School
- Associate Degree
- Bachelor's Degree
- Master's Degree
- Doctorate
- Professional Certificate

### 3. Demo Users Created

All users have the password: **`admin123`**

#### 👨‍💼 Admin User
- **Email:** `admin@demo.com`
- **Username:** `admin`
- **Name:** Admin User
- **Role:** ADMIN

#### 👨‍🏫 Interviewer Users (2)
1. **Email:** `interviewer1@demo.com`
   - **Username:** `interviewer1`
   - **Name:** John Interviewer
   - **Role:** INTERVIEWER

2. **Email:** `interviewer2@demo.com`
   - **Username:** `interviewer2`
   - **Name:** Sarah Smith
   - **Role:** INTERVIEWER

#### 👤 Candidate Users (5)
1. **Email:** `candidate1@demo.com`
   - **Username:** `candidate1`
   - **Name:** Alice Johnson
   - **Role:** CANDIDATE

2. **Email:** `candidate2@demo.com`
   - **Username:** `candidate2`
   - **Name:** Bob Williams
   - **Role:** CANDIDATE

3. **Email:** `candidate3@demo.com`
   - **Username:** `candidate3`
   - **Name:** Charlie Brown
   - **Role:** CANDIDATE

4. **Email:** `candidate4@demo.com`
   - **Username:** `candidate4`
   - **Name:** Diana Davis
   - **Role:** CANDIDATE

5. **Email:** `candidate5@demo.com`
   - **Username:** `candidate5`
   - **Name:** Eve Miller
   - **Role:** CANDIDATE

## 📊 Database Schema Review

### All Tables Are Used
After reviewing the codebase, all tables in the schema are actively used:

**Core Tables:**
- `user` - User accounts and authentication
- `user_education` - User educational background
- `user_education_level` - Education level reference
- `user_skills` - User skills
- `institute` - Educational institutions

**Job Management:**
- `jobs` - Job postings
- `job_skill` - Required skills for jobs
- `job_location` - Job locations
- `job_education_requirement` - Education requirements
- `jobs_applied` - Job applications
- `jobs_bookmark` - Bookmarked jobs

**CV Management:**
- `cvmanager_cv` - CV/resume files

**Workflow System:**
- `job_workflow` - Workflow templates
- `workflow_step` - Workflow steps
- `candidate_pipeline` - Candidate pipelines
- `candidate_pipeline_step` - Pipeline step instances
- `interview` - Interview records
- `stage_evaluation` - Step evaluations

**Slot System:**
- `interview_slot` - Interview time slots
- `slot_booking` - Slot bookings

**Batch System:**
- `batch` - Bulk hiring batches
- `batch_candidate` - Batch candidates
- `batch_candidate_evaluation` - Batch evaluations

**Supporting:**
- `audit_log` - Audit trail
- `notification` - User notifications

**No unused tables found** - All tables are part of the active system.

## 🔄 How to Re-seed

To clean and re-seed the database again, run:

```bash
npm run seed
```

This will:
1. Delete all existing data
2. Seed education levels
3. Create demo users

## 🔐 Login Credentials

**All users use the same password:** `admin123`

### Quick Access:
- **Admin:** admin@demo.com / admin123
- **Interviewer 1:** interviewer1@demo.com / admin123
- **Interviewer 2:** interviewer2@demo.com / admin123
- **Candidate 1:** candidate1@demo.com / admin123
- **Candidate 2:** candidate2@demo.com / admin123
- **Candidate 3:** candidate3@demo.com / admin123
- **Candidate 4:** candidate4@demo.com / admin123
- **Candidate 5:** candidate5@demo.com / admin123

## 📝 Notes

- All users are set to `ACTIVE` status
- All users are not suspended
- Education levels are reference data and won't be deleted on cleanup
- The seed script can be run multiple times safely (uses upsert for users)

