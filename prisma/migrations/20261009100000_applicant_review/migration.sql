-- Shortlisting review metadata on applications
CREATE TYPE "ReviewFlag" AS ENUM ('MAYBE');

ALTER TABLE "jobs_applied" ADD COLUMN "review_flag" "ReviewFlag",
ADD COLUMN "reviewed_by" BIGINT,
ADD COLUMN "reviewed_at" BIGINT;
