/**
 * Boot-time environment validation. Returns problems instead of throwing so
 * callers decide how loud to be (instrumentation.ts logs one clear block).
 */

const REQUIRED_VARS: Array<{ key: string; hint: string }> = [
  {
    key: "DATABASE_URL",
    hint: "Postgres connection string used by the app. Check it is not commented out (# ...) in .env.",
  },
  {
    key: "DIRECT_URL",
    hint: "Direct Postgres connection used by Prisma migrations.",
  },
  {
    key: "NEXTAUTH_SECRET",
    hint: "Random secret for signing sessions. Generate one with: openssl rand -base64 32",
  },
  {
    key: "NEXTAUTH_URL",
    hint: "Public base URL of this app, e.g. http://localhost:3001. Used for sign-out redirects and email links.",
  },
]

export type EnvProblem = { key: string; message: string }

export function validateEnv(env: NodeJS.ProcessEnv = process.env): EnvProblem[] {
  const problems: EnvProblem[] = []

  for (const { key, hint } of REQUIRED_VARS) {
    const value = env[key]
    if (!value || !value.trim()) {
      problems.push({ key, message: `${key} is not set. ${hint}` })
    }
  }

  const dbUrl = env.DATABASE_URL
  if (dbUrl && !/^postgres(ql)?:\/\//.test(dbUrl.trim())) {
    problems.push({
      key: "DATABASE_URL",
      message: "DATABASE_URL must start with postgresql:// or postgres://.",
    })
  }

  return problems
}

export function formatEnvProblems(problems: EnvProblem[]): string {
  const lines = problems.map((p) => `  - ${p.message}`)
  return [
    "",
    "================ ENVIRONMENT CONFIGURATION ERROR ================",
    "The app cannot work correctly until these are fixed in .env:",
    ...lines,
    "See .env.example for the full list of variables.",
    "================================================================",
    "",
  ].join("\n")
}
