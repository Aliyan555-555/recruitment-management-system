import assert from "node:assert/strict"
import { describe, it } from "node:test"
import {
  calculateScorePercentage,
  hasPassedAssessment,
  mapScoreToLevel,
  scoreAnswers,
} from "./scoring"

const thresholds = {
  beginner: 0,
  intermediate: 40,
  professional: 70,
  expert: 90,
}

describe("scoreAnswers", () => {
  it("awards full points for correct answers only", () => {
    const result = scoreAnswers([
      {
        questionId: BigInt(1),
        selectedOption: "A",
        correctOption: "A",
        points: 10,
      },
      {
        questionId: BigInt(2),
        selectedOption: "B",
        correctOption: "C",
        points: 10,
      },
    ])

    assert.equal(result.scoredPoints, 10)
    assert.equal(result.totalPoints, 20)
    assert.equal(result.results[0].isCorrect, true)
    assert.equal(result.results[1].isCorrect, false)
  })
})

describe("mapScoreToLevel", () => {
  it("maps percentage to verified skill levels", () => {
    assert.equal(mapScoreToLevel(95, 100, thresholds), "EXPERT")
    assert.equal(mapScoreToLevel(75, 100, thresholds), "PROFESSIONAL")
    assert.equal(mapScoreToLevel(50, 100, thresholds), "INTERMEDIATE")
    assert.equal(mapScoreToLevel(10, 100, thresholds), "BEGINNER")
  })

  it("returns beginner when max points is zero", () => {
    assert.equal(mapScoreToLevel(0, 0, thresholds), "BEGINNER")
  })
})

describe("hasPassedAssessment", () => {
  it("checks minimum pass threshold", () => {
    assert.equal(hasPassedAssessment(60, 60), true)
    assert.equal(hasPassedAssessment(59, 60), false)
  })
})

describe("calculateScorePercentage", () => {
  it("rounds scored points to percentage", () => {
    assert.equal(calculateScorePercentage(75, 100), 75)
    assert.equal(calculateScorePercentage(33, 100), 33)
    assert.equal(calculateScorePercentage(1, 3), 33)
  })

  it("returns null for missing or invalid inputs", () => {
    assert.equal(calculateScorePercentage(null, 100), null)
    assert.equal(calculateScorePercentage(50, null), null)
    assert.equal(calculateScorePercentage(50, 0), null)
  })
})
