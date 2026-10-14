import test from "node:test"
import assert from "node:assert/strict"
import {
  computeAge,
  computeCandidateFacts,
  evaluateFilters,
  filtersFromJob,
  parseDateOfBirth,
  parseGrade,
  parseMinExperienceYears,
  sanitizeFilters,
} from "./filters"

test("parseDateOfBirth handles common formats", () => {
  assert.equal(parseDateOfBirth("1998-12-31"), "1998-12-31")
  assert.equal(parseDateOfBirth("31/12/1998"), "1998-12-31")
  assert.equal(parseDateOfBirth("31/02/1998"), null)
  assert.equal(parseDateOfBirth(""), null)
})

test("computeAge respects birthday boundary", () => {
  assert.equal(computeAge("1996-12-31", "2026-12-30"), 29)
  assert.equal(computeAge("1996-12-31", "2026-12-31"), 30)
})

test("parseGrade variants", () => {
  assert.deepEqual(parseGrade("3.5"), { value: 3.5, scale: 4 })
  assert.deepEqual(parseGrade("3.5/4"), { value: 3.5, scale: 4 })
  assert.deepEqual(parseGrade("85%"), { value: 85, scale: 100 })
  assert.equal(parseGrade("A+"), null)
  assert.equal(parseGrade(null), null)
})

const institutes = [
  { id: "1", name: "NED University of Engineering and Technology", aliases: ["NEDUET"] },
  { id: "2", name: "University of Karachi", aliases: ["Karachi University"] },
  { id: "3", name: "Other University" },
]

test("computeCandidateFacts picks best grade and resolves institutes", () => {
  const f = computeCandidateFacts(
    {
      dateOfBirth: "1999-01-01",
      educations: [
        { grade: "3.0", institute: "NEDUET", instituteId: null },
        { grade: "3.6/4", instituteId: "3" },
      ],
    },
    institutes
  )
  assert.deepEqual(f.cgpa, { value: 3.6, scale: 4 })
  assert.deepEqual(f.instituteIds.sort(), ["1", "3"])
  const free = computeCandidateFacts({ educations: [{ institute: "Some Unknown College" }] }, institutes)
  assert.deepEqual(free.instituteIds, [])
  assert.equal(free.hasInstituteText, true)
  assert.equal(computeCandidateFacts({ educations: [] }, institutes).hasInstituteText, false)
})

const filters = {
  ageRange: { min: 20, max: 35, asOf: "2026-12-31" },
  institutes: { ids: ["1", "2"], names: ["NED", "Karachi"] },
  minCgpa: { value: 3.0, scale: 4 },
}
const ok = { dob: "2000-01-01", instituteIds: ["1"], hasInstituteText: true, cgpa: { value: 3.6, scale: 4 } }

test("evaluateFilters buckets", () => {
  assert.equal(evaluateFilters(ok, filters).bucket, "PASSED")
  assert.equal(evaluateFilters({ ...ok, cgpa: { value: 2.5, scale: 4 } }, filters).bucket, "FILTERED_OUT")
  assert.equal(evaluateFilters({ ...ok, dob: null }, filters).bucket, "NEEDS_REVIEW")
  assert.equal(evaluateFilters({ ...ok, dob: null, cgpa: { value: 2, scale: 4 } }, filters).bucket, "FILTERED_OUT")
})

test("age range checks both ends", () => {
  assert.equal(evaluateFilters({ ...ok, dob: "1980-01-01" }, filters).bucket, "FILTERED_OUT") // 46
  assert.equal(evaluateFilters({ ...ok, dob: "2010-01-01" }, filters).bucket, "FILTERED_OUT") // 16
  assert.equal(evaluateFilters({ ...ok, dob: "1991-12-31" }, filters).bucket, "PASSED") // exactly 35
  assert.equal(evaluateFilters({ ...ok, dob: "1990-12-31" }, filters).bucket, "FILTERED_OUT") // 36
})

test("institute rule: other known institute fails, unrecognized text is needs-review", () => {
  assert.equal(evaluateFilters({ ...ok, instituteIds: ["3"] }, filters).bucket, "FILTERED_OUT")
  assert.equal(evaluateFilters({ ...ok, instituteIds: [] }, filters).bucket, "NEEDS_REVIEW")
  assert.equal(evaluateFilters({ ...ok, instituteIds: ["3", "2"] }, filters).bucket, "PASSED")
})

test("removing a filter changes the bucket", () => {
  const f = { ...ok, cgpa: { value: 2.5, scale: 4 } }
  assert.equal(evaluateFilters(f, filters).bucket, "FILTERED_OUT")
  const { minCgpa: _drop, ...relaxed } = filters
  assert.equal(evaluateFilters(f, relaxed).bucket, "PASSED")
  assert.equal(evaluateFilters(f, {}).bucket, "PASSED")
})

test("filtersFromJob builds defaults", () => {
  const f = filtersFromJob({ minAge: 20, maxAge: 35, minCgpa: 3, cgpaScale: 4, allowedInstitutes: [{ id: "1", name: "NED" }] })
  assert.equal(f.ageRange?.min, 20)
  assert.equal(f.ageRange?.max, 35)
  assert.deepEqual(f.institutes, { ids: ["1"], names: ["NED"] })
  assert.deepEqual(f.minCgpa, { value: 3, scale: 4 })
  assert.deepEqual(filtersFromJob({}), {})
})

