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

describe("combineShortlistScore with quick test", () => {
  const noAssessment: DeterministicMatch = {
    ...mockBaseDeterministic,
    assessmentAggregate: { averagePercentage: null, assessedSkillCount: 0, totalRelevantSkillCount: 3 },
  }
  const fullConfidenceAi: ShortlistEvaluation = { ...mockBaseAiEvaluation, confidence: 100 }

  it("is unchanged when the candidate has no quick test score", () => {
    const withoutField = combineShortlistScore(mockBaseDeterministic, fullConfidenceAi)
    const withNull = combineShortlistScore(
      { ...mockBaseDeterministic, quickTestScore: null },
      fullConfidenceAi
    )
    // Original six-weight formula: 0.30 req + 0.10 pref + 0.20 assess + 0.15 edu + 0.15 exp + 0.10 succ
    const expected = Math.round(100 * 0.3 + 100 * 0.1 + 85 * 0.2 + 85 * 0.15 + 85 * 0.15 + 80 * 0.1)
    assert.equal(withoutField.overallScore, expected)
    assert.equal(withNull.overallScore, expected)
    assert.equal(withoutField.quickTestScore, null)
  })

  it("gives the quick test exactly 15% and scales the other components by 85%", () => {
    const high = combineShortlistScore({ ...mockBaseDeterministic, quickTestScore: 100 }, fullConfidenceAi)
    const low = combineShortlistScore({ ...mockBaseDeterministic, quickTestScore: 0 }, fullConfidenceAi)
    const baseline = combineShortlistScore(mockBaseDeterministic, fullConfidenceAi)

    assert.equal(high.quickTestScore, 100)
    assert.equal(low.quickTestScore, 0)
    // swing between a perfect and a zero quick test is the 15% weight
    assert.ok(Math.abs(high.overallScore - low.overallScore - 15) <= 1)
    assert.ok(low.overallScore < baseline.overallScore)
    assert.ok(high.overallScore > baseline.overallScore)
  })

  it("keeps the quick test at 15% when assessments are also missing", () => {
    const high = combineShortlistScore({ ...noAssessment, quickTestScore: 100 }, fullConfidenceAi)
    const low = combineShortlistScore({ ...noAssessment, quickTestScore: 0 }, fullConfidenceAi)
    assert.ok(Math.abs(high.overallScore - low.overallScore - 15) <= 1)
    assert.ok(!isNaN(high.overallScore))
  })

  it("keeps the 100-point ceiling when every component is perfect", () => {
    const maxAi: ShortlistEvaluation = {
      ...mockBaseAiEvaluation,
      skillsScore: 100,
      educationScore: 100,
      experienceScore: 100,
      successCriteriaScore: 100,
      confidence: 100,
    }
    const maxDeterministic: DeterministicMatch = {
      ...mockBaseDeterministic,
      assessmentAggregate: { averagePercentage: 100, assessedSkillCount: 1, totalRelevantSkillCount: 1 },
      quickTestScore: 100,
    }
    assert.equal(combineShortlistScore(maxDeterministic, maxAi).overallScore, 100)
  })

  it("a weak quick test can pull a borderline candidate below the shortlist threshold", () => {
    const borderlineAi: ShortlistEvaluation = {
      ...mockBaseAiEvaluation,
      skillsScore: 55,
      educationScore: 55,
      experienceScore: 55,
      successCriteriaScore: 55,
      confidence: 100,
    }
    const borderline: DeterministicMatch = {
      ...mockBaseDeterministic,
      requiredSkillCoverage: 0.55,
      preferredSkillCoverage: 0.55,
      assessmentAggregate: { averagePercentage: 55, assessedSkillCount: 2, totalRelevantSkillCount: 3 },
    }
    const without = combineShortlistScore(borderline, borderlineAi)
    const withWeakTest = combineShortlistScore({ ...borderline, quickTestScore: 10 }, borderlineAi)
    assert.equal(without.overallScore, 55)
    assert.ok(withWeakTest.overallScore < without.overallScore)
  })
})
