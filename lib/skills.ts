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
