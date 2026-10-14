import { prisma } from "../lib/prisma"

/**
 * Clean Operational Data Script
 * 
 * KEEPS:
 * - Jobs & their setups (job_workflow, workflow_step, job_skills, job_locations, job_education_requirements, job_quick_test)
 * - Users (Admin, Interviewer, Candidate) and all their profile data (education, skills, experience, profile details, preferences)
 * - Server / Organization configurations (institute, user_education_level, organization_settings, ai_settings, skill_assessment_config)
 * 
 * CLEANS:
 * - Applications (jobs_applied, jobs_bookmark)
 * - Pipelines & Steps (candidate_pipeline, candidate_pipeline_step)
 * - Interviews & Stage evaluations (interview, stage_evaluation)
 * - Bookings & Slots (slot_booking, slot_interviewer, interview_slot)
 * - Batches (batch, batch_candidate, batch_candidate_evaluation)
 * - Offer Letters & LOIs (offer_letter, letter_of_intent)
 * - AI shortlisting data (ai_candidate_shortlist_result, ai_shortlist_run)
 * - Test attempts (quick_test_answer, quick_test_question, quick_test_attempt, assessment_answer, assessment_question, skill_assessment)
 * - Operational logs & alerts (notification, audit_log, password_reset_token)
 */

export async function cleanOperationalData(dryRun = false) {
  console.log(`Starting operational data cleanup (dryRun = ${dryRun})...\n`)

  const tablesToClean = [
    { name: "offer_letter", count: await prisma.offerLetter.count(), action: () => prisma.offerLetter.deleteMany() },
    { name: "letter_of_intent", count: await prisma.letterOfIntent.count(), action: () => prisma.letterOfIntent.deleteMany() },
    { name: "stage_evaluation", count: await prisma.stageEvaluation.count(), action: () => prisma.stageEvaluation.deleteMany() },
    { name: "interview", count: await prisma.interview.count(), action: () => prisma.interview.deleteMany() },
    { name: "slot_booking", count: await prisma.slotBooking.count(), action: () => prisma.slotBooking.deleteMany() },
    { name: "slot_interviewer", count: await prisma.slotInterviewer.count(), action: () => prisma.slotInterviewer.deleteMany() },
    { name: "interview_slot", count: await prisma.interviewSlot.count(), action: () => prisma.interviewSlot.deleteMany() },
    { name: "batch_candidate_evaluation", count: await prisma.batchCandidateEvaluation.count(), action: () => prisma.batchCandidateEvaluation.deleteMany() },
    { name: "batch_candidate", count: await prisma.batchCandidate.count(), action: () => prisma.batchCandidate.deleteMany() },
    { name: "batch", count: await prisma.batch.count(), action: () => prisma.batch.deleteMany() },
    { name: "candidate_pipeline_step", count: await prisma.candidatePipelineStep.count(), action: () => prisma.candidatePipelineStep.deleteMany() },
    { name: "candidate_pipeline", count: await prisma.candidatePipeline.count(), action: () => prisma.candidatePipeline.deleteMany() },
    { name: "jobs_applied", count: await prisma.jobsApplied.count(), action: () => prisma.jobsApplied.deleteMany() },
    { name: "jobs_bookmark", count: await prisma.jobsBookmark.count(), action: () => prisma.jobsBookmark.deleteMany() },
    { name: "ai_candidate_shortlist_result", count: await prisma.aiCandidateShortlistResult.count(), action: () => prisma.aiCandidateShortlistResult.deleteMany() },
    { name: "ai_shortlist_run", count: await prisma.aiShortlistRun.count(), action: () => prisma.aiShortlistRun.deleteMany() },
    { name: "quick_test_answer", count: await prisma.quickTestAnswer.count(), action: () => prisma.quickTestAnswer.deleteMany() },
    { name: "quick_test_question", count: await prisma.quickTestQuestion.count(), action: () => prisma.quickTestQuestion.deleteMany() },
    { name: "quick_test_attempt", count: await prisma.quickTestAttempt.count(), action: () => prisma.quickTestAttempt.deleteMany() },
    { name: "assessment_answer", count: await prisma.assessmentAnswer.count(), action: () => prisma.assessmentAnswer.deleteMany() },
    { name: "assessment_question", count: await prisma.assessmentQuestion.count(), action: () => prisma.assessmentQuestion.deleteMany() },
    { name: "skill_assessment", count: await prisma.skillAssessment.count(), action: () => prisma.skillAssessment.deleteMany() },
    { name: "audit_log", count: await prisma.auditLog.count(), action: () => prisma.auditLog.deleteMany() },
    { name: "notification", count: await prisma.notification.count(), action: () => prisma.notification.deleteMany() },
    { name: "password_reset_token", count: await prisma.passwordResetToken.count(), action: () => prisma.passwordResetToken.deleteMany() },
  ]

  console.log("Current record counts in operational tables:")
  for (const t of tablesToClean) {
    console.log(` - ${t.name}: ${t.count}`)
  }

  if (dryRun) {
    console.log("\n[Dry Run] No data was deleted.")
    return
  }

  console.log("\nExecuting cleanup for populated operational tables...")
  for (const t of tablesToClean) {
    if (t.count > 0) {
      console.log(`Cleaning ${t.name} (${t.count} records)...`)
      await t.action()
    }
  }

  console.log("\nOperational data cleanup completed successfully.")
}

if (require.main === module) {
  const isDryRun = process.argv.includes("--dry-run")
  cleanOperationalData(isDryRun)
    .catch((err) => {
      console.error("Cleanup failed:", err)
      process.exit(1)
    })
    .finally(() => prisma.$disconnect())
}
