export const SKILL_NAME_MIN_LENGTH = 2
export const SKILL_NAME_MAX_LENGTH = 100
export const SKILL_NAME_PATTERN = /^[A-Za-z0-9+#.\-_]+$/

export const SKILL_ERRORS = {
  EMPTY: "Skill name is required",
  TOO_SHORT: `Skill name must be at least ${SKILL_NAME_MIN_LENGTH} characters`,
  TOO_LONG: `Skill name must be at most ${SKILL_NAME_MAX_LENGTH} characters`,
  HAS_SPACES: "Skill name cannot contain spaces",
  INVALID_CHARS: "Skill name can only contain letters, numbers, and + # . - _",
  DUPLICATE: "Skill already exists",
} as const

export type SkillValidationResult =
  | { valid: true; normalized: string }
  | { valid: false; error: string }

export function containsWhitespace(value: string): boolean {
  return /\s/.test(value)
}

/** Trim, strip all whitespace, uppercase. */
export function normalizeSkillName(raw: string): string {
  return raw.trim().replace(/\s+/g, "").toUpperCase()
}

/**
 * Common skill aliases mapping normalized raw keys to canonical skill names.
 * Keys are uppercase alphanumeric only (no dots, dashes, or spaces).
 */
export const CANONICAL_SKILL_ALIASES: Record<string, string> = {
  // JavaScript / TypeScript ecosystem
  JS: "JAVASCRIPT",
  JAVASCRIPT: "JAVASCRIPT",
  TS: "TYPESCRIPT",
  TYPESCRIPT: "TYPESCRIPT",
  REACT: "REACT",
  REACTJS: "REACT",
  NODE: "NODE.JS",
  NODEJS: "NODE.JS",
  NEXT: "NEXT.JS",
  NEXTJS: "NEXT.JS",
  VUE: "VUE.JS",
  VUEJS: "VUE.JS",
  VUE2: "VUE.JS",
  VUE3: "VUE.JS",
  ANGULAR: "ANGULAR",
  ANGULARJS: "ANGULAR",
  EXPRESS: "EXPRESS.JS",
  EXPRESSJS: "EXPRESS.JS",
  NEST: "NEST.JS",
  NESTJS: "NEST.JS",
  REDUX: "REDUX",
  REDUXTOOLKIT: "REDUX",
  TAILWIND: "TAILWINDCSS",
  TAILWINDCSS: "TAILWINDCSS",
  HTML: "HTML5",
  HTML5: "HTML5",
  CSS: "CSS3",
  CSS3: "CSS3",
  SASS: "SASS",
  SCSS: "SASS",

  // Python & Data Science
  PY: "PYTHON",
  PYTHON: "PYTHON",
  PYTHON3: "PYTHON",
  FASTAPI: "FASTAPI",
  DJANGO: "DJANGO",
  FLASK: "FLASK",
  PYTORCH: "PYTORCH",
  TORCH: "PYTORCH",
  TENSORFLOW: "TENSORFLOW",
  TF: "TENSORFLOW",
  KERAS: "KERAS",
  PANDAS: "PANDAS",
  NUMPY: "NUMPY",
  SCIKITLEARN: "SCIKIT-LEARN",
  SKLEARN: "SCIKIT-LEARN",

  // Backend / Systems / Other Languages
  JAVA: "JAVA",
  SPRING: "SPRING BOOT",
  SPRINGBOOT: "SPRING BOOT",
  GO: "GOLANG",
  GOLANG: "GOLANG",
  RUST: "RUST",
  RUSTLANG: "RUST",
  CPP: "C++",
  CSHARP: "C#",
  PHP: "PHP",
  LARAVEL: "LARAVEL",
  RUBY: "RUBY",
  RAILS: "RUBY ON RAILS",
  RUBYONRAILS: "RUBY ON RAILS",
  DOTNET: ".NET",
  ASPNET: ".NET",
  NETCORE: ".NET",

  // Databases & Storage
  SQL: "SQL",
  PSQL: "POSTGRESQL",
  POSTGRES: "POSTGRESQL",
  POSTGRESQL: "POSTGRESQL",
  MYSQL: "MYSQL",
  MONGO: "MONGODB",
  MONGODB: "MONGODB",
  REDIS: "REDIS",
  SQLITE: "SQLITE",
  ELASTICSEARCH: "ELASTICSEARCH",
  PRISMA: "PRISMA",
  TYPEORM: "TYPEORM",
  SEQUELIZE: "SEQUELIZE",

  // DevOps & Cloud
  DOCKER: "DOCKER",
  K8S: "KUBERNETES",
  KUBERNETES: "KUBERNETES",
  AWS: "AWS",
  AMAZONWEBSERVICES: "AWS",
  GCP: "GCP",
  GOOGLECLOUD: "GCP",
  AZURE: "AZURE",
  MICROSOFTAZURE: "AZURE",
  TERRAFORM: "TERRAFORM",
  ANSIBLE: "ANSIBLE",
  JENKINS: "JENKINS",
  GITHUB: "GIT",
  GITLAB: "GIT",
  GIT: "GIT",
  CI: "CI/CD",
  CICD: "CI/CD",

  // Architecture & Protocols
  REST: "REST API",
  RESTFUL: "REST API",
  RESTAPI: "REST API",
  RESTFULAPI: "REST API",
  GRAPHQL: "GRAPHQL",
  GQL: "GRAPHQL",
  GRPC: "GRPC",
  WEBSOCKET: "WEBSOCKETS",
  WEBSOCKETS: "WEBSOCKETS",
  KAFKA: "APACHE KAFKA",
  RABBITMQ: "RABBITMQ",
  MICROSERVICES: "MICROSERVICES",
}

/**
 * Returns canonical standardized skill name for reliable alias resolution.
 */
export function getCanonicalSkill(raw: string): string {
  if (!raw || !raw.trim()) return ""
  // Strip all non-alphanumeric chars except + and #
  const key = raw.trim().toUpperCase().replace(/[^A-Z0-9+#]/g, "")
  if (CANONICAL_SKILL_ALIASES[key]) {
    return CANONICAL_SKILL_ALIASES[key]
  }
  return normalizeSkillName(raw)
}

export function isValidSkillName(normalized: string): boolean {
  if (!normalized) return false
  if (
    normalized.length < SKILL_NAME_MIN_LENGTH ||
    normalized.length > SKILL_NAME_MAX_LENGTH
  ) {
    return false
  }
  return SKILL_NAME_PATTERN.test(normalized)
}

export function validateAndNormalizeSkillName(raw: string): SkillValidationResult {
  const trimmed = raw.trim()

  if (!trimmed) {
    return { valid: false, error: SKILL_ERRORS.EMPTY }
  }

  if (containsWhitespace(trimmed)) {
    return { valid: false, error: SKILL_ERRORS.HAS_SPACES }
  }

  const normalized = normalizeSkillName(trimmed)

  if (normalized.length < SKILL_NAME_MIN_LENGTH) {
    return { valid: false, error: SKILL_ERRORS.TOO_SHORT }
  }

  if (normalized.length > SKILL_NAME_MAX_LENGTH) {
    return { valid: false, error: SKILL_ERRORS.TOO_LONG }
  }

  if (!SKILL_NAME_PATTERN.test(normalized)) {
    return { valid: false, error: SKILL_ERRORS.INVALID_CHARS }
  }

  return { valid: true, normalized }
}

/** Strip spaces as the user types in skill inputs. */
export function sanitizeSkillInput(raw: string): string {
  return raw.replace(/\s+/g, "")
}

export function dedupeSkillNames(names: string[]): string[] {
  const seen = new Set<string>()
  const result: string[] = []

  for (const name of names) {
    const normalized = normalizeSkillName(name)
    if (normalized && !seen.has(normalized)) {
      seen.add(normalized)
      result.push(normalized)
    }
  }

  return result
}

export type ParseSkillNamesResult =
  | { valid: true; normalized: string[] }
  | { valid: false; error: string }

export function parseAndValidateSkillNames(
  rawNames: string[],
): ParseSkillNamesResult {
  const normalized: string[] = []
  const seen = new Set<string>()

  for (const raw of rawNames) {
    const result = validateAndNormalizeSkillName(raw)
    if (!result.valid) {
      return result
    }
    if (seen.has(result.normalized)) {
      return { valid: false, error: SKILL_ERRORS.DUPLICATE }
    }
    seen.add(result.normalized)
    normalized.push(result.normalized)
  }

  return { valid: true, normalized }
}

export function addSkillToList(
  currentSkills: string[],
  rawInput: string,
): { skills: string[]; error?: string; added?: string } {
  const result = validateAndNormalizeSkillName(rawInput)
  if (!result.valid) {
    return { skills: currentSkills, error: result.error }
  }

  const alreadyExists = currentSkills.some(
    (skill) => normalizeSkillName(skill) === result.normalized,
  )

  if (alreadyExists) {
    return { skills: currentSkills, error: SKILL_ERRORS.DUPLICATE }
  }

  return {
    skills: [...currentSkills, result.normalized],
    added: result.normalized,
  }
}

export function hasDuplicateSkillNames(names: string[]): boolean {
  const seen = new Set<string>()
  for (const name of names) {
    const normalized = normalizeSkillName(name)
    if (!normalized) continue
    if (seen.has(normalized)) return true
    seen.add(normalized)
  }
  return false
}
