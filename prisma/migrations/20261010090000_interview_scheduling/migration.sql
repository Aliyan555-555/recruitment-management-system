-- CreateEnum
CREATE TYPE "InterviewMode" AS ENUM ('REMOTE', 'ONSITE');

-- AlterEnum
ALTER TYPE "UserRole" ADD VALUE 'INTERVIEWER';

-- DropIndex
DROP INDEX "slot_booking_slot_id_candidate_id_key";

-- AlterTable
ALTER TABLE "workflow_step" ADD COLUMN     "buffer_mins" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "duration_mins" INTEGER,
ADD COLUMN     "interview_mode" "InterviewMode",
ADD COLUMN     "panel_size" INTEGER NOT NULL DEFAULT 1;

-- AlterTable
ALTER TABLE "interview_slot" ADD COLUMN     "booked_count" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "created_by" BIGINT,
ADD COLUMN     "location" VARCHAR(500),
ADD COLUMN     "meeting_link" VARCHAR(500),
ADD COLUMN     "mode" "InterviewMode";

-- AlterTable
ALTER TABLE "slot_booking" ADD COLUMN     "active_key" VARCHAR(64),
ADD COLUMN     "cancel_reason" VARCHAR(500),
ADD COLUMN     "cancelled_at" BIGINT,
ADD COLUMN     "cancelled_by" BIGINT,
ADD COLUMN     "ics_sequence" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "pipeline_step_id" BIGINT,
ADD COLUMN     "reminded_day_at" BIGINT,
ADD COLUMN     "reminded_hour_at" BIGINT;

-- AlterTable
ALTER TABLE "organization_settings" ADD COLUMN     "timezone" VARCHAR(64) NOT NULL DEFAULT 'Asia/Karachi';

