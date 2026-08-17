import assert from "node:assert/strict"
import { describe, it } from "node:test"
import { combineShortlistScore } from "./scoring"
import { DeterministicMatch } from "./deterministic"
import { ShortlistEvaluation } from "@/lib/ai/shortlist-evaluator"

const mockBaseDeterministic: DeterministicMatch = {
  matchedRequiredSkills: ["REACT", "TYPESCRIPT"],
  missingRequiredSkills: [],
  matchedPreferredSkills: ["NEXT.JS"],
  missingPreferredSkills: [],
  requiredSkillCoverage: 1.0,
  preferredSkillCoverage: 1.0,
  assessmentAggregate: {
    averagePercentage: 85,
    assessedSkillCount: 2,
    totalRelevantSkillCount: 3,
  },
}

const mockBaseAiEvaluation: ShortlistEvaluation = {
  skillsScore: 90,
  educationScore: 85,
  experienceScore: 85,
  successCriteriaScore: 80,
  confidence: 90,
  educationSatisfied: true,
  mandatoryChecklist: [
    { requirement: "Required Skills", priority: "REQUIRED", met: true, note: "All met" },
    { requirement: "Bachelor's Degree", priority: "REQUIRED", met: true, note: "Met" },
  ],
  matchedRequirements: ["REACT", "TYPESCRIPT", "NEXT.JS", "Bachelor's Degree"],
  missingRequirements: [],
  strengths: ["Strong technical stack", "Relevant experience"],
  concerns: [],
  reasoning: "Candidate meets all criteria exceptionally well.",
}

describe("combineShortlistScore", () => {
  it("recommends SHORTLIST for strong candidates with high scores and high confidence", () => {
    const result = combineShortlistScore(mockBaseDeterministic, mockBaseAiEvaluation)
    assert.equal(result.recommendation, "SHORTLIST")
    assert.equal(result.mandatoryRequirementsMet, true)
    assert.ok(result.overallScore >= 75)
  })

  it("recommends REJECT for weak candidates", () => {
    const weakAi: ShortlistEvaluation = {
      ...mockBaseAiEvaluation,
      skillsScore: 30,
      educationScore: 20,
      experienceScore: 30,
      successCriteriaScore: 20,
      confidence: 80,
    }
    const weakDeterministic: DeterministicMatch = {
      ...mockBaseDeterministic,
      requiredSkillCoverage: 0.2,
      preferredSkillCoverage: 0,
      assessmentAggregate: { averagePercentage: 30, assessedSkillCount: 1, totalRelevantSkillCount: 3 },
    }
    const result = combineShortlistScore(weakDeterministic, weakAi)
    assert.equal(result.recommendation, "REJECT")
  })

  it("recommends REJECT when a REQUIRED skill is missing regardless of overall numeric score", () => {
    const missingReqDeterministic: DeterministicMatch = {
      ...mockBaseDeterministic,
      matchedRequiredSkills: ["REACT"],
      missingRequiredSkills: ["TYPESCRIPT"],
      requiredSkillCoverage: 0.5,
    }
    const result = combineShortlistScore(missingReqDeterministic, mockBaseAiEvaluation)
    assert.equal(result.mandatoryRequirementsMet, false)
    assert.equal(result.recommendation, "REJECT")
  })

  it("allows PREFERRED skill missing without failing mandatory requirements", () => {
    const missingPrefDeterministic: DeterministicMatch = {
      ...mockBaseDeterministic,
      matchedPreferredSkills: [],
      missingPreferredSkills: ["NEXT.JS"],
      preferredSkillCoverage: 0,
    }
    const result = combineShortlistScore(missingPrefDeterministic, mockBaseAiEvaluation)
    assert.equal(result.mandatoryRequirementsMet, true)
    assert.ok(result.recommendation === "SHORTLIST" || result.recommendation === "MAYBE")
  })

  it("downgrades recommendation to MAYBE when AI confidence is below minConfidenceForShortlist", () => {
    const lowConfAi: ShortlistEvaluation = {
      ...mockBaseAiEvaluation,
      confidence: 50, // Below minConfidenceForShortlist threshold (60)
    }
    const result = combineShortlistScore(mockBaseDeterministic, lowConfAi)
    assert.equal(result.recommendation, "MAYBE")
  })

  it("redistributes assessment weight when zero assessments are completed without NaN", () => {
    const unassessedDeterministic: DeterministicMatch = {
      ...mockBaseDeterministic,
      assessmentAggregate: {
        averagePercentage: null,
        assessedSkillCount: 0,
        totalRelevantSkillCount: 3,
      },
    }
    const result = combineShortlistScore(unassessedDeterministic, mockBaseAiEvaluation)
    assert.equal(result.assessmentScore, null)
    assert.ok(!isNaN(result.overallScore))
    assert.equal(result.recommendation, "SHORTLIST")
  })
})
