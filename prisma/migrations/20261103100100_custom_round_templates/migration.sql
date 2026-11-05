-- AlterTable
ALTER TABLE "workflow_step" ADD COLUMN     "custom_round_template_id" BIGINT;

-- CreateTable
CREATE TABLE "custom_round_template" (
    "id" BIGSERIAL NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "description" VARCHAR(500),
    "candidate_instructions" TEXT,
    "is_interview" BOOLEAN NOT NULL DEFAULT true,
    "interview_mode" "InterviewMode",
    "duration_mins" INTEGER,
    "panel_size" INTEGER NOT NULL DEFAULT 1,
    "buffer_mins" INTEGER NOT NULL DEFAULT 0,
    "capacity_per_slot" INTEGER NOT NULL DEFAULT 1,
    "evaluation_schema" JSONB,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" BIGINT NOT NULL,
    "updated_at" BIGINT NOT NULL,

    CONSTRAINT "custom_round_template_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "workflow_step" ADD CONSTRAINT "workflow_step_custom_round_template_id_fkey" FOREIGN KEY ("custom_round_template_id") REFERENCES "custom_round_template"("id") ON DELETE SET NULL ON UPDATE CASCADE;
