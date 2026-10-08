import { z } from "zod"
import {
  SKILL_ERRORS,
  validateAndNormalizeSkillName,
} from "@/lib/skills"

const educationEntrySchema = z.object({
  educationLevelId: z.string().min(1, "Education level is required"),
  degreeTitle: z.string().min(2, "Degree title must be at least 2 characters"),
  institute: z.string().min(2, "Institute name is required"),
  instituteId: z.string().optional(),
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

const skillNameFieldSchema = z
  .string()
  .superRefine((value, ctx) => {
    const result = validateAndNormalizeSkillName(value)
    if (!result.valid) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: result.error,
      })
    }
  })
  .transform((value) => {
    const result = validateAndNormalizeSkillName(value)
    return result.valid ? result.normalized : value
  })

const skillEntrySchema = z.object({
  name: skillNameFieldSchema,
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
  dateOfBirth: z
    .string({ required_error: "Date of birth is required" })
    .min(1, "Date of birth is required")
    .refine((v) => !Number.isNaN(new Date(v).getTime()), "Enter a valid date of birth")
    .refine((v) => {
      const d = new Date(v)
      const t = new Date()
      return d <= new Date(t.getFullYear() - 18, t.getMonth(), t.getDate())
    }, "You must be at least 18 years old"),
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
  profile: profileDetailSchema,
  educationHistory: z.array(educationEntrySchema).optional(),
  experiences: z.array(experienceEntrySchema).optional(),
  skillsInput: z
    .array(skillEntrySchema)
    .optional()
    .superRefine((skills, ctx) => {
      if (!skills?.length) return

      const seen = new Set<string>()
      for (let index = 0; index < skills.length; index += 1) {
        const name = skills[index]?.name
        if (!name) continue
        if (seen.has(name)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: SKILL_ERRORS.DUPLICATE,
            path: [index, "name"],
          })
        }
        seen.add(name)
      }
    }),
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

export const startSkillAssessmentSchema = z.object({
  userSkillId: z.string().min(1, "User skill ID is required"),
})

export const submitSkillAssessmentSchema = z.object({
  answers: z
    .array(
      z.object({
        questionId: z.string().min(1, "Question ID is required"),
        selectedOption: z.string().min(1, "Selected option is required"),
      })
    )
    .min(1, "At least one answer is required"),
})

export type StartSkillAssessmentInput = z.infer<typeof startSkillAssessmentSchema>
export type SubmitSkillAssessmentInput = z.infer<typeof submitSkillAssessmentSchema>

