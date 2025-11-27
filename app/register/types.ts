export type EducationEntry = {
  id: string
  educationLevelId: string
  degreeTitle: string
  institute: string
  majorSubject: string
  grade: string
  passingYear: string
}

export type ExperienceEntry = {
  id: string
  jobTitle: string
  company: string
  location: string
  startDate: string
  endDate: string
  isCurrent: boolean
}

export type SkillEntry = {
  id: string
  name: string
  level: number
}

export type PersonalInfoState = {
  title: string
  firstname: string
  lastname: string
  fatherName: string
  email: string
  username: string
  contactNumber: string
  alternateNumber: string
  religion: string
  nationality: string
  dateOfBirth: string
  cnic: string
  gender: string
  maritalStatus: string
  preferredCity: string
  homeAddress: string
  city: string
  postalCode: string
  institution: string
  department: string
}

export type JobPreferenceState = {
  firstPriority: string
  secondPriority: string
  thirdPriority: string
  summary: string
}

export type AgreementsState = {
  verification: boolean
  truth: boolean
  liability: boolean
}

export type FieldErrors = Record<string, string>

