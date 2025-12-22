import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
})

// Validate required environment variables
if (!process.env.NEXTAUTH_SECRET) {
  throw new Error("NEXTAUTH_SECRET environment variable is required")
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Credentials({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        try {
          const { email, password } = loginSchema.parse(credentials)

          const user = await prisma.user.findUnique({
            where: { email },
            select: {
              id: true,
              email: true,
              username: true,
              password: true,
              firstname: true,
              lastname: true,
              role: true,
              avatar: true,
              lastLogin: true,
              userStatus: true,
              suspended: true,
              deletedAt: true,
            }
          })

          if (!user || user.deletedAt || user.suspended) {
            return null
          }

          // Dynamic import to avoid bundling bcryptjs for Edge Runtime
          const { compare } = await import("bcryptjs")
          const isPasswordValid = await compare(password, user.password)

          if (!isPasswordValid) {
            return null
          }

          // Update login timestamps
          const currentTime = BigInt(Math.floor(Date.now() / 1000))
          await prisma.user.update({
            where: { id: user.id },
            data: {
              lastLogin: user.lastLogin,
              currentLogin: currentTime,
              lastAccess: currentTime,
            }
          })

          return {
            id: user.id.toString(),
            email: user.email,
            name: `${user.firstname} ${user.lastname}`,
            username: user.username,
            role: user.role,
            avatar: (user as any).avatar || undefined,
          }
        } catch (error) {
          console.error("Authentication error:", error)
          return null
        }
      }
    })
  ],
  pages: {
    signIn: '/login',
    error: '/login',
  },
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.id = user.id as string
        token.username = (user as any).username
        token.role = (user as any).role
        token.avatar = (user as any).avatar
      }
      // Update session if requested (e.g., when profile is updated)
      if (trigger === "update" && session?.user) {
        token.avatar = session.user.avatar
      }
      return token
    },
    async session({ session, token }) {
      if (session.user && token) {
        session.user.id = token.id as string
        session.user.username = token.username as string
        session.user.role = token.role as string
        session.user.avatar = token.avatar as string | undefined
      }
      return session
    }
  },
  secret: process.env.NEXTAUTH_SECRET,
  trustHost: true, // Required for Vercel and other serverless platforms
  basePath: "/api/auth", // Explicitly set the base path
})

