import type { LevelThresholds } from "@/lib/assessments/config"
import type { VerifiedSkillLevel } from "@prisma/client"

export type ScoredAnswerInput = {
  questionId: bigint
  selectedOption: string
  correctOption: string
  points: number
}

export type ScoredAnswerResult = {
  questionId: bigint
  selectedOption: string
  isCorrect: boolean
  pointsAwarded: number
}

export function scoreAnswers(answers: ScoredAnswerInput[]): {
  scoredPoints: number
  totalPoints: number
  results: ScoredAnswerResult[]
} {
  const results = answers.map((answer) => {
    const isCorrect = answer.selectedOption === answer.correctOption
    return {
      questionId: answer.questionId,
      selectedOption: answer.selectedOption,
      isCorrect,
      pointsAwarded: isCorrect ? answer.points : 0,
    }
  })

  const scoredPoints = results.reduce((sum, result) => sum + result.pointsAwarded, 0)
  const totalPoints = answers.reduce((sum, answer) => sum + answer.points, 0)

  return { scoredPoints, totalPoints, results }
}

export function mapScoreToLevel(
  scoredPoints: number,
  maxPoints: number,
  thresholds: LevelThresholds
): VerifiedSkillLevel {
  const percentage = maxPoints > 0 ? (scoredPoints / maxPoints) * 100 : 0

  if (percentage >= thresholds.expert) {
    return "EXPERT"
  }
  if (percentage >= thresholds.professional) {
    return "PROFESSIONAL"
  }
  if (percentage >= thresholds.intermediate) {
    return "INTERMEDIATE"
  }

  return "BEGINNER"
}

export function hasPassedAssessment(scoredPoints: number, minPassPoints: number): boolean {
  return scoredPoints >= minPassPoints
}
