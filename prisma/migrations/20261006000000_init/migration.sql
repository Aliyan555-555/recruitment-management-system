-- CreateEnum
CREATE TYPE "EmploymentType" AS ENUM ('Permanent', 'Part Time', 'Contract');

-- CreateEnum
CREATE TYPE "JobType" AS ENUM ('NORMAL', 'BULK');

-- CreateEnum
CREATE TYPE "JobStatus" AS ENUM ('ACTIVE', 'ADMIN_SHORTLISTING', 'CLOSED');

-- CreateEnum
CREATE TYPE "JobSkillPriority" AS ENUM ('REQUIRED', 'PREFERRED');

-- CreateEnum
CREATE TYPE "ApplicationStatus" AS ENUM ('APPLIED', 'BOOKMARKED', 'REMOVED', 'SUBMITTED', 'SHORTLISTED', 'BATCH_ASSIGNED');

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'CANDIDATE');

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'PENDING');

-- CreateEnum
CREATE TYPE "StepStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "PipelineStatus" AS ENUM ('IN_PROGRESS', 'COMPLETED', 'REJECTED', 'ON_HOLD');

-- CreateEnum
CREATE TYPE "StepInstanceStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'SKIPPED', 'REJECTED');

-- CreateEnum
CREATE TYPE "InterviewRecommendation" AS ENUM ('STRONG_HIRE', 'HIRE', 'NO_HIRE', 'STRONG_NO_HIRE');

-- CreateEnum
CREATE TYPE "AuditAction" AS ENUM ('CREATED', 'UPDATED', 'DELETED', 'ASSIGNED', 'COMPLETED', 'SKIPPED', 'REJECTED', 'OVERRIDDEN', 'ADVANCED', 'REOPENED');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('ASSIGNMENT', 'COMPLETION', 'REJECTION', 'REMINDER', 'SYSTEM');

-- CreateEnum
CREATE TYPE "StepType" AS ENUM ('TEST', 'SCREENING_INTERVIEW', 'FOCUS_GROUP', 'FINAL_INTERVIEW', 'OFFER');

