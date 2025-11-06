import { handlers } from "@/lib/auth"

export const { GET, POST } = handlers

// Explicitly set Node.js runtime for NextAuth route handler
// This ensures bcryptjs and other Node.js APIs work correctly
export const runtime = 'nodejs'

