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

  it("recommends SHORTLIST for candidates scoring 50% or above", () => {
    const avgScoreAi: ShortlistEvaluation = {
      ...mockBaseAiEvaluation,
      skillsScore: 60,
      educationScore: 60,
      experienceScore: 55,
      successCriteriaScore: 50,
      confidence: 80,
    }
    const avgDeterministic: DeterministicMatch = {
      ...mockBaseDeterministic,
      requiredSkillCoverage: 0.6,
      preferredSkillCoverage: 0.5,
      assessmentAggregate: { averagePercentage: 60, assessedSkillCount: 1, totalRelevantSkillCount: 3 },
    }
    const result = combineShortlistScore(avgDeterministic, avgScoreAi)
    assert.equal(result.recommendation, "SHORTLIST")
    assert.ok(result.overallScore >= 50)
  })

  it("recommends MAYBE for candidates scoring between 35% and 49%", () => {
    const maybeAi: ShortlistEvaluation = {
      ...mockBaseAiEvaluation,
      skillsScore: 40,
      educationScore: 45,
      experienceScore: 40,
      successCriteriaScore: 35,
      confidence: 90,
    }
    const maybeDeterministic: DeterministicMatch = {
      ...mockBaseDeterministic,
      requiredSkillCoverage: 0.4,
      preferredSkillCoverage: 0.2,
      assessmentAggregate: { averagePercentage: 40, assessedSkillCount: 1, totalRelevantSkillCount: 3 },
    }
    const result = combineShortlistScore(maybeDeterministic, maybeAi)
    assert.equal(result.recommendation, "MAYBE")
    assert.ok(result.overallScore >= 35 && result.overallScore < 50)
  })

  it("recommends REJECT when education requirement is explicitly unsatisfied", () => {
    const failedEduAi: ShortlistEvaluation = {
      ...mockBaseAiEvaluation,
      educationSatisfied: false,
    }
    const result = combineShortlistScore(mockBaseDeterministic, failedEduAi)
    assert.equal(result.mandatoryRequirementsMet, false)
    assert.equal(result.recommendation, "REJECT")
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

  it("calculates positive blended skill score when AI verifies candidate skill from background", () => {
    const zeroExplicitDeterministic: DeterministicMatch = {
      ...mockBaseDeterministic,
      requiredSkillCoverage: 0,
      matchedRequiredSkills: [],
      missingRequiredSkills: ["REACT", "TYPESCRIPT"],
    }
    const positiveAi: ShortlistEvaluation = {
      ...mockBaseAiEvaluation,
      skillsScore: 80,
    }
    const result = combineShortlistScore(zeroExplicitDeterministic, positiveAi)
    assert.ok(result.skillsScore > 50, `Expected skillsScore > 50, got ${result.skillsScore}`)
  })

  it("does not recommend SHORTLIST when confidence is below minConfidenceForShortlist even with a high score", () => {
    const lowConfidenceAi: ShortlistEvaluation = {
      ...mockBaseAiEvaluation,
      confidence: 30,
    }
    const result = combineShortlistScore(mockBaseDeterministic, lowConfidenceAi)
    assert.ok(result.overallScore >= 50, `Expected overallScore >= 50, got ${result.overallScore}`)
    assert.notEqual(result.recommendation, "SHORTLIST")
    assert.equal(result.recommendation, "MAYBE")
  })

  it("applies the confidence-dampening multiplier floor of 0.5 and ceiling of 1.0", () => {
    const maxDeterministic: DeterministicMatch = {
      ...mockBaseDeterministic,
      requiredSkillCoverage: 1.0,
      preferredSkillCoverage: 1.0,
      missingRequiredSkills: [],
      assessmentAggregate: { averagePercentage: 100, assessedSkillCount: 1, totalRelevantSkillCount: 1 },
    }
    const maxAi: ShortlistEvaluation = {
      ...mockBaseAiEvaluation,
      skillsScore: 100,
      educationScore: 100,
      experienceScore: 100,
      successCriteriaScore: 100,
    }

    const zeroConfidenceResult = combineShortlistScore(maxDeterministic, { ...maxAi, confidence: 0 })
    assert.equal(zeroConfidenceResult.overallScore, 50)

    const fullConfidenceResult = combineShortlistScore(maxDeterministic, { ...maxAi, confidence: 100 })
    assert.equal(fullConfidenceResult.overallScore, 100)
  })
})
