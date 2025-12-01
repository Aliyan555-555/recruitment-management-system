import { z } from "zod"

const educationEntrySchema = z.object({
  educationLevelId: z.string().min(1, "Education level is required"),
  degreeTitle: z.string().min(2, "Degree title must be at least 2 characters"),
  institute: z.string().min(2, "Institute name is required"),
  majorSubject: z.string().optional(),
  grade: z.string().optional(),
  passingYear: z.string().optional(),
  country: z.string().optional(),
})

const experienceEntrySchema = z.object({
  jobTitle: z.string().min(2, "Job title must be at least 2 characters"),
  company: z.string().optional(),
  location: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  isCurrent: z.boolean().optional(),
})

const skillEntrySchema = z.object({
  name: z.string().min(2, "Skill name must be at least 2 characters"),
  level: z.number().min(1).max(10),
})

const jobPreferenceSchema = z.object({
  firstPriority: z.string().optional(),
  secondPriority: z.string().optional(),
  thirdPriority: z.string().optional(),
  summary: z.string().optional(),
})

const profileDetailSchema = z.object({
  title: z.string().optional(),
  fatherName: z.string().optional(),
  religion: z.string().optional(),
  nationality: z.string().optional(),
  dateOfBirth: z.string().optional(),
  cnic: z.string().optional(),
  gender: z.string().optional(),
  maritalStatus: z.string().optional(),
  preferredCity: z.string().optional(),
  postalCode: z.string().optional(),
  disclaimersAgreed: z.boolean().optional(),
})

export const registerSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters").max(100),
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  firstname: z.string().min(2, "First name must be at least 2 characters").max(100),
  lastname: z.string().min(2, "Last name must be at least 2 characters").max(100),
  phone1: z.string().optional(),
  phone2: z.string().optional(),
  institution: z.string().optional(),
  department: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  country: z.string().length(2).optional(),
  profile: profileDetailSchema.optional(),
  educationHistory: z.array(educationEntrySchema).optional(),
  experiences: z.array(experienceEntrySchema).optional(),
  skillsInput: z.array(skillEntrySchema).optional(),
  jobPreference: jobPreferenceSchema.optional(),
})

export const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
})

export const forgotPasswordSchema = z.object({
  email: z.string().email("Invalid email address"),
})

export const resetPasswordSchema = z.object({
  token: z.string().min(1, "Token is required"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  confirmPassword: z.string().min(8, "Password confirmation is required"),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
})

export const validateResetTokenSchema = z.object({
  token: z.string().min(1, "Token is required"),
})

export type RegisterInput = z.infer<typeof registerSchema>
export type LoginInput = z.infer<typeof loginSchema>
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>
export type ValidateResetTokenInput = z.infer<typeof validateResetTokenSchema>

