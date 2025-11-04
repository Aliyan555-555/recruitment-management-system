import { z } from "zod"

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
})

export const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
})

export type RegisterInput = z.infer<typeof registerSchema>
export type LoginInput = z.infer<typeof loginSchema>

