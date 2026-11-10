-- CreateIndex
CREATE UNIQUE INDEX "candidate_pipeline_step_pipeline_id_workflow_step_id_key" ON "candidate_pipeline_step"("pipeline_id", "workflow_step_id");
