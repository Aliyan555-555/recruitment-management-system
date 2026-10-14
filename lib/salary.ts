export function parseSalary(salaryStr?: string | null): { minSalary: string; maxSalary: string } {
  if (!salaryStr) return { minSalary: "", maxSalary: "" }
  if (/\b(up to|max|upto)\b/i.test(salaryStr)) {
    const digits = salaryStr.replace(/\D/g, "")
    return { minSalary: "", maxSalary: digits }
  }
  const parts = salaryStr.split("-").map((p) => p.replace(/\D/g, "")).filter(Boolean)
  if (parts.length >= 2) {
    return { minSalary: parts[0] || "", maxSalary: parts[1] || "" }
  } else if (parts.length === 1) {
    return { minSalary: parts[0] || "", maxSalary: "" }
  }
  return { minSalary: "", maxSalary: "" }
}

export function validateSalaryRange(min: string, max: string): { minSalary?: string; maxSalary?: string } {
  const errs: { minSalary?: string; maxSalary?: string } = {}
  if (min && !/^\d+$/.test(min.trim())) {
    errs.minSalary = "Please enter numbers only"
  }
  if (max && !/^\d+$/.test(max.trim())) {
    errs.maxSalary = "Please enter numbers only"
  }
  if (!errs.minSalary && !errs.maxSalary && min && max) {
    const minNum = Number(min)
    const maxNum = Number(max)
    if (maxNum < minNum) {
      errs.maxSalary = "Maximum salary cannot be less than minimum salary"
    }
  }
  return errs
}

export function buildSalaryString(min: string, max: string): string | undefined {
  const minClean = min ? min.trim() : ""
  const maxClean = max ? max.trim() : ""
  if (!minClean && !maxClean) return undefined

  if (minClean && maxClean) {
    if (minClean === maxClean) {
      return `PKR ${Number(minClean).toLocaleString()}`
    }
    return `PKR ${Number(minClean).toLocaleString()} - ${Number(maxClean).toLocaleString()}`
  } else if (minClean) {
    return `PKR ${Number(minClean).toLocaleString()}`
  } else {
    return `Up to PKR ${Number(maxClean).toLocaleString()}`
  }
}

export function formatSalaryDisplay(salary?: string | null): string {
  if (!salary) return ""
  return salary.replace(/\$/g, "PKR ")
}
