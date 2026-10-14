-- AlterEnum
ALTER TYPE "AiCandidateResultStatus" ADD VALUE 'ATS_ONLY';

-- AlterTable
ALTER TABLE "ai_shortlist_run" ADD COLUMN     "ai_candidate_limit" INTEGER,
ADD COLUMN     "ai_request_count" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "ai_candidate_shortlist_result" ADD COLUMN     "ats_breakdown" JSONB,
ADD COLUMN     "ats_score" INTEGER;
