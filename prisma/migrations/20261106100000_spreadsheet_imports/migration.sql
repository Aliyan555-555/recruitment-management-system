-- CreateEnum
CREATE TYPE "ImportStatus" AS ENUM ('VALIDATED', 'COMMITTING', 'COMPLETED', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ImportRowStatus" AS ENUM ('READY', 'WARNING', 'ERROR', 'NO_CHANGE', 'DUPLICATE_REVIEW', 'APPLYING', 'APPLIED', 'SKIPPED', 'FAILED');

-- CreateTable
CREATE TABLE "import_batch" (
    "id" BIGSERIAL NOT NULL,
    "type" VARCHAR(40) NOT NULL,
    "job_id" BIGINT,
    "workflow_step_id" BIGINT,
    "file_name" VARCHAR(255) NOT NULL,
    "file_hash" VARCHAR(64) NOT NULL,
    "file_size" INTEGER NOT NULL,
    "status" "ImportStatus" NOT NULL DEFAULT 'VALIDATED',
    "active_key" VARCHAR(120),
    "total_rows" INTEGER NOT NULL DEFAULT 0,
    "ready_rows" INTEGER NOT NULL DEFAULT 0,
    "warning_rows" INTEGER NOT NULL DEFAULT 0,
    "error_rows" INTEGER NOT NULL DEFAULT 0,
    "no_change_rows" INTEGER NOT NULL DEFAULT 0,
    "applied_rows" INTEGER NOT NULL DEFAULT 0,
    "failed_rows" INTEGER NOT NULL DEFAULT 0,
    "options" JSONB,
    "created_by" BIGINT NOT NULL,
    "created_at" BIGINT NOT NULL,
    "updated_at" BIGINT NOT NULL,
    "committed_at" BIGINT,

CONSTRAINT "import_batch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "import_row" (
    "id" BIGSERIAL NOT NULL,
    "batch_id" BIGINT NOT NULL,
    "row_number" INTEGER NOT NULL,
    "entity_key" VARCHAR(255),
    "status" "ImportRowStatus" NOT NULL,
    "action" VARCHAR(40),
    "raw" JSONB NOT NULL,
    "normalized" JSONB,
    "issues" JSONB,
    "snapshot" JSONB,
    "resolution" JSONB,
    "result" VARCHAR(500),
    "applied_at" BIGINT,

CONSTRAINT "import_row_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "import_batch_active_key_key" ON "import_batch"("active_key");

-- CreateIndex
CREATE INDEX "import_batch_type_job_id_file_hash_idx" ON "import_batch"("type", "job_id", "file_hash");

-- CreateIndex
CREATE INDEX "import_batch_created_by_idx" ON "import_batch"("created_by");

-- CreateIndex
CREATE INDEX "import_batch_created_at_idx" ON "import_batch"("created_at");

-- CreateIndex
CREATE INDEX "import_row_batch_id_status_idx" ON "import_row"("batch_id", "status");

-- CreateIndex
CREATE INDEX "import_row_batch_id_entity_key_idx" ON "import_row"("batch_id", "entity_key");

-- CreateIndex
CREATE UNIQUE INDEX "import_row_batch_id_row_number_key" ON "import_row"("batch_id", "row_number");

-- AddForeignKey
ALTER TABLE "import_batch" ADD CONSTRAINT "import_batch_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "import_row" ADD CONSTRAINT "import_row_batch_id_fkey" FOREIGN KEY ("batch_id") REFERENCES "import_batch"("id") ON DELETE CASCADE ON UPDATE CASCADE;
