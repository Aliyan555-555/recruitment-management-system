export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return

  const { validateEnv, formatEnvProblems } = await import("@/lib/env")
  const problems = validateEnv()
  if (problems.length > 0) {
    console.error(formatEnvProblems(problems))
  }
}
