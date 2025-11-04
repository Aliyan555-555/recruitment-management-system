import { auth } from "@/lib/auth"

export type UserRole = "ADMIN" | "INTERVIEWER" | "CANDIDATE"

/**
 * Require a specific role(s) for the current user
 */
export async function requireRole(allowedRoles: UserRole[]): Promise<{ id: string; role: string } | null> {
  const session = await auth()
  
  if (!session || !session.user) {
    return null
  }

  const userRole = session.user.role as UserRole

  if (!allowedRoles.includes(userRole)) {
    return null
  }

  return {
    id: session.user.id as string,
    role: userRole
  }
}

/**
 * Check if user has admin role
 */
export async function requireAdmin() {
  return requireRole(["ADMIN"])
}

/**
 * Check if user has interviewer role
 */
export async function requireInterviewer() {
  return requireRole(["INTERVIEWER"])
}

/**
 * Check if user has candidate role
 */
export async function requireCandidate() {
  return requireRole(["CANDIDATE"])
}

/**
 * Check if user has admin or interviewer role
 */
export async function requireStaff() {
  return requireRole(["ADMIN", "INTERVIEWER"])
}

/**
 * Get current user's role
 */
export async function getCurrentUserRole(): Promise<UserRole | null> {
  const session = await auth()
  
  if (!session || !session.user) {
    return null
  }

  return session.user.role as UserRole
}

/**
 * Check if user can access a resource
 */
export function hasPermission(userRole: UserRole, requiredRole: UserRole[]): boolean {
  return requiredRole.includes(userRole)
}

/**
 * Check if user is admin
 */
export function isAdmin(userRole: UserRole): boolean {
  return userRole === "ADMIN"
}

/**
 * Check if user is interviewer
 */
export function isInterviewer(userRole: UserRole): boolean {
  return userRole === "INTERVIEWER"
}

/**
 * Check if user is candidate
 */
export function isCandidate(userRole: UserRole): boolean {
  return userRole === "CANDIDATE"
}

