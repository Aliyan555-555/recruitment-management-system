import { chromium } from "playwright"
// usage: node explore.mjs <role:admin|candidate|interviewer|none> <email> <password> <path...>
const [role, email, pw, ...paths] = process.argv.slice(2)
const BASE = "http://rms.localhost:3001"
const b = await chromium.connectOverCDP("http://127.0.0.1:9222")
const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } })
const page = await ctx.newPage()
if (role !== "none") {
  const login = role === "admin" ? "/admin/login" : role === "interviewer" ? "/interviewer/login" : "/login"
  await page.goto(BASE + login, { waitUntil: "domcontentloaded" })
  await page.waitForTimeout(2500)
  await page.locator("input[type=email], input[name=email]").first().fill(email)
  await page.locator("input[type=password]").first().fill(pw)
  await page.locator("button[type=submit]").first().click()
  await page.waitForURL((u) => !/login/.test(u.pathname), { timeout: 90000 }).catch(() => {})
  console.log("after login:", page.url())
}
for (const p of paths) {
  try {
    await page.goto(BASE + p, { waitUntil: "domcontentloaded", timeout: 120000 })
  } catch (e) {
    console.log("GOTO ERR", e.message.split("\n")[0])
  }
  await page.waitForTimeout(3500)
  console.log("\n=== ", page.url())
  const info = await page.evaluate(() => ({
    h: [...document.querySelectorAll("h1,h2,h3")].map((e) => e.innerText.trim()).slice(0, 15),
    btn: [...document.querySelectorAll("button,a")].map((e) => (e.innerText || e.getAttribute("aria-label") || "").trim().replace(/\s+/g, " ") + (e.getAttribute("href") ? " -> " + e.getAttribute("href") : "")).filter((t) => t.length > 1 && t.length < 90).slice(0, 70),
    inputs: [...document.querySelectorAll("input,textarea,select")].map((e) => `${e.tagName}:${e.type || ""}:${e.name || e.id || e.placeholder}`).slice(0, 25),
  }))
  console.log(JSON.stringify(info))
}
await ctx.close()
await b.close()
