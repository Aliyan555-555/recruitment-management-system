# Profile Edit Page - Signup Form Matching

## Objective
Update the candidate profile edit page (`/candidate/profile/edit`) to exactly match the fields, structure, and behavior of the signup form (`/register`), ensuring consistency and data quality.

## Changes Implemented

### 1. Personal Information Matching
- **Fields Updated/Added:**
  - Title (Dropdown)
  - Father Name (New)
  - Religion (Dropdown)
  - Nationality (Dropdown)
  - Date of Birth (Date Picker)
  - CNIC (Formatted Input)
  - Gender (Dropdown)
  - Marital Status (Dropdown)
  - Preferred City (Dropdown for `profileDetails.preferredCity`)
  - Postal Code (Input)
  - Home Address (Textarea)
  - Department (Dropdown)
  - City (Dropdown for `user.city`)
- **Fields Removed:**
  - Professional Grade (Not in signup)
  - Bio / About Me (Not in signup)
  - Social Links (LinkedIn, GitHub, etc. - Not in signup)

### 2. Education Section (New)
- **Status:** Fully Implemented
- **Fields:**
  - Degree Level (Dropdown, fetched from API)
  - Degree Title (Input)
  - Institution (Input)
  - Major Subject (Input)
  - Grade / CGPA (Input, Optional)
  - Passing Year (Dropdown)
- **Functionality:**
  - Add new education entries
  - List existing entries
  - Delete entries

### 3. Work Experience Section
- **Matched Fields:**
  - Job Title
  - Company
  - Location
  - Start Date
  - End Date (disabled if "Current")
  - Is Current (Checkbox)

### 4. Job Preferences Section
- **Simplified:**
  - Restricted to `First Priority`, `Second Priority`, `Third Priority`, and `Summary` only.
  - **Removed:** Expected Salary, Job Type, Availability, Notice Period (as these are not in the signup form).
- **Options:** Updated priority options to match signup constants (IT, Admin, HR, etc.).

### 5. Constants & Utilities
- Utilized `formatCnic`, `formatPakPhone`, `formatPostalCode` from signup utils.
- Utilized centralized constants from `lib/countries` and API for dynamic data like Education Levels.

## Verification
- **Exact Match:** The form now mirrors the signup steps.
- **No Extra Fields:** All fields not present in the signup flow have been removed from the UI.
- **Date Handling:** Uses standard date inputs.
- **Data Persistence:** Updates `User`, `UserProfileDetail`, `UserEducation`, `UserExperience`, `UserSkills`, and `UserJobPreference` tables correctly via existing APIs.