-- CreateEnum
CREATE TYPE "LetterStatus" AS ENUM ('DRAFTED', 'SENT', 'ACCEPTED', 'REJECTED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "BookingStatus" AS ENUM ('RESERVED', 'CANCELLED', 'COMPLETED', 'NO_SHOW');

-- CreateEnum
CREATE TYPE "PipelineLock" AS ENUM ('NONE', 'LOCKED_REJECTED');

-- CreateEnum
CREATE TYPE "PipelineMode" AS ENUM ('INDIVIDUAL', 'BATCH');

-- CreateEnum
CREATE TYPE "SkillAssessmentStatus" AS ENUM ('IN_PROGRESS', 'SUBMITTED', 'PASSED', 'FAILED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "VerifiedSkillLevel" AS ENUM ('BEGINNER', 'INTERMEDIATE', 'PROFESSIONAL', 'EXPERT');

-- CreateEnum
CREATE TYPE "BatchStatus" AS ENUM ('PENDING_ADMIN', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "BatchCandidateStatus" AS ENUM ('PENDING', 'SELECTED', 'REJECTED', 'REVIEW');

-- CreateEnum
CREATE TYPE "AiShortlistRunStatus" AS ENUM ('RUNNING', 'COMPLETED', 'COMPLETED_WITH_ERRORS', 'FAILED');

-- CreateEnum
CREATE TYPE "AiCandidateResultStatus" AS ENUM ('PENDING', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "AiShortlistRecommendation" AS ENUM ('SHORTLIST', 'MAYBE', 'REJECT');

-- CreateTable
CREATE TABLE "user" (
    "id" BIGSERIAL NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'CANDIDATE',
    "user_status" "UserStatus" NOT NULL DEFAULT 'ACTIVE',
    "username" VARCHAR(100) NOT NULL,
    "password" VARCHAR(255) NOT NULL,
    "firstname" VARCHAR(100) NOT NULL,
    "lastname" VARCHAR(100) NOT NULL,
    "email" VARCHAR(100) NOT NULL,
    "phone1" VARCHAR(20),
    "phone2" VARCHAR(20),
    "institution" VARCHAR(255),
    "department" VARCHAR(255),
    "address" VARCHAR(255),
    "city" VARCHAR(120),
    "country" VARCHAR(2),
    "lang" VARCHAR(30),
    "theme" VARCHAR(50),
    "timezone" VARCHAR(100),
    "first_access" BIGINT,
    "last_access" BIGINT,
    "last_login" BIGINT,
    "current_login" BIGINT,
    "deleted_at" BIGINT,
    "suspended" BOOLEAN NOT NULL DEFAULT false,
    "created_at" BIGINT NOT NULL,
    "updated_at" BIGINT NOT NULL,
    "avatar" VARCHAR(255),

    CONSTRAINT "user_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "password_reset_token" (
    "id" BIGSERIAL NOT NULL,
    "user_id" BIGINT NOT NULL,
    "token" VARCHAR(255) NOT NULL,
    "expires_at" BIGINT NOT NULL,
    "used_at" BIGINT,
    "created_at" BIGINT NOT NULL,

    CONSTRAINT "password_reset_token_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_education" (
    "id" BIGSERIAL NOT NULL,
    "user_id" BIGINT NOT NULL,
    "education_level_id" BIGINT NOT NULL,
    "degreeTitle" VARCHAR(255) NOT NULL,
    "institute" VARCHAR(255),
    "institute_id" BIGINT,
    "majorSubject" VARCHAR(255),
    "grade" VARCHAR(50),
    "passingYear" VARCHAR(50),
    "country" VARCHAR(50),
    "created_at" BIGINT NOT NULL,
    "updated_at" BIGINT NOT NULL,

    CONSTRAINT "user_education_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_education_level" (
    "id" BIGSERIAL NOT NULL,
    "name" VARCHAR(100) NOT NULL,

    CONSTRAINT "user_education_level_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_skills" (
    "id" BIGSERIAL NOT NULL,
    "user_id" BIGINT NOT NULL,
    "skillName" VARCHAR(255) NOT NULL,
    "level" INTEGER NOT NULL,
    "verified_level" "VerifiedSkillLevel",
    "verified_at" BIGINT,
    "last_assessment_id" BIGINT,
    "created_at" BIGINT NOT NULL,
    "updated_at" BIGINT NOT NULL,

    CONSTRAINT "user_skills_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "skill_assessment_config" (
    "id" BIGSERIAL NOT NULL,
    "skill_name" VARCHAR(255) NOT NULL,
    "question_count" INTEGER NOT NULL DEFAULT 10,
    "min_pass_points" INTEGER NOT NULL DEFAULT 60,
    "max_points" INTEGER NOT NULL DEFAULT 100,
    "level_thresholds" JSONB NOT NULL,
    "max_attempts" INTEGER NOT NULL DEFAULT 3,
    "cooldown_hours" INTEGER NOT NULL DEFAULT 24,
    "cycle_reset_days" INTEGER NOT NULL DEFAULT 7,
    "attempt_timeout_minutes" INTEGER NOT NULL DEFAULT 60,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" BIGINT NOT NULL,
    "updated_at" BIGINT NOT NULL,

    CONSTRAINT "skill_assessment_config_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "skill_assessment" (
    "id" BIGSERIAL NOT NULL,
    "user_skill_id" BIGINT NOT NULL,
    "user_id" BIGINT NOT NULL,
    "skill_name" VARCHAR(255) NOT NULL,
    "status" "SkillAssessmentStatus" NOT NULL DEFAULT 'IN_PROGRESS',
    "attempt_number" INTEGER NOT NULL,
    "min_points" INTEGER NOT NULL,
    "max_points" INTEGER NOT NULL,
    "total_points" INTEGER NOT NULL,
    "scored_points" INTEGER,
    "level" "VerifiedSkillLevel",
    "started_at" BIGINT NOT NULL,
    "submitted_at" BIGINT,
    "expires_at" BIGINT,
    "created_at" BIGINT NOT NULL,
    "updated_at" BIGINT NOT NULL,

    CONSTRAINT "skill_assessment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "assessment_question" (
    "id" BIGSERIAL NOT NULL,
    "assessment_id" BIGINT NOT NULL,
    "question" TEXT NOT NULL,
    "options" JSONB NOT NULL,
    "correct_option" VARCHAR(500) NOT NULL,
    "points" INTEGER NOT NULL,
    "order" INTEGER NOT NULL,

    CONSTRAINT "assessment_question_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "assessment_answer" (
    "id" BIGSERIAL NOT NULL,
    "assessment_id" BIGINT NOT NULL,
    "question_id" BIGINT NOT NULL,
    "selected_option" VARCHAR(500) NOT NULL,
    "is_correct" BOOLEAN NOT NULL,
    "points_awarded" INTEGER NOT NULL,
    "created_at" BIGINT NOT NULL,

    CONSTRAINT "assessment_answer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_experience" (
    "id" BIGSERIAL NOT NULL,
    "user_id" BIGINT NOT NULL,
    "jobTitle" VARCHAR(255) NOT NULL,
    "company" VARCHAR(255),
    "location" VARCHAR(255),
    "start_date" VARCHAR(50),
    "end_date" VARCHAR(50),
    "is_current" BOOLEAN NOT NULL DEFAULT false,
    "created_at" BIGINT NOT NULL,
    "updated_at" BIGINT NOT NULL,

    CONSTRAINT "user_experience_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_profile_detail" (
    "id" BIGSERIAL NOT NULL,
    "user_id" BIGINT NOT NULL,
    "title" VARCHAR(50),
    "father_name" VARCHAR(255),
    "religion" VARCHAR(100),
    "nationality" VARCHAR(120),
    "date_of_birth" VARCHAR(30),
    "cnic" VARCHAR(50),
    "gender" VARCHAR(50),
    "marital_status" VARCHAR(50),
    "preferred_city" VARCHAR(120),
    "postal_code" VARCHAR(20),
    "disclaimers_agreed" BOOLEAN NOT NULL DEFAULT false,
    "professional_grade" VARCHAR(50),
    "linkedin_url" VARCHAR(255),
    "portfolio_url" VARCHAR(255),
    "github_url" VARCHAR(255),
    "website_url" VARCHAR(255),
    "bio" TEXT,
    "availability" VARCHAR(100),
    "expected_salary" VARCHAR(100),
    "notice_period" VARCHAR(50),
    "languages" TEXT,
    "certifications" TEXT,
    "achievements" TEXT,
    "references" TEXT,
    "created_at" BIGINT NOT NULL,
    "updated_at" BIGINT NOT NULL,

    CONSTRAINT "user_profile_detail_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_job_preference" (
    "id" BIGSERIAL NOT NULL,
    "user_id" BIGINT NOT NULL,
    "first_priority" VARCHAR(255),
    "second_priority" VARCHAR(255),
    "third_priority" VARCHAR(255),
    "summary" TEXT,
    "created_at" BIGINT NOT NULL,
    "updated_at" BIGINT NOT NULL,

    CONSTRAINT "user_job_preference_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "jobs" (
    "id" BIGSERIAL NOT NULL,
    "job_code" VARCHAR(50) NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "short_description" VARCHAR(500),
    "description" TEXT,
    "company" VARCHAR(255) NOT NULL,
    "post_from" DATE NOT NULL,
    "post_to" DATE NOT NULL,
    "status" BOOLEAN NOT NULL DEFAULT true,
    "job_type" "JobType" NOT NULL DEFAULT 'NORMAL',
    "job_status" "JobStatus" NOT NULL DEFAULT 'ACTIVE',
    "industry" VARCHAR(255),
    "employment_type" "EmploymentType" NOT NULL,
    "employmentShift" VARCHAR(50),
    "total_positions" INTEGER DEFAULT 1,
    "minimumExperience" VARCHAR(255),
    "certification" TEXT,
    "minimumSalary" VARCHAR(50),
    "benefits" TEXT,
    "success_criteria" TEXT,
    "created_by" BIGINT NOT NULL,
    "updated_by" BIGINT,
    "created_at" BIGINT NOT NULL,
    "updated_at" BIGINT NOT NULL,
    "deleted_at" BIGINT,

    CONSTRAINT "jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "job_skills" (
    "id" BIGSERIAL NOT NULL,
    "job_id" BIGINT NOT NULL,
    "skillName" VARCHAR(255) NOT NULL,
    "priority" "JobSkillPriority" NOT NULL DEFAULT 'REQUIRED',

    CONSTRAINT "job_skills_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "job_locations" (
    "id" BIGSERIAL NOT NULL,
    "job_id" BIGINT NOT NULL,
    "city" VARCHAR(255) NOT NULL,
    "country" VARCHAR(50),
    "created_at" BIGINT NOT NULL,
    "updated_at" BIGINT NOT NULL,

    CONSTRAINT "job_locations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "job_education_requirements" (
    "id" BIGSERIAL NOT NULL,
    "job_id" BIGINT NOT NULL,
    "education_level_id" BIGINT NOT NULL,
    "field" VARCHAR(255),
    "minimum_gpa" VARCHAR(50),
    "gpa_scale" VARCHAR(50),
    "is_required" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "created_at" BIGINT NOT NULL,
    "updated_at" BIGINT NOT NULL,

    CONSTRAINT "job_education_requirements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "jobs_applied" (
    "id" BIGSERIAL NOT NULL,
    "job_id" BIGINT NOT NULL,
    "user_id" BIGINT NOT NULL,
    "status" "ApplicationStatus" NOT NULL DEFAULT 'SUBMITTED',
    "applied_at" BIGINT NOT NULL,
    "status_updated_at" BIGINT,
    "note" TEXT,
    "batch_id" BIGINT,

    CONSTRAINT "jobs_applied_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "jobs_bookmark" (
    "id" BIGSERIAL NOT NULL,
    "job_id" BIGINT NOT NULL,
    "user_id" BIGINT NOT NULL,
    "status" BOOLEAN NOT NULL DEFAULT true,
    "created_at" BIGINT NOT NULL,
    "updated_at" BIGINT NOT NULL,

    CONSTRAINT "jobs_bookmark_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "institute" (
    "id" BIGSERIAL NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "visible" BOOLEAN NOT NULL DEFAULT true,
    "deleted_at" BIGINT,

    CONSTRAINT "institute_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "job_workflow" (
    "id" BIGSERIAL NOT NULL,
    "job_id" BIGINT NOT NULL,
    "created_at" BIGINT NOT NULL,
    "updated_at" BIGINT NOT NULL,

    CONSTRAINT "job_workflow_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workflow_step" (
    "id" BIGSERIAL NOT NULL,
    "workflow_id" BIGINT NOT NULL,
    "step_name" VARCHAR(255) NOT NULL,
    "step_type" "StepType",
    "step_order" INTEGER NOT NULL,
    "is_required" BOOLEAN NOT NULL DEFAULT true,
    "is_skippable" BOOLEAN NOT NULL DEFAULT false,
    "status" "StepStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_at" BIGINT NOT NULL,
    "updated_at" BIGINT NOT NULL,
    "evaluationSchema" JSONB,
    "capacityPerSlot" INTEGER,
    "step_metadata" JSONB,

    CONSTRAINT "workflow_step_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "interview_slot" (
    "id" BIGSERIAL NOT NULL,
    "step_id" BIGINT NOT NULL,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "capacity" INTEGER NOT NULL DEFAULT 1,
    "isBlocked" BOOLEAN NOT NULL DEFAULT false,
    "created_at" BIGINT NOT NULL,
    "updated_at" BIGINT NOT NULL,

    CONSTRAINT "interview_slot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "slot_booking" (
    "id" BIGSERIAL NOT NULL,
    "slot_id" BIGINT NOT NULL,
    "candidate_id" BIGINT NOT NULL,
    "application_id" BIGINT NOT NULL,
    "status" "BookingStatus" NOT NULL DEFAULT 'RESERVED',
    "created_at" BIGINT NOT NULL,
    "updated_at" BIGINT NOT NULL,

    CONSTRAINT "slot_booking_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stage_evaluation" (
    "id" BIGSERIAL NOT NULL,
    "pipeline_step_id" BIGINT NOT NULL,
    "evaluator_id" BIGINT NOT NULL,
    "formData" JSONB NOT NULL,
    "score" DOUBLE PRECISION,
    "recommendation" "InterviewRecommendation",
    "submitted_at" BIGINT,

    CONSTRAINT "stage_evaluation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "candidate_pipeline" (
    "id" BIGSERIAL NOT NULL,
    "candidate_id" BIGINT NOT NULL,
    "job_id" BIGINT NOT NULL,
    "application_id" BIGINT NOT NULL,
    "current_step_order" INTEGER NOT NULL DEFAULT 1,
    "overall_status" "PipelineStatus" NOT NULL DEFAULT 'IN_PROGRESS',
    "started_at" BIGINT NOT NULL,
    "completed_at" BIGINT,
    "lock_state" "PipelineLock" NOT NULL DEFAULT 'NONE',
    "pipeline_mode" "PipelineMode" NOT NULL DEFAULT 'INDIVIDUAL',

    CONSTRAINT "candidate_pipeline_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "candidate_pipeline_step" (
    "id" BIGSERIAL NOT NULL,
    "pipeline_id" BIGINT NOT NULL,
    "workflow_step_id" BIGINT NOT NULL,
    "step_order" INTEGER NOT NULL,
    "status" "StepInstanceStatus" NOT NULL DEFAULT 'PENDING',
    "feedback" TEXT,
    "started_at" BIGINT,
    "completed_at" BIGINT,
    "skipped_at" BIGINT,
    "skipped_by" BIGINT,
    "batch_id" BIGINT,

    CONSTRAINT "candidate_pipeline_step_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "interview" (
    "id" BIGSERIAL NOT NULL,
    "pipeline_id" BIGINT NOT NULL,
    "pipeline_step_id" BIGINT NOT NULL,
    "candidate_id" BIGINT NOT NULL,
    "feedback" TEXT,
    "rating" INTEGER,
    "recommendation" "InterviewRecommendation",
    "scheduled_at" BIGINT,
    "conducted_at" BIGINT,
    "submitted_at" BIGINT,

    CONSTRAINT "interview_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_log" (
    "id" BIGSERIAL NOT NULL,
    "pipeline_id" BIGINT,
    "user_id" BIGINT NOT NULL,
    "action" "AuditAction" NOT NULL,
    "entity_type" VARCHAR(100) NOT NULL,
    "entity_id" BIGINT NOT NULL,
    "changes" TEXT,
    "timestamp" BIGINT NOT NULL,

    CONSTRAINT "audit_log_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification" (
    "id" BIGSERIAL NOT NULL,
    "user_id" BIGINT NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "message" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL,
    "entity_type" VARCHAR(100),
    "entity_id" BIGINT,
    "is_read" BOOLEAN NOT NULL DEFAULT false,
    "created_at" BIGINT NOT NULL,

    CONSTRAINT "notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "batch" (
    "id" BIGSERIAL NOT NULL,
    "job_id" BIGINT NOT NULL,
    "workflow_step_id" BIGINT NOT NULL,
    "batch_number" INTEGER NOT NULL,
    "batch_name" VARCHAR(255),
    "status" "BatchStatus" NOT NULL DEFAULT 'PENDING_ADMIN',
    "created_by" BIGINT NOT NULL,
    "created_at" BIGINT NOT NULL,
    "updated_at" BIGINT NOT NULL,

    CONSTRAINT "batch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "batch_candidate" (
    "id" BIGSERIAL NOT NULL,
    "batch_id" BIGINT NOT NULL,
    "application_id" BIGINT NOT NULL,
    "candidate_id" BIGINT NOT NULL,
    "current_status" "BatchCandidateStatus" NOT NULL DEFAULT 'PENDING',
    "evaluated_at" BIGINT,
    "evaluated_by" BIGINT,

    CONSTRAINT "batch_candidate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "batch_candidate_evaluation" (
    "id" BIGSERIAL NOT NULL,
    "batch_candidate_id" BIGINT NOT NULL,
    "evaluator_id" BIGINT NOT NULL,
    "status" "BatchCandidateStatus" NOT NULL,
    "feedback" TEXT,
    "rating" INTEGER,
    "submitted_at" BIGINT NOT NULL,

    CONSTRAINT "batch_candidate_evaluation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "letter_of_intent" (
    "id" BIGSERIAL NOT NULL,
    "pipeline_step_id" BIGINT NOT NULL,
    "candidate_id" BIGINT NOT NULL,
    "job_id" BIGINT NOT NULL,
    "status" "LetterStatus" NOT NULL DEFAULT 'DRAFTED',
    "form_data" JSONB NOT NULL,
    "generated_at" BIGINT,
    "sent_at" BIGINT,
    "accepted_at" BIGINT,
    "rejected_at" BIGINT,
    "expired_at" BIGINT,
    "created_at" BIGINT NOT NULL,
    "updated_at" BIGINT NOT NULL,

    CONSTRAINT "letter_of_intent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "offer_letter" (
    "id" BIGSERIAL NOT NULL,
    "letter_of_intent_id" BIGINT NOT NULL,
    "pipeline_step_id" BIGINT NOT NULL,
    "candidate_id" BIGINT NOT NULL,
    "job_id" BIGINT NOT NULL,
    "status" "LetterStatus" NOT NULL DEFAULT 'DRAFTED',
    "form_data" JSONB NOT NULL,
    "generated_at" BIGINT,
    "sent_at" BIGINT,
    "accepted_at" BIGINT,
    "rejected_at" BIGINT,
    "expired_at" BIGINT,
    "created_at" BIGINT NOT NULL,
    "updated_at" BIGINT NOT NULL,

    CONSTRAINT "offer_letter_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "organization_settings" (
    "id" BIGSERIAL NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "logo" VARCHAR(255),
    "website" VARCHAR(255),
    "contact_email" VARCHAR(100),
    "contact_phone" VARCHAR(20),
    "address" VARCHAR(500),
    "description" TEXT,
    "social_links" JSONB,
    "locations" JSONB,
    "updated_at" BIGINT NOT NULL,

    CONSTRAINT "organization_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_shortlist_run" (
    "id" BIGSERIAL NOT NULL,
    "job_id" BIGINT NOT NULL,
    "triggered_by" BIGINT NOT NULL,
    "status" "AiShortlistRunStatus" NOT NULL DEFAULT 'RUNNING',
    "total_candidates" INTEGER NOT NULL DEFAULT 0,
    "ai_model" TEXT,
    "started_at" BIGINT NOT NULL,
    "completed_at" BIGINT,
    "created_at" BIGINT NOT NULL,

    CONSTRAINT "ai_shortlist_run_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_candidate_shortlist_result" (
    "id" BIGSERIAL NOT NULL,
    "run_id" BIGINT NOT NULL,
    "job_id" BIGINT NOT NULL,
    "candidate_id" BIGINT NOT NULL,
    "application_id" BIGINT NOT NULL,
    "status" "AiCandidateResultStatus" NOT NULL DEFAULT 'PENDING',
    "error_message" TEXT,
    "overall_score" INTEGER,
    "skills_score" INTEGER,
    "education_score" INTEGER,
    "experience_score" INTEGER,
    "success_criteria_score" INTEGER,
    "assessment_score" INTEGER,
    "mandatory_requirements_met" BOOLEAN,
    "ai_confidence" INTEGER,
    "recommendation" "AiShortlistRecommendation",
    "matched_requirements" JSONB,
    "missing_requirements" JSONB,
    "mandatory_checklist" JSONB,
    "strengths" JSONB,
    "concerns" JSONB,
    "ai_reasoning" TEXT,
    "created_at" BIGINT NOT NULL,
    "updated_at" BIGINT NOT NULL,

    CONSTRAINT "ai_candidate_shortlist_result_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_username_key" ON "user"("username");

-- CreateIndex
CREATE UNIQUE INDEX "user_email_key" ON "user"("email");

-- CreateIndex
CREATE INDEX "user_role_idx" ON "user"("role");

-- CreateIndex
CREATE INDEX "user_user_status_idx" ON "user"("user_status");

-- CreateIndex
CREATE UNIQUE INDEX "password_reset_token_token_key" ON "password_reset_token"("token");

-- CreateIndex
CREATE INDEX "password_reset_token_user_id_idx" ON "password_reset_token"("user_id");

-- CreateIndex
CREATE INDEX "password_reset_token_token_idx" ON "password_reset_token"("token");

-- CreateIndex
CREATE INDEX "password_reset_token_expires_at_idx" ON "password_reset_token"("expires_at");

-- CreateIndex
CREATE INDEX "user_education_user_id_idx" ON "user_education"("user_id");

-- CreateIndex
CREATE INDEX "user_education_education_level_id_idx" ON "user_education"("education_level_id");

-- CreateIndex
CREATE INDEX "user_education_institute_id_idx" ON "user_education"("institute_id");

-- CreateIndex
CREATE INDEX "user_skills_user_id_idx" ON "user_skills"("user_id");

-- CreateIndex
CREATE INDEX "user_skills_verified_level_idx" ON "user_skills"("verified_level");

-- CreateIndex
CREATE INDEX "user_skills_skillName_idx" ON "user_skills"("skillName");

-- CreateIndex
CREATE UNIQUE INDEX "user_skills_user_id_skillName_key" ON "user_skills"("user_id", "skillName");

-- CreateIndex
CREATE UNIQUE INDEX "skill_assessment_config_skill_name_key" ON "skill_assessment_config"("skill_name");

-- CreateIndex
CREATE INDEX "skill_assessment_user_skill_id_idx" ON "skill_assessment"("user_skill_id");

-- CreateIndex
CREATE INDEX "skill_assessment_user_id_idx" ON "skill_assessment"("user_id");

-- CreateIndex
CREATE INDEX "skill_assessment_skill_name_idx" ON "skill_assessment"("skill_name");

-- CreateIndex
CREATE INDEX "skill_assessment_status_idx" ON "skill_assessment"("status");

-- CreateIndex
CREATE INDEX "skill_assessment_level_idx" ON "skill_assessment"("level");

-- CreateIndex
CREATE INDEX "skill_assessment_submitted_at_idx" ON "skill_assessment"("submitted_at");

-- CreateIndex
CREATE UNIQUE INDEX "skill_assessment_user_skill_id_attempt_number_key" ON "skill_assessment"("user_skill_id", "attempt_number");

-- CreateIndex
CREATE INDEX "assessment_question_assessment_id_idx" ON "assessment_question"("assessment_id");

-- CreateIndex
CREATE UNIQUE INDEX "assessment_question_assessment_id_order_key" ON "assessment_question"("assessment_id", "order");

-- CreateIndex
CREATE INDEX "assessment_answer_assessment_id_idx" ON "assessment_answer"("assessment_id");

-- CreateIndex
CREATE UNIQUE INDEX "assessment_answer_assessment_id_question_id_key" ON "assessment_answer"("assessment_id", "question_id");

-- CreateIndex
CREATE INDEX "user_experience_user_id_idx" ON "user_experience"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_profile_detail_user_id_key" ON "user_profile_detail"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_job_preference_user_id_key" ON "user_job_preference"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "jobs_job_code_key" ON "jobs"("job_code");

-- CreateIndex
CREATE INDEX "jobs_created_by_idx" ON "jobs"("created_by");

-- CreateIndex
CREATE INDEX "jobs_updated_by_idx" ON "jobs"("updated_by");

-- CreateIndex
CREATE INDEX "jobs_status_idx" ON "jobs"("status");

-- CreateIndex
CREATE INDEX "jobs_job_code_idx" ON "jobs"("job_code");

-- CreateIndex
CREATE INDEX "jobs_deleted_at_idx" ON "jobs"("deleted_at");

-- CreateIndex
CREATE INDEX "jobs_job_type_idx" ON "jobs"("job_type");

-- CreateIndex
CREATE INDEX "jobs_job_status_idx" ON "jobs"("job_status");

-- CreateIndex
CREATE INDEX "job_skills_job_id_idx" ON "job_skills"("job_id");

-- CreateIndex
CREATE UNIQUE INDEX "job_skills_job_id_skillName_key" ON "job_skills"("job_id", "skillName");

-- CreateIndex
CREATE INDEX "job_locations_job_id_idx" ON "job_locations"("job_id");

-- CreateIndex
CREATE INDEX "job_education_requirements_job_id_idx" ON "job_education_requirements"("job_id");

-- CreateIndex
CREATE INDEX "job_education_requirements_education_level_id_idx" ON "job_education_requirements"("education_level_id");

-- CreateIndex
CREATE INDEX "jobs_applied_job_id_idx" ON "jobs_applied"("job_id");

-- CreateIndex
CREATE INDEX "jobs_applied_user_id_idx" ON "jobs_applied"("user_id");

-- CreateIndex
CREATE INDEX "jobs_applied_batch_id_idx" ON "jobs_applied"("batch_id");

-- CreateIndex
CREATE UNIQUE INDEX "jobs_applied_job_id_user_id_key" ON "jobs_applied"("job_id", "user_id");

-- CreateIndex
CREATE INDEX "jobs_bookmark_job_id_idx" ON "jobs_bookmark"("job_id");

-- CreateIndex
CREATE INDEX "jobs_bookmark_user_id_idx" ON "jobs_bookmark"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "jobs_bookmark_job_id_user_id_key" ON "jobs_bookmark"("job_id", "user_id");

-- CreateIndex
CREATE INDEX "institute_deleted_at_idx" ON "institute"("deleted_at");

-- CreateIndex
CREATE UNIQUE INDEX "job_workflow_job_id_key" ON "job_workflow"("job_id");

-- CreateIndex
CREATE INDEX "workflow_step_workflow_id_idx" ON "workflow_step"("workflow_id");

-- CreateIndex
CREATE INDEX "interview_slot_step_id_idx" ON "interview_slot"("step_id");

-- CreateIndex
CREATE INDEX "slot_booking_slot_id_idx" ON "slot_booking"("slot_id");

-- CreateIndex
CREATE UNIQUE INDEX "slot_booking_slot_id_candidate_id_key" ON "slot_booking"("slot_id", "candidate_id");

-- CreateIndex
CREATE UNIQUE INDEX "stage_evaluation_pipeline_step_id_evaluator_id_key" ON "stage_evaluation"("pipeline_step_id", "evaluator_id");

-- CreateIndex
CREATE UNIQUE INDEX "candidate_pipeline_application_id_key" ON "candidate_pipeline"("application_id");

-- CreateIndex
CREATE INDEX "candidate_pipeline_candidate_id_idx" ON "candidate_pipeline"("candidate_id");

-- CreateIndex
CREATE INDEX "candidate_pipeline_job_id_idx" ON "candidate_pipeline"("job_id");

-- CreateIndex
CREATE INDEX "candidate_pipeline_overall_status_idx" ON "candidate_pipeline"("overall_status");

-- CreateIndex
CREATE INDEX "candidate_pipeline_pipeline_mode_idx" ON "candidate_pipeline"("pipeline_mode");

-- CreateIndex
CREATE INDEX "candidate_pipeline_step_pipeline_id_idx" ON "candidate_pipeline_step"("pipeline_id");

-- CreateIndex
CREATE INDEX "candidate_pipeline_step_workflow_step_id_idx" ON "candidate_pipeline_step"("workflow_step_id");

-- CreateIndex
CREATE INDEX "candidate_pipeline_step_status_idx" ON "candidate_pipeline_step"("status");

-- CreateIndex
CREATE INDEX "candidate_pipeline_step_batch_id_idx" ON "candidate_pipeline_step"("batch_id");

-- CreateIndex
CREATE INDEX "interview_pipeline_id_idx" ON "interview"("pipeline_id");

-- CreateIndex
CREATE INDEX "interview_pipeline_step_id_idx" ON "interview"("pipeline_step_id");

-- CreateIndex
CREATE INDEX "interview_candidate_id_idx" ON "interview"("candidate_id");

-- CreateIndex
CREATE INDEX "audit_log_pipeline_id_idx" ON "audit_log"("pipeline_id");

-- CreateIndex
CREATE INDEX "audit_log_user_id_idx" ON "audit_log"("user_id");

-- CreateIndex
CREATE INDEX "audit_log_timestamp_idx" ON "audit_log"("timestamp");

-- CreateIndex
CREATE INDEX "notification_user_id_idx" ON "notification"("user_id");

-- CreateIndex
CREATE INDEX "notification_is_read_idx" ON "notification"("is_read");

-- CreateIndex
CREATE INDEX "notification_created_at_idx" ON "notification"("created_at");

-- CreateIndex
CREATE INDEX "batch_job_id_idx" ON "batch"("job_id");

-- CreateIndex
CREATE INDEX "batch_workflow_step_id_idx" ON "batch"("workflow_step_id");

-- CreateIndex
CREATE INDEX "batch_status_idx" ON "batch"("status");

-- CreateIndex
CREATE INDEX "batch_created_by_idx" ON "batch"("created_by");

-- CreateIndex
CREATE INDEX "batch_candidate_batch_id_idx" ON "batch_candidate"("batch_id");

-- CreateIndex
CREATE INDEX "batch_candidate_application_id_idx" ON "batch_candidate"("application_id");

-- CreateIndex
CREATE INDEX "batch_candidate_candidate_id_idx" ON "batch_candidate"("candidate_id");

-- CreateIndex
CREATE INDEX "batch_candidate_current_status_idx" ON "batch_candidate"("current_status");

-- CreateIndex
CREATE UNIQUE INDEX "batch_candidate_batch_id_candidate_id_key" ON "batch_candidate"("batch_id", "candidate_id");

-- CreateIndex
CREATE INDEX "batch_candidate_evaluation_batch_candidate_id_idx" ON "batch_candidate_evaluation"("batch_candidate_id");

-- CreateIndex
CREATE INDEX "batch_candidate_evaluation_evaluator_id_idx" ON "batch_candidate_evaluation"("evaluator_id");

-- CreateIndex
CREATE INDEX "letter_of_intent_candidate_id_idx" ON "letter_of_intent"("candidate_id");

-- CreateIndex
CREATE INDEX "letter_of_intent_job_id_idx" ON "letter_of_intent"("job_id");

-- CreateIndex
CREATE INDEX "letter_of_intent_pipeline_step_id_idx" ON "letter_of_intent"("pipeline_step_id");

-- CreateIndex
CREATE INDEX "letter_of_intent_status_idx" ON "letter_of_intent"("status");

-- CreateIndex
CREATE UNIQUE INDEX "letter_of_intent_pipeline_step_id_candidate_id_key" ON "letter_of_intent"("pipeline_step_id", "candidate_id");

-- CreateIndex
CREATE UNIQUE INDEX "offer_letter_letter_of_intent_id_key" ON "offer_letter"("letter_of_intent_id");

-- CreateIndex
CREATE INDEX "offer_letter_candidate_id_idx" ON "offer_letter"("candidate_id");

-- CreateIndex
CREATE INDEX "offer_letter_job_id_idx" ON "offer_letter"("job_id");

-- CreateIndex
CREATE INDEX "offer_letter_pipeline_step_id_idx" ON "offer_letter"("pipeline_step_id");

-- CreateIndex
CREATE INDEX "offer_letter_letter_of_intent_id_idx" ON "offer_letter"("letter_of_intent_id");

-- CreateIndex
CREATE INDEX "offer_letter_status_idx" ON "offer_letter"("status");

-- CreateIndex
CREATE INDEX "ai_shortlist_run_job_id_idx" ON "ai_shortlist_run"("job_id");

-- CreateIndex
CREATE INDEX "ai_shortlist_run_status_idx" ON "ai_shortlist_run"("status");

-- CreateIndex
CREATE INDEX "ai_candidate_shortlist_result_run_id_idx" ON "ai_candidate_shortlist_result"("run_id");

-- CreateIndex
CREATE INDEX "ai_candidate_shortlist_result_job_id_idx" ON "ai_candidate_shortlist_result"("job_id");

-- CreateIndex
CREATE INDEX "ai_candidate_shortlist_result_candidate_id_idx" ON "ai_candidate_shortlist_result"("candidate_id");

-- CreateIndex
CREATE UNIQUE INDEX "ai_candidate_shortlist_result_run_id_candidate_id_key" ON "ai_candidate_shortlist_result"("run_id", "candidate_id");

-- AddForeignKey
ALTER TABLE "password_reset_token" ADD CONSTRAINT "password_reset_token_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_education" ADD CONSTRAINT "user_education_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_education" ADD CONSTRAINT "user_education_education_level_id_fkey" FOREIGN KEY ("education_level_id") REFERENCES "user_education_level"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_education" ADD CONSTRAINT "user_education_institute_id_fkey" FOREIGN KEY ("institute_id") REFERENCES "institute"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_skills" ADD CONSTRAINT "user_skills_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "skill_assessment" ADD CONSTRAINT "skill_assessment_user_skill_id_fkey" FOREIGN KEY ("user_skill_id") REFERENCES "user_skills"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "skill_assessment" ADD CONSTRAINT "skill_assessment_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assessment_question" ADD CONSTRAINT "assessment_question_assessment_id_fkey" FOREIGN KEY ("assessment_id") REFERENCES "skill_assessment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assessment_answer" ADD CONSTRAINT "assessment_answer_assessment_id_fkey" FOREIGN KEY ("assessment_id") REFERENCES "skill_assessment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assessment_answer" ADD CONSTRAINT "assessment_answer_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "assessment_question"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_experience" ADD CONSTRAINT "user_experience_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_profile_detail" ADD CONSTRAINT "user_profile_detail_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_job_preference" ADD CONSTRAINT "user_job_preference_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "job_skills" ADD CONSTRAINT "job_skills_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "job_locations" ADD CONSTRAINT "job_locations_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "job_education_requirements" ADD CONSTRAINT "job_education_requirements_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "job_education_requirements" ADD CONSTRAINT "job_education_requirements_education_level_id_fkey" FOREIGN KEY ("education_level_id") REFERENCES "user_education_level"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "jobs_applied" ADD CONSTRAINT "jobs_applied_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "jobs_applied" ADD CONSTRAINT "jobs_applied_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "jobs_applied" ADD CONSTRAINT "jobs_applied_batch_id_fkey" FOREIGN KEY ("batch_id") REFERENCES "batch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "jobs_bookmark" ADD CONSTRAINT "jobs_bookmark_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "jobs_bookmark" ADD CONSTRAINT "jobs_bookmark_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "job_workflow" ADD CONSTRAINT "job_workflow_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workflow_step" ADD CONSTRAINT "workflow_step_workflow_id_fkey" FOREIGN KEY ("workflow_id") REFERENCES "job_workflow"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "interview_slot" ADD CONSTRAINT "interview_slot_step_id_fkey" FOREIGN KEY ("step_id") REFERENCES "workflow_step"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "slot_booking" ADD CONSTRAINT "slot_booking_slot_id_fkey" FOREIGN KEY ("slot_id") REFERENCES "interview_slot"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "slot_booking" ADD CONSTRAINT "slot_booking_candidate_id_fkey" FOREIGN KEY ("candidate_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "slot_booking" ADD CONSTRAINT "slot_booking_application_id_fkey" FOREIGN KEY ("application_id") REFERENCES "jobs_applied"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stage_evaluation" ADD CONSTRAINT "stage_evaluation_pipeline_step_id_fkey" FOREIGN KEY ("pipeline_step_id") REFERENCES "candidate_pipeline_step"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stage_evaluation" ADD CONSTRAINT "stage_evaluation_evaluator_id_fkey" FOREIGN KEY ("evaluator_id") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "candidate_pipeline" ADD CONSTRAINT "candidate_pipeline_candidate_id_fkey" FOREIGN KEY ("candidate_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "candidate_pipeline" ADD CONSTRAINT "candidate_pipeline_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "candidate_pipeline" ADD CONSTRAINT "candidate_pipeline_application_id_fkey" FOREIGN KEY ("application_id") REFERENCES "jobs_applied"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "candidate_pipeline_step" ADD CONSTRAINT "candidate_pipeline_step_pipeline_id_fkey" FOREIGN KEY ("pipeline_id") REFERENCES "candidate_pipeline"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "candidate_pipeline_step" ADD CONSTRAINT "candidate_pipeline_step_workflow_step_id_fkey" FOREIGN KEY ("workflow_step_id") REFERENCES "workflow_step"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "candidate_pipeline_step" ADD CONSTRAINT "candidate_pipeline_step_batch_id_fkey" FOREIGN KEY ("batch_id") REFERENCES "batch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "interview" ADD CONSTRAINT "interview_pipeline_id_fkey" FOREIGN KEY ("pipeline_id") REFERENCES "candidate_pipeline"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "interview" ADD CONSTRAINT "interview_pipeline_step_id_fkey" FOREIGN KEY ("pipeline_step_id") REFERENCES "candidate_pipeline_step"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "interview" ADD CONSTRAINT "interview_candidate_id_fkey" FOREIGN KEY ("candidate_id") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_pipeline_id_fkey" FOREIGN KEY ("pipeline_id") REFERENCES "candidate_pipeline"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification" ADD CONSTRAINT "notification_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "batch" ADD CONSTRAINT "batch_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "batch" ADD CONSTRAINT "batch_workflow_step_id_fkey" FOREIGN KEY ("workflow_step_id") REFERENCES "workflow_step"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "batch" ADD CONSTRAINT "batch_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "batch_candidate" ADD CONSTRAINT "batch_candidate_batch_id_fkey" FOREIGN KEY ("batch_id") REFERENCES "batch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "batch_candidate" ADD CONSTRAINT "batch_candidate_application_id_fkey" FOREIGN KEY ("application_id") REFERENCES "jobs_applied"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "batch_candidate" ADD CONSTRAINT "batch_candidate_candidate_id_fkey" FOREIGN KEY ("candidate_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "batch_candidate" ADD CONSTRAINT "batch_candidate_evaluated_by_fkey" FOREIGN KEY ("evaluated_by") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "batch_candidate_evaluation" ADD CONSTRAINT "batch_candidate_evaluation_batch_candidate_id_fkey" FOREIGN KEY ("batch_candidate_id") REFERENCES "batch_candidate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "batch_candidate_evaluation" ADD CONSTRAINT "batch_candidate_evaluation_evaluator_id_fkey" FOREIGN KEY ("evaluator_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "letter_of_intent" ADD CONSTRAINT "letter_of_intent_pipeline_step_id_fkey" FOREIGN KEY ("pipeline_step_id") REFERENCES "candidate_pipeline_step"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "letter_of_intent" ADD CONSTRAINT "letter_of_intent_candidate_id_fkey" FOREIGN KEY ("candidate_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "letter_of_intent" ADD CONSTRAINT "letter_of_intent_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "offer_letter" ADD CONSTRAINT "offer_letter_letter_of_intent_id_fkey" FOREIGN KEY ("letter_of_intent_id") REFERENCES "letter_of_intent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "offer_letter" ADD CONSTRAINT "offer_letter_pipeline_step_id_fkey" FOREIGN KEY ("pipeline_step_id") REFERENCES "candidate_pipeline_step"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "offer_letter" ADD CONSTRAINT "offer_letter_candidate_id_fkey" FOREIGN KEY ("candidate_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "offer_letter" ADD CONSTRAINT "offer_letter_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_shortlist_run" ADD CONSTRAINT "ai_shortlist_run_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_shortlist_run" ADD CONSTRAINT "ai_shortlist_run_triggered_by_fkey" FOREIGN KEY ("triggered_by") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_candidate_shortlist_result" ADD CONSTRAINT "ai_candidate_shortlist_result_run_id_fkey" FOREIGN KEY ("run_id") REFERENCES "ai_shortlist_run"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_candidate_shortlist_result" ADD CONSTRAINT "ai_candidate_shortlist_result_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_candidate_shortlist_result" ADD CONSTRAINT "ai_candidate_shortlist_result_candidate_id_fkey" FOREIGN KEY ("candidate_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
