-- CreateEnum
CREATE TYPE "QuickTestAttemptStatus" AS ENUM ('IN_PROGRESS', 'SUBMITTED', 'EXPIRED');

-- AlterTable
ALTER TABLE "ai_candidate_shortlist_result" ADD COLUMN     "quick_test_score" INTEGER;

-- CreateTable
CREATE TABLE "job_quick_test" (
    "id" BIGSERIAL NOT NULL,
    "job_id" BIGINT NOT NULL,
    "is_enabled" BOOLEAN NOT NULL DEFAULT true,
    "question_count" INTEGER NOT NULL DEFAULT 10,
    "time_limit_minutes" INTEGER NOT NULL DEFAULT 15,
    "created_at" BIGINT NOT NULL,
    "updated_at" BIGINT NOT NULL,

    CONSTRAINT "job_quick_test_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quick_test_attempt" (
    "id" BIGSERIAL NOT NULL,
    "job_id" BIGINT NOT NULL,
    "user_id" BIGINT NOT NULL,
    "status" "QuickTestAttemptStatus" NOT NULL DEFAULT 'IN_PROGRESS',
    "question_count" INTEGER NOT NULL,
    "time_limit_minutes" INTEGER NOT NULL,
    "max_points" INTEGER NOT NULL DEFAULT 100,
    "scored_points" INTEGER,
    "score_percent" INTEGER,
    "ai_model" TEXT,
    "application_id" BIGINT,
    "started_at" BIGINT NOT NULL,
    "expires_at" BIGINT NOT NULL,
    "submitted_at" BIGINT,
    "created_at" BIGINT NOT NULL,
    "updated_at" BIGINT NOT NULL,

    CONSTRAINT "quick_test_attempt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quick_test_question" (
    "id" BIGSERIAL NOT NULL,
    "attempt_id" BIGINT NOT NULL,
    "question" TEXT NOT NULL,
    "options" JSONB NOT NULL,
    "correct_option" VARCHAR(500) NOT NULL,
    "points" INTEGER NOT NULL,
    "order" INTEGER NOT NULL,

    CONSTRAINT "quick_test_question_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quick_test_answer" (
    "id" BIGSERIAL NOT NULL,
    "attempt_id" BIGINT NOT NULL,
    "question_id" BIGINT NOT NULL,
    "selected_option" VARCHAR(500) NOT NULL,
    "is_correct" BOOLEAN NOT NULL DEFAULT false,
    "points_awarded" INTEGER NOT NULL DEFAULT 0,
    "created_at" BIGINT NOT NULL,
    "updated_at" BIGINT NOT NULL,

    CONSTRAINT "quick_test_answer_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "job_quick_test_job_id_key" ON "job_quick_test"("job_id");

-- CreateIndex
CREATE INDEX "quick_test_attempt_job_id_idx" ON "quick_test_attempt"("job_id");

-- CreateIndex
CREATE INDEX "quick_test_attempt_user_id_idx" ON "quick_test_attempt"("user_id");

-- CreateIndex
CREATE INDEX "quick_test_attempt_status_idx" ON "quick_test_attempt"("status");

-- CreateIndex
CREATE UNIQUE INDEX "quick_test_attempt_job_id_user_id_key" ON "quick_test_attempt"("job_id", "user_id");

-- CreateIndex
CREATE INDEX "quick_test_question_attempt_id_idx" ON "quick_test_question"("attempt_id");

-- CreateIndex
CREATE UNIQUE INDEX "quick_test_question_attempt_id_order_key" ON "quick_test_question"("attempt_id", "order");

-- CreateIndex
CREATE INDEX "quick_test_answer_attempt_id_idx" ON "quick_test_answer"("attempt_id");

-- CreateIndex
CREATE UNIQUE INDEX "quick_test_answer_attempt_id_question_id_key" ON "quick_test_answer"("attempt_id", "question_id");

-- AddForeignKey
ALTER TABLE "job_quick_test" ADD CONSTRAINT "job_quick_test_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quick_test_attempt" ADD CONSTRAINT "quick_test_attempt_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quick_test_attempt" ADD CONSTRAINT "quick_test_attempt_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quick_test_question" ADD CONSTRAINT "quick_test_question_attempt_id_fkey" FOREIGN KEY ("attempt_id") REFERENCES "quick_test_attempt"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quick_test_answer" ADD CONSTRAINT "quick_test_answer_attempt_id_fkey" FOREIGN KEY ("attempt_id") REFERENCES "quick_test_attempt"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quick_test_answer" ADD CONSTRAINT "quick_test_answer_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "quick_test_question"("id") ON DELETE CASCADE ON UPDATE CASCADE;
