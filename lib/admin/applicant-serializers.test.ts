import test from "node:test"
import assert from "node:assert/strict"
import { ageFromDob, experienceYears, parseLooseDate } from "./applicant-serializers"

test("parseLooseDate handles year-month and year", () => {
  assert.equal(parseLooseDate("2021-03")?.toISOString().slice(0, 7), "2021-03")
  assert.equal(parseLooseDate("2020")?.getUTCFullYear(), 2020)
  assert.equal(parseLooseDate("not a date"), null)
})

test("experienceYears sums roles and handles current role", () => {
  const now = new Date(Date.UTC(2026, 0, 1))
  assert.equal(
    experienceYears(
      [
        { startDate: "2020-01", endDate: "2022-01", isCurrent: false },
        { startDate: "2023-01", endDate: null, isCurrent: true },
      ],
      now
    ),
    5
  )
  assert.equal(experienceYears([{ startDate: null, endDate: null, isCurrent: false }], now), null)
})

test("ageFromDob", () => {
  const now = new Date(Date.UTC(2026, 9, 9))
  assert.equal(ageFromDob("2000-10-09", now), 26)
  assert.equal(ageFromDob("2000-10-10", now), 25)
  assert.equal(ageFromDob(null, now), null)
})
