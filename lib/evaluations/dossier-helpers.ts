import { SCREENING_SKILLS } from "@/lib/constants/screening-skills"
import { getCanonicalSkill } from "@/lib/skills"
import { isRecommended, scoreFormData } from "./scoring"

/** Pure helpers for the candidate dossier shown to interviewers. No Prisma, unit-tested. */

export interface ScreeningCriterion {
  key: string
  label: string
  rating: number | null
  max: number
}

export function screeningCriteria(formData: any): ScreeningCriterion[] {
  const skills = formData?.skills ?? {}
  return SCREENING_SKILLS.map((s) => {
    const raw = skills[s.key]?.rating
    const rating = raw === undefined || raw === null || raw === "" ? null : Number(raw)
    return { key: s.key, label: s.label, rating: Number.isFinite(rating) ? rating : null, max: Number(skills[s.key]?.max ?? s.max) }
  })
}

export function summarizeScreeningForm(formData: any) {
  const scored = scoreFormData(formData)
  const rec = formData?.recommendedToHire
  return {
    criteria: screeningCriteria(formData),
    total: scored?.total ?? null,
    max: scored?.max ?? null,
    percentage: scored?.percentage ?? null,
    recommendation: rec === undefined || rec === null || rec === "" ? null : isRecommended(rec) ? ("HIRE" as const) : ("NO_HIRE" as const),
    comments: typeof formData?.comments === "string" && formData.comments.trim() ? formData.comments.trim() : null,
  }
}

export interface JobSkillMatch {
  skillName: string
  priority: "REQUIRED" | "PREFERRED"
  matched: boolean
  level: number | null
  verifiedLevel: string | null
  assessmentPercent: number | null
}

const skillKey = (name: string) => getCanonicalSkill(name).toUpperCase() || name.trim().toUpperCase()

export function matchJobSkills(
  jobSkills: Array<{ skillName: string; priority: "REQUIRED" | "PREFERRED" }>,
  candidateSkills: Array<{ skillName: string; level: number; verifiedLevel: string | null; assessmentPercent?: number | null }>
): { skills: JobSkillMatch[]; matchedCount: number; total: number; percentage: number } {
  const byKey = new Map(candidateSkills.map((s) => [skillKey(s.skillName), s]))
  const skills = jobSkills.map((js) => {
    const own = byKey.get(skillKey(js.skillName))
    return {
      skillName: js.skillName,
      priority: js.priority,
      matched: !!own,
      level: own?.level ?? null,
      verifiedLevel: own?.verifiedLevel ?? null,
      assessmentPercent: own?.assessmentPercent ?? null,
    }
  })
  const matchedCount = skills.filter((s) => s.matched).length
  return { skills, matchedCount, total: skills.length, percentage: skills.length ? Math.round((matchedCount / skills.length) * 100) : 0 }
}

export interface QuickTestRow {
  order: number
  question: string
  options: string[]
  correctOption: string
  selectedOption: string | null
  isCorrect: boolean
  points: number
  pointsAwarded: number
}

export function buildQuickTestRows(
  questions: Array<{ id: bigint; question: string; options: unknown; correctOption: string; points: number; order: number }>,
  answers: Array<{ questionId: bigint; selectedOption: string; isCorrect: boolean; pointsAwarded: number }>
): QuickTestRow[] {
  const byQuestion = new Map(answers.map((a) => [a.questionId.toString(), a]))
  return [...questions]
    .sort((a, b) => a.order - b.order)
    .map((q) => {
      const a = byQuestion.get(q.id.toString())
      return {
        order: q.order,
        question: q.question,
        options: Array.isArray(q.options) ? q.options.map(String) : [],
        correctOption: q.correctOption,
        selectedOption: a?.selectedOption ?? null,
        isCorrect: a?.isCorrect ?? false,
        points: q.points,
        pointsAwarded: a?.pointsAwarded ?? 0,
      }
    })
}
