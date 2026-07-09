import { EducationEntry, ExperienceEntry, SkillEntry } from "./types"

const createId = () => Math.random().toString(36).slice(2, 11)

export const createEducationEntry = (): EducationEntry => ({
  id: createId(),
  educationLevelId: "",
  degreeTitle: "",
  institute: "",
  majorSubject: "",
  grade: "",
  passingYear: "",
})

export const createExperienceEntry = (): ExperienceEntry => ({
  id: createId(),
  jobTitle: "",
  company: "",
  location: "",
  startDate: "",
  endDate: "",
  isCurrent: false,
})

export const createSkillEntry = (): SkillEntry => ({
  id: createId(),
  name: "",
})

export const isExperienceStarted = (entry: ExperienceEntry) =>
  entry.jobTitle.trim() ||
  entry.company.trim() ||
  entry.location.trim() ||
  entry.startDate ||
  entry.endDate ||
  entry.isCurrent

export const isEducationEntryStarted = (entry: EducationEntry) =>
  entry.educationLevelId ||
  entry.degreeTitle.trim() ||
  entry.institute.trim() ||
  entry.majorSubject.trim() ||
  entry.passingYear

export const formatPakPhone = (value: string) => {
  const digitsOnly = value.replace(/\D/g, "").slice(0, 11)
  if (!digitsOnly) return ""
  if (digitsOnly.length <= 4) {
    return digitsOnly
  }
  return `${digitsOnly.slice(0, 4)}-${digitsOnly.slice(4)}`
}

export const formatCnic = (value: string) => {
  const digitsOnly = value.replace(/\D/g, "").slice(0, 13)
  if (!digitsOnly) return ""
  if (digitsOnly.length <= 5) {
    return digitsOnly
  }
  if (digitsOnly.length <= 12) {
    return `${digitsOnly.slice(0, 5)}-${digitsOnly.slice(5)}`
  }
  return `${digitsOnly.slice(0, 5)}-${digitsOnly.slice(5, 12)}-${digitsOnly.slice(12)}`
}

export const formatPostalCode = (value: string) => value.replace(/\D/g, "").slice(0, 5)

