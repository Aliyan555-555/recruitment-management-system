-- Normalize existing skill names (uppercase, no whitespace)
UPDATE "user_skills"
SET "skill_name" = UPPER(REGEXP_REPLACE(TRIM("skill_name"), '\s+', '', 'g'));

UPDATE "job_skills"
SET "skill_name" = UPPER(REGEXP_REPLACE(TRIM("skill_name"), '\s+', '', 'g'));

UPDATE "skill_assessment"
SET "skill_name" = UPPER(REGEXP_REPLACE(TRIM("skill_name"), '\s+', '', 'g'));

-- Deduplicate user_skills per (user_id, skill_name), keeping the best row
DO $$
DECLARE
  group_rec RECORD;
  keeper_id BIGINT;
  dupe_id BIGINT;
  base_attempt INT;
BEGIN
  FOR group_rec IN
    SELECT "user_id", "skill_name"
    FROM "user_skills"
    GROUP BY "user_id", "skill_name"
    HAVING COUNT(*) > 1
  LOOP
    SELECT us."id"
    INTO keeper_id
    FROM "user_skills" us
    LEFT JOIN (
      SELECT "user_skill_id", COUNT(*) AS assessment_count
      FROM "skill_assessment"
      GROUP BY "user_skill_id"
    ) sa ON sa."user_skill_id" = us."id"
    WHERE us."user_id" = group_rec."user_id"
      AND us."skill_name" = group_rec."skill_name"
    ORDER BY
      (CASE WHEN us."verified_level" IS NOT NULL THEN 0 ELSE 1 END),
      COALESCE(sa.assessment_count, 0) DESC,
      us."id" DESC
    LIMIT 1;

    FOR dupe_id IN
      SELECT us."id"
      FROM "user_skills" us
      WHERE us."user_id" = group_rec."user_id"
        AND us."skill_name" = group_rec."skill_name"
        AND us."id" <> keeper_id
    LOOP
      SELECT COALESCE(MAX("attempt_number"), 0)
      INTO base_attempt
      FROM "skill_assessment"
      WHERE "user_skill_id" = keeper_id;

      UPDATE "skill_assessment" sa
      SET
        "user_skill_id" = keeper_id,
        "attempt_number" = base_attempt + ranked.row_num
      FROM (
        SELECT
          sa_inner."id",
          ROW_NUMBER() OVER (ORDER BY sa_inner."id") AS row_num
        FROM "skill_assessment" sa_inner
        WHERE sa_inner."user_skill_id" = dupe_id
      ) ranked
      WHERE sa."id" = ranked."id";

      DELETE FROM "user_skills"
      WHERE "id" = dupe_id;
    END LOOP;

    UPDATE "user_skills" keeper
    SET "last_assessment_id" = latest."id"
    FROM (
      SELECT sa."id"
      FROM "skill_assessment" sa
      WHERE sa."user_skill_id" = keeper_id
      ORDER BY sa."id" DESC
      LIMIT 1
    ) latest
    WHERE keeper."id" = keeper_id
      AND EXISTS (
        SELECT 1 FROM "skill_assessment" sa WHERE sa."user_skill_id" = keeper_id
      );
  END LOOP;
END $$;

-- Deduplicate job_skills per (job_id, skill_name)
DELETE FROM "job_skills" js
USING "job_skills" keeper
WHERE js."job_id" = keeper."job_id"
  AND js."skill_name" = keeper."skill_name"
  AND js."id" > keeper."id";

-- Enforce uniqueness at the database level
CREATE UNIQUE INDEX "user_skills_user_id_skill_name_key" ON "user_skills"("user_id", "skill_name");
CREATE UNIQUE INDEX "job_skills_job_id_skill_name_key" ON "job_skills"("job_id", "skill_name");
