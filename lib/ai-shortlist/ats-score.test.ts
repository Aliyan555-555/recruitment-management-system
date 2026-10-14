import test from "node:test"
import assert from "node:assert/strict"
import { compareAts, computeAtsScore, selectForAi, titleRelevance, AtsCandidateInput, AtsJobInput } from "./ats-score"
import { DeterministicMatch } from "./deterministic"

const job: AtsJobInput = {
  title: "Frontend Developer",
  requiredSkills: ["React", "TypeScript"],
  minExperienceYears: 2,
  minEducationRank: 40,
  educationFields: ["Computer Science"],
}

const match = (over: Partial<DeterministicMatch> = {}): DeterministicMatch => ({
  matchedRequiredSkills: ["React", "TypeScript"],
  missingRequiredSkills: [],
  matchedPreferredSkills: [],
  missingPreferredSkills: [],
  requiredSkillCoverage: 1,
  preferredSkillCoverage: 1,
  assessmentAggregate: { averagePercentage: null, assessedSkillCount: 0, totalRelevantSkillCount: 2 },
  quickTestScore: null,
  ...over,
})

const strong: AtsCandidateInput = {
  experienceYears: 3,
  experienceTitles: ["Frontend Developer at Acme"],
  highestEducationRank: 40,
  majors: ["Computer Science"],
  skillCount: 6,
  educationCount: 1,
  hasBio: true,
  hasCertifications: true,
}

const weak: AtsCandidateInput = {
  experienceYears: 0,
  experienceTitles: [],
  highestEducationRank: 20,
  majors: ["Commerce"],
  skillCount: 1,
  educationCount: 1,
  hasBio: false,
  hasCertifications: false,
}

test("strong profile scores high, weak profile scores low", () => {
  const s = computeAtsScore(match(), job, strong)
  const w = computeAtsScore(
    match({ matchedRequiredSkills: [], missingRequiredSkills: ["React", "TypeScript"], requiredSkillCoverage: 0 }),
    job,
    weak
  )
  assert.ok(s.atsScore >= 90, `strong=${s.atsScore}`)
  assert.ok(w.atsScore <= 25, `weak=${w.atsScore}`)
  assert.equal(s.breakdown.requiredSkills, 100)
  assert.equal(w.breakdown.requiredSkills, 0)
})

test("components without data are dropped, not counted as zero", () => {
  const r = computeAtsScore(match(), job, strong)
  assert.equal(r.breakdown.assessment, null)
  assert.equal(r.breakdown.quickTest, null)
  assert.equal(r.breakdown.preferredSkills, null) // job lists no preferred skills
  const withTests = computeAtsScore(
    match({ assessmentAggregate: { averagePercentage: 100, assessedSkillCount: 2, totalRelevantSkillCount: 2 }, quickTestScore: 100 }),
    job,
    strong
  )
  assert.ok(withTests.atsScore >= r.atsScore)
})

test("a low quick test pulls the score down", () => {
  const base = computeAtsScore(match(), job, strong)
  const low = computeAtsScore(match({ quickTestScore: 10 }), job, strong)
  assert.ok(low.atsScore < base.atsScore)
})

test("experience below the job minimum is scaled", () => {
  const half = computeAtsScore(match(), job, { ...strong, experienceYears: 1 })
  const full = computeAtsScore(match(), job, strong)
  assert.ok(half.breakdown.experience! < full.breakdown.experience!)
})

test("titleRelevance matches job title words", () => {
  assert.ok(titleRelevance(job, ["Senior Frontend Engineer"]) >= 0.6)
  assert.equal(titleRelevance(job, ["Accountant"]), 0)
  assert.equal(titleRelevance(job, []), 0)
})

test("selectForAi keeps the best topK above the minimum", () => {
  const rows = [10, 80, 55, 90, 39, 70].map((atsScore, i) => ({
    id: i,
    ats: { atsScore, breakdown: computeAtsScore(match(), job, strong).breakdown },
  }))
  assert.deepEqual(selectForAi(rows, 3, 40).map((r) => r.ats.atsScore), [90, 80, 70])
  assert.deepEqual(selectForAi(rows, 10, 40).map((r) => r.ats.atsScore), [90, 80, 70, 55])
})

test("compareAts breaks ties on required skill coverage", () => {
  const a = computeAtsScore(match(), job, strong)
  const b = { ...a, breakdown: { ...a.breakdown, requiredSkills: 50 } }
  assert.ok(compareAts(a, b) < 0)
})
