-- Education levels get an order so "minimum education" can be compared
ALTER TABLE "user_education_level" ADD COLUMN "rank" INTEGER NOT NULL DEFAULT 0;

-- New lower levels (skipped if a same-named level already exists)
INSERT INTO "user_education_level" ("name", "rank")
SELECT v.name, v.rank FROM (VALUES
  ('No formal education', 0),
  ('Matric / Secondary (SSC)', 10),
  ('Intermediate / College (HSSC)', 20)
) AS v(name, rank)
WHERE NOT EXISTS (SELECT 1 FROM "user_education_level" l WHERE lower(l.name) = lower(v.name));

-- Ranks for the existing levels
UPDATE "user_education_level" SET "rank" = 25 WHERE lower("name") = 'high school diploma';
UPDATE "user_education_level" SET "rank" = 30 WHERE lower("name") = 'associate degree';
UPDATE "user_education_level" SET "rank" = 40 WHERE lower("name") LIKE 'bachelor%';
UPDATE "user_education_level" SET "rank" = 50 WHERE lower("name") LIKE 'master%';
UPDATE "user_education_level" SET "rank" = 60 WHERE lower("name") LIKE 'doctorate%' OR lower("name") LIKE 'phd%';
