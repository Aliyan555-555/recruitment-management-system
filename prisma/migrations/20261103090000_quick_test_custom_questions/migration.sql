-- AlterTable
ALTER TABLE "job_quick_test" ADD COLUMN     "use_custom_questions" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "job_quick_test_question" (
    "id" BIGSERIAL NOT NULL,
    "job_id" BIGINT NOT NULL,
    "question" TEXT NOT NULL,
    "options" JSONB NOT NULL,
    "correct_option" VARCHAR(500) NOT NULL,
    "order" INTEGER NOT NULL,
    "created_at" BIGINT NOT NULL,

    CONSTRAINT "job_quick_test_question_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "job_quick_test_question_job_id_order_key" ON "job_quick_test_question"("job_id", "order");

-- AddForeignKey
ALTER TABLE "job_quick_test_question" ADD CONSTRAINT "job_quick_test_question_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "job_quick_test"("job_id") ON DELETE CASCADE ON UPDATE CASCADE;