test("sanitizeFilters drops invalid input", () => {
  assert.deepEqual(sanitizeFilters({ ageRange: { min: 40, max: 20, asOf: "2026-01-01" }, minCgpa: { value: 5, scale: 4 } }), {})
  assert.deepEqual(sanitizeFilters({ institutes: { ids: ["1", "x"] } }), { institutes: { ids: ["1"] } })
})

test("minimum education level", () => {
  const f = { minEducation: { rank: 20, name: "Intermediate" } }
  const base = { dob: null, instituteIds: [], hasInstituteText: false, cgpa: null }
  assert.equal(evaluateFilters({ ...base, hasEducation: true, highestEducationRank: 40, highestEducationName: "Bachelor's" }, f).bucket, "PASSED")
  assert.equal(evaluateFilters({ ...base, hasEducation: true, highestEducationRank: 20, highestEducationName: "Intermediate" }, f).bucket, "PASSED")
  assert.equal(evaluateFilters({ ...base, hasEducation: true, highestEducationRank: 10, highestEducationName: "Matric" }, f).bucket, "FILTERED_OUT")
  assert.equal(evaluateFilters({ ...base, hasEducation: false, highestEducationRank: null }, f).bucket, "FILTERED_OUT")
  assert.equal(evaluateFilters({ ...base, hasEducation: true, highestEducationRank: null }, f).bucket, "NEEDS_REVIEW")
  // no minimum -> uneducated candidates are never excluded
  assert.equal(evaluateFilters({ ...base, hasEducation: false, highestEducationRank: null }, {}).bucket, "PASSED")
  assert.equal(evaluateFilters({ ...base, hasEducation: false }, { minEducation: { rank: 0, name: "None" } }).bucket, "PASSED")
})

test("computeCandidateFacts finds highest education level", () => {
  const facts = computeCandidateFacts({
    educations: [
      { levelRank: 10, levelName: "Matric" },
      { levelRank: 40, levelName: "Bachelor's" },
    ],
  })
  assert.equal(facts.highestEducationRank, 40)
  assert.equal(facts.highestEducationName, "Bachelor's")
  assert.equal(facts.hasEducation, true)
  assert.equal(computeCandidateFacts({ educations: [] }).hasEducation, false)
})

test("filtersFromJob includes minimum education", () => {
  assert.deepEqual(filtersFromJob({ minEducation: { name: "Matric", rank: 10 } }).minEducation, { rank: 10, name: "Matric" })
  assert.equal(filtersFromJob({ minEducation: { name: "No formal education", rank: 0 } }).minEducation, undefined)
})

test("experience years knockout", () => {
  const base = { dob: null, instituteIds: [], hasInstituteText: false, cgpa: null }
  const f = { minExperienceYears: 2 }
  assert.equal(evaluateFilters({ ...base, experienceYears: 3 }, f).bucket, "PASSED")
  assert.equal(evaluateFilters({ ...base, experienceYears: 1 }, f).bucket, "FILTERED_OUT")
  assert.equal(evaluateFilters({ ...base, experienceYears: 0 }, f).bucket, "FILTERED_OUT")
  assert.equal(evaluateFilters({ ...base, experienceYears: null }, f).bucket, "NEEDS_REVIEW")
  assert.equal(evaluateFilters(base, f).bucket, "NEEDS_REVIEW") // facts from before this filter existed
})

test("required skill coverage knockout", () => {
  const base = { dob: null, instituteIds: [], hasInstituteText: false, cgpa: null }
  const f = { minSkillCoverage: 50 }
  assert.equal(evaluateFilters({ ...base, requiredSkillCoverage: 0.5 }, f).bucket, "PASSED")
  assert.equal(evaluateFilters({ ...base, requiredSkillCoverage: 0.25 }, f).bucket, "FILTERED_OUT")
  assert.equal(evaluateFilters({ ...base, requiredSkillCoverage: null }, f).bucket, "PASSED") // job has no required skills
  assert.equal(evaluateFilters(base, f).bucket, "NEEDS_REVIEW")
})

test("computeCandidateFacts merges overlapping experience", () => {
  const facts = computeCandidateFacts({
    educations: [],
    experiences: [
      { startDate: "2020-01", endDate: "2022-01", isCurrent: false },
      { startDate: "2021-01", endDate: "2023-01", isCurrent: false }, // overlaps the first role
    ],
  })
  assert.equal(facts.experienceYears, 3)
  assert.equal(computeCandidateFacts({ educations: [], experiences: [] }).experienceYears, 0)
  assert.equal(computeCandidateFacts({ educations: [] }).experienceYears, undefined)
})

test("parseMinExperienceYears", () => {
  assert.equal(parseMinExperienceYears("2 years"), 2)
  assert.equal(parseMinExperienceYears("3+ yrs"), 3)
  assert.equal(parseMinExperienceYears("2-4 years"), 2)
  assert.equal(parseMinExperienceYears("18 months"), 1.5)
  assert.equal(parseMinExperienceYears("Fresh graduates welcome"), null)
  assert.equal(parseMinExperienceYears(null), null)
})

test("filtersFromJob adds experience and skill knockouts", () => {
  const f = filtersFromJob({ minExperienceYears: 2, requiredSkillCount: 3 })
  assert.equal(f.minExperienceYears, 2)
  assert.equal(f.minSkillCoverage, 50)
  assert.deepEqual(filtersFromJob({ minExperienceYears: null, requiredSkillCount: 0 }), {})
  assert.deepEqual(sanitizeFilters({ minExperienceYears: "3", minSkillCoverage: 150 }), { minExperienceYears: 3 })
})
