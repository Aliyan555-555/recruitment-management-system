-- AlterEnum
ALTER TYPE "AiCandidateResultStatus" ADD VALUE 'FILTERED_OUT';

-- AlterTable
ALTER TABLE "ai_shortlist_run" ADD COLUMN "filters" JSONB;

-- AlterTable
ALTER TABLE "ai_candidate_shortlist_result" ADD COLUMN "filter_facts" JSONB;
