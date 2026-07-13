-- Add weekly cycle reset configuration
ALTER TABLE "skill_assessment_config"
ADD COLUMN "cycle_reset_days" INTEGER NOT NULL DEFAULT 7;

-- Default all unverified skills to Beginner
UPDATE "user_skills"
SET "verified_level" = 'BEGINNER'
WHERE "verified_level" IS NULL;