-- CreateTable
CREATE TABLE "step_interviewer" (
    "id" BIGSERIAL NOT NULL,
    "step_id" BIGINT NOT NULL,
    "interviewer_id" BIGINT NOT NULL,
    "created_at" BIGINT NOT NULL,

    CONSTRAINT "step_interviewer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "slot_interviewer" (
    "id" BIGSERIAL NOT NULL,
    "slot_id" BIGINT NOT NULL,
    "interviewer_id" BIGINT NOT NULL,

    CONSTRAINT "slot_interviewer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "interviewer_availability" (
    "id" BIGSERIAL NOT NULL,
    "interviewer_id" BIGINT NOT NULL,
    "day_of_week" INTEGER,
    "date" DATE,
    "start_minute" INTEGER NOT NULL,
    "end_minute" INTEGER NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" BIGINT NOT NULL,

    CONSTRAINT "interviewer_availability_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "interviewer_time_off" (
    "id" BIGSERIAL NOT NULL,
    "interviewer_id" BIGINT NOT NULL,
    "starts_at" TIMESTAMP(3) NOT NULL,
    "ends_at" TIMESTAMP(3) NOT NULL,
    "reason" VARCHAR(255),
    "created_at" BIGINT NOT NULL,

    CONSTRAINT "interviewer_time_off_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "step_interviewer_interviewer_id_idx" ON "step_interviewer"("interviewer_id");

-- CreateIndex
CREATE UNIQUE INDEX "step_interviewer_step_id_interviewer_id_key" ON "step_interviewer"("step_id", "interviewer_id");

-- CreateIndex
CREATE INDEX "slot_interviewer_interviewer_id_idx" ON "slot_interviewer"("interviewer_id");

-- CreateIndex
CREATE UNIQUE INDEX "slot_interviewer_slot_id_interviewer_id_key" ON "slot_interviewer"("slot_id", "interviewer_id");

-- CreateIndex
CREATE INDEX "interviewer_availability_interviewer_id_idx" ON "interviewer_availability"("interviewer_id");

-- CreateIndex
CREATE INDEX "interviewer_time_off_interviewer_id_starts_at_idx" ON "interviewer_time_off"("interviewer_id", "starts_at");

-- CreateIndex
CREATE INDEX "interview_slot_step_id_startsAt_idx" ON "interview_slot"("step_id", "startsAt");

-- CreateIndex
CREATE UNIQUE INDEX "slot_booking_active_key_key" ON "slot_booking"("active_key");

-- CreateIndex
CREATE INDEX "slot_booking_candidate_id_idx" ON "slot_booking"("candidate_id");

-- CreateIndex
CREATE INDEX "slot_booking_pipeline_step_id_idx" ON "slot_booking"("pipeline_step_id");

-- CreateIndex
CREATE INDEX "slot_booking_status_idx" ON "slot_booking"("status");

-- AddForeignKey
ALTER TABLE "step_interviewer" ADD CONSTRAINT "step_interviewer_step_id_fkey" FOREIGN KEY ("step_id") REFERENCES "workflow_step"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "step_interviewer" ADD CONSTRAINT "step_interviewer_interviewer_id_fkey" FOREIGN KEY ("interviewer_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "slot_interviewer" ADD CONSTRAINT "slot_interviewer_slot_id_fkey" FOREIGN KEY ("slot_id") REFERENCES "interview_slot"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "slot_interviewer" ADD CONSTRAINT "slot_interviewer_interviewer_id_fkey" FOREIGN KEY ("interviewer_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "interviewer_availability" ADD CONSTRAINT "interviewer_availability_interviewer_id_fkey" FOREIGN KEY ("interviewer_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "interviewer_time_off" ADD CONSTRAINT "interviewer_time_off_interviewer_id_fkey" FOREIGN KEY ("interviewer_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "slot_booking" ADD CONSTRAINT "slot_booking_pipeline_step_id_fkey" FOREIGN KEY ("pipeline_step_id") REFERENCES "candidate_pipeline_step"("id") ON DELETE SET NULL ON UPDATE CASCADE;


-- ============================================================
-- Backfills for pre-existing rows
-- ============================================================

-- Typed step config from legacy step_metadata JSON
UPDATE "workflow_step"
SET "duration_mins" = CASE
      WHEN "step_metadata"->>'durationMins' ~ '^[0-9]{1,4}$' THEN ("step_metadata"->>'durationMins')::int
      ELSE NULL END,
    "interview_mode" = CASE upper("step_metadata"->>'interviewMode')
      WHEN 'REMOTE' THEN 'REMOTE'::"InterviewMode"
      WHEN 'ONSITE' THEN 'ONSITE'::"InterviewMode"
      ELSE NULL END
WHERE "step_metadata" IS NOT NULL;

-- Optional steps are skippable
UPDATE "workflow_step" SET "is_skippable" = NOT "is_required";

-- Slot counters + active-booking keys for existing bookings
UPDATE "interview_slot" s
SET "booked_count" = (
  SELECT COUNT(*) FROM "slot_booking" b WHERE b."slot_id" = s."id" AND b."status" = 'RESERVED'
);

-- keep one key per (step, candidate) so the UNIQUE index cannot be violated by legacy duplicates
UPDATE "slot_booking" b
SET "active_key" = d."k"
FROM (
  SELECT DISTINCT ON (s."step_id", sb."candidate_id")
         sb."id" AS "id", s."step_id"::text || ':' || sb."candidate_id"::text AS "k"
  FROM "slot_booking" sb
  JOIN "interview_slot" s ON s."id" = sb."slot_id"
  WHERE sb."status" = 'RESERVED'
  ORDER BY s."step_id", sb."candidate_id", sb."id"
) d
WHERE b."id" = d."id";

UPDATE "slot_booking" b
SET "pipeline_step_id" = cps."id"
FROM "interview_slot" s, "candidate_pipeline" cp, "candidate_pipeline_step" cps
WHERE s."id" = b."slot_id"
  AND cp."application_id" = b."application_id"
  AND cps."pipeline_id" = cp."id"
  AND cps."workflow_step_id" = s."step_id";
