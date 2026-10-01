import assert from "node:assert/strict"
import { describe, it } from "node:test"
import {
  buildAiPromptPayload,
  CandidateProfileBundle,
  computeDeterministicMatch,
  JobRequirementBundle,
} from "./deterministic"

const sampleJob: JobRequirementBundle = {
  id: "1",
  title: "Frontend Engineer",
  company: "Tech Corp",
  skills: [
    { skillName: "REACT", priority: "REQUIRED" },
    { skillName: "TYPESCRIPT", priority: "REQUIRED" },
    { skillName: "TAILWIND", priority: "PREFERRED" },
  ],
  educationRequirements: [
    { educationLevel: "Bachelor's Degree", field: "Computer Science" },
  ],
}

const sampleCandidate: CandidateProfileBundle = {
  id: "100",
  firstname: "Jane",
  lastname: "Doe",
  email: "jane@example.com",
  skills: [
    { skillName: "REACT", level: 4, lastAssessmentId: BigInt(10) },
    { skillName: "TYPESCRIPT", level: 3, lastAssessmentId: BigInt(11) },
  ],
  educations: [
    { degreeTitle: "BS Computer Science", levelName: "Bachelor's Degree", institute: "MIT" },
  ],
  experiences: [
    { jobTitle: "Software Developer", company: "Dev Inc", startDate: "2021", isCurrent: true },
  ],
  assessmentPercentageMap: new Map([
    ["10", 90],
    ["11", 80],
  ]),
}

describe("computeDeterministicMatch", () => {
  it("matches normalized skill names correctly", () => {
    const match = computeDeterministicMatch(sampleJob, sampleCandidate)
    assert.deepEqual(match.matchedRequiredSkills, ["REACT", "TYPESCRIPT"])
    assert.deepEqual(match.missingRequiredSkills, [])
    assert.deepEqual(match.matchedPreferredSkills, [])
    assert.deepEqual(match.missingPreferredSkills, ["TAILWIND"])
    assert.equal(match.requiredSkillCoverage, 1.0)
    assert.equal(match.preferredSkillCoverage, 0)
  })

  it("resolves skill aliases correctly (e.g. React.js <-> REACT, NodeJS <-> NODE.JS, K8s <-> KUBERNETES)", () => {
    const aliasJob: JobRequirementBundle = {
      id: "2",
      title: "Backend Engineer",
      company: "Tech Corp",
      skills: [
        { skillName: "Node.js", priority: "REQUIRED" },
        { skillName: "Postgres", priority: "REQUIRED" },
        { skillName: "Kubernetes", priority: "PREFERRED" },
      ],
      educationRequirements: [],
    }
    const aliasCandidate: CandidateProfileBundle = {
      id: "101",
      firstname: "Bob",
      lastname: "Smith",
      email: "bob@example.com",
      skills: [
        { skillName: "NodeJS", level: 3 },
        { skillName: "PostgreSQL", level: 4 },
        { skillName: "K8s", level: 2 },
      ],
      educations: [],
      experiences: [],
    }
    const match = computeDeterministicMatch(aliasJob, aliasCandidate)
    assert.deepEqual(match.matchedRequiredSkills, ["Node.js", "Postgres"])
    assert.deepEqual(match.missingRequiredSkills, [])
    assert.deepEqual(match.matchedPreferredSkills, ["Kubernetes"])
    assert.deepEqual(match.missingPreferredSkills, [])
    assert.equal(match.requiredSkillCoverage, 1.0)
    assert.equal(match.preferredSkillCoverage, 1.0)
  })

  it("infers skills from candidate work experience and bio when explicit skills tags are missing", () => {
    const candidateWithoutSkills: CandidateProfileBundle = {
      id: "102",
      firstname: "Alice",
      lastname: "Walker",
      email: "alice@example.com",
      skills: [], // No explicit skills in profile
      educations: [
        { degreeTitle: "BS Computer Science", institute: "Stanford" },
      ],
      experiences: [
        {
          jobTitle: "Senior React & TypeScript Developer",
          company: "Acme Inc",
          startDate: "2020",
          isCurrent: true,
        },
      ],
      profileDetail: {
        bio: "Specializing in React, TypeScript, and modern Tailwind CSS UI development.",
      },
    }
    const match = computeDeterministicMatch(sampleJob, candidateWithoutSkills)
    assert.deepEqual(match.matchedRequiredSkills, ["REACT", "TYPESCRIPT"])
    assert.deepEqual(match.missingRequiredSkills, [])
    assert.deepEqual(match.matchedPreferredSkills, ["TAILWIND"])
    assert.deepEqual(match.missingPreferredSkills, [])
    assert.equal(match.requiredSkillCoverage, 1.0)
    assert.equal(match.preferredSkillCoverage, 1.0)
  })

  it("defaults coverage to 1.0 when requirement set is empty", () => {
    const emptySkillsJob: JobRequirementBundle = {
      ...sampleJob,
      skills: [],
    }
    const match = computeDeterministicMatch(emptySkillsJob, sampleCandidate)
    assert.equal(match.requiredSkillCoverage, 1.0)
    assert.equal(match.preferredSkillCoverage, 1.0)
  })

  it("calculates assessment average percentage across relevant job skills", () => {
    const match = computeDeterministicMatch(sampleJob, sampleCandidate)
    assert.equal(match.assessmentAggregate.averagePercentage, 85)
    assert.equal(match.assessmentAggregate.assessedSkillCount, 2)
  })
})

describe("buildAiPromptPayload", () => {
  it("formats prompt payload and replaces missing optional fields with 'Not Provided'", () => {
    const match = computeDeterministicMatch(sampleJob, sampleCandidate)
    const payload = buildAiPromptPayload(sampleJob, match, sampleCandidate)

    assert.equal(payload.job.title, "Frontend Engineer")
    assert.equal(payload.candidate.name, "Jane Doe")
    assert.equal(payload.candidate.bio, "Not Provided")
    assert.equal(payload.candidate.certifications, "Not Provided")
    assert.equal(payload.deterministic.requiredSkillCoveragePercent, 100)
    assert.equal(payload.deterministic.assessmentAverageScore, "85%")
  })
})
